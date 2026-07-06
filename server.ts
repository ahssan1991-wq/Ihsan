import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Persistent JSON file database helper
const DB_FILE = path.join(process.cwd(), "firestore_db.json");

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      initialized: false,
      materials: [],
      equipment: [],
      blacklist: [],
      feedback: [],
      decisions: [],
      activities: []
    };
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (data && data.initialized === undefined) {
      data.initialized = true;
    }
    return data;
  } catch (e) {
    console.error("Failed to read DB file, resetting:", e);
    return {
      initialized: false,
      materials: [],
      equipment: [],
      blacklist: [],
      feedback: [],
      decisions: [],
      activities: []
    };
  }
}

function writeDb(data: any) {
  try {
    data.initialized = true;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write DB file:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 image/file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Document file storage uploads directory
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Serve uploads folder as static files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --- DATABASE SYNC ENDPOINTS ---
  app.get("/api/db/load", (req, res) => {
    try {
      const db = readDb();
      res.json(db);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/db/sync/:collection", (req, res) => {
    try {
      const { collection } = req.params;
      const items = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Data must be an array" });
      }

      const db = readDb();
      if (collection in db || ["materials", "equipment", "blacklist", "feedback", "decisions", "activities"].includes(collection)) {
        db[collection] = items;
        writeDb(db);
        res.json({ success: true, count: items.length });
      } else {
        res.status(400).json({ error: `Unknown collection: ${collection}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/db/upload-document", (req, res) => {
    try {
      const { fileName, fileContentBase64 } = req.body;
      if (!fileName || !fileContentBase64) {
        return res.status(400).json({ error: "fileName and fileContentBase64 are required" });
      }
      const buffer = Buffer.from(fileContentBase64, "base64");
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, buffer);
      res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize Gemini API client on the server
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for Scan Nameplate
  app.post("/api/gemini/scan-nameplate", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      // Check if GEMINI_API_KEY is defined
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }

      // Remove prefix like "data:image/png;base64," if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg", // default to jpeg
          data: base64Data,
        }
      };

      const promptPart = {
        text: `Analyze the provided industrial machine or equipment nameplate image. Extract technical specifications and return them in a strict JSON format.
Each field must be an object containing a 'value' (the extracted string value, or null if not found or not visible) and a 'confidence' (an integer from 0 to 100 indicating your confidence in the extraction).
If a specific field does not exist or is not readable, set 'value' to null and 'confidence' to 0.

Required fields to analyze:
1. manufacturer: Manufacturing company (e.g., "Rosemount", "Siemens", "Yokogawa")
2. brand: Brand name if distinct from manufacturer (e.g., "Emerson", "SITRANS")
3. model: Model name or number (e.g., "3051S", "SITRANS P320")
4. partNumber: Exact part number or product code (e.g., "3051S2TG4A2B11A1AB4")
5. serialNumber: Serial number (e.g., "SN-5432109" or "987654")
6. voltage: Electrical voltage rating/specs (e.g., "24 VDC", "110-220 VAC")
7. current: Electrical current rating/specs (e.g., "4-20 mA", "1.5 A")
8. power: Power consumption/rating (e.g., "1.2 W", "5 VA", "0.37 kW")
9. output: Output signaling/protocols (e.g., "HART", "Modbus", "Profibus", "4-20mA")
10. input: Input range or parameters if visible (e.g., "0-10 bar", "4-20 mA")
11. frequency: Frequency (e.g., "50 Hz", "60 Hz", "50/60 Hz")
12. revision: Revision or version code (e.g., "Rev 1.2", "v2.0")
13. manufactureDate: Manufacture date (e.g., "2024-05", "11/2021", "2018")
14. countryOfOrigin: Country of origin if indicated (e.g., "Germany", "Made in USA")
15. certificationMarks: Certification markings (e.g., "ATEX", "CE", "FM", "Ex d IIC T6")
16. barcode: Barcode value or digits if visible
17. qrCode: QR code payload or digits if visible`
      };

      const fieldSchema = {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.INTEGER }
        },
        required: ["confidence"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              manufacturer: fieldSchema,
              brand: fieldSchema,
              model: fieldSchema,
              partNumber: fieldSchema,
              serialNumber: fieldSchema,
              voltage: fieldSchema,
              current: fieldSchema,
              power: fieldSchema,
              output: fieldSchema,
              input: fieldSchema,
              frequency: fieldSchema,
              revision: fieldSchema,
              manufactureDate: fieldSchema,
              countryOfOrigin: fieldSchema,
              certificationMarks: fieldSchema,
              barcode: fieldSchema,
              qrCode: fieldSchema,
            },
            required: [
              "manufacturer", "brand", "model", "partNumber", "serialNumber", 
              "voltage", "current", "power", "output", "input", "frequency", 
              "revision", "manufactureDate", "countryOfOrigin", "certificationMarks", 
              "barcode", "qrCode"
            ],
          }
        }
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("Empty response from Gemini model");
      }

      const parsedData = JSON.parse(extractedText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Scan nameplate error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Ask AI Engineering Assistant Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, systemInstruction } = req.body;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      // Check if GEMINI_API_KEY is defined
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }

      // Map client history to Gemini Content structure
      const contents = (history || []).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      // Append latest user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction || "You are a professional engineering assistant.",
          temperature: 0.2, // lower temperature for precision
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Compare Datasheets
  app.post("/api/gemini/compare-datasheets", async (req, res) => {
    try {
      const { file1Name, file1Base64, file1Type, file2Name, file2Base64, file2Type } = req.body;
      if (!file1Base64 || !file2Base64) {
        return res.status(400).json({ error: "Both files are required for comparison." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const file1Clean = file1Base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");
      const file2Clean = file2Base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: file1Type || "application/pdf",
              data: file1Clean
            }
          },
          {
            inlineData: {
              mimeType: file2Type || "application/pdf",
              data: file2Clean
            }
          },
          {
            text: `Compare these two industrial component datasheets (File 1: ${file1Name || "Datasheet 1"} and File 2: ${file2Name || "Datasheet 2"}).
Analyze the following parameters in detail:
1. Electrical specifications (voltage, current, load, etc.)
2. Mechanical dimensions (mounting, outer dimensions, weight, thread sizes, etc.)
3. Environmental ratings (IP rating, temperature range, humidity, hazardous area certs, etc.)
4. Certifications (ATEX, CE, IECEx, FM, etc.)
5. Pin configuration (pinouts, terminals, wiring diagram differences)
6. Input/Output signals (4-20mA, HART, Modbus, Profibus, dry contacts, pulse, etc.)
7. Power requirements (AC/DC range, power consumption, loop powered vs line powered)

Provide the comparison result in strict JSON format matching the following schema:
{
  "compatibilityPercentage": number (integer 0-100),
  "summary": "Brief high-level summary of compatibility",
  "electricalDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "mechanicalDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "environmentalDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "certificationsDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "pinoutDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "ioDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "powerDiffs": "Highlighted differences or 'No differences' or 'Not specified'",
  "overallVerdict": "Detailed technical compatibility verdict and any critical cautions"
}
`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              compatibilityPercentage: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              electricalDiffs: { type: Type.STRING },
              mechanicalDiffs: { type: Type.STRING },
              environmentalDiffs: { type: Type.STRING },
              certificationsDiffs: { type: Type.STRING },
              pinoutDiffs: { type: Type.STRING },
              ioDiffs: { type: Type.STRING },
              powerDiffs: { type: Type.STRING },
              overallVerdict: { type: Type.STRING }
            },
            required: [
              "compatibilityPercentage", "summary", "electricalDiffs", "mechanicalDiffs",
              "environmentalDiffs", "certificationsDiffs", "pinoutDiffs", "ioDiffs",
              "powerDiffs", "overallVerdict"
            ]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Compare Datasheets API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Compare COC
  app.post("/api/gemini/compare-coc", async (req, res) => {
    try {
      const { file1Name, file1Base64, file1Type, file2Name, file2Base64, file2Type } = req.body;
      if (!file1Base64 || !file2Base64) {
        return res.status(400).json({ error: "Both COC documents are required for comparison." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const file1Clean = file1Base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");
      const file2Clean = file2Base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: file1Type || "application/pdf",
              data: file1Clean
            }
          },
          {
            inlineData: {
              mimeType: file2Type || "application/pdf",
              data: file2Clean
            }
          },
          {
            text: `Compare these two Certificate of Conformity (COC) documents (File 1: ${file1Name || "COC 1"} and File 2: ${file2Name || "COC 2"}).
We need to verify if they match or if there is any mismatched or missing critical data.
Extract and compare:
1. Manufacturer Name
2. Part Number / Model Number
3. Serial Number / Batch ID
4. Certificate Standards / Directives (e.g., ATEX, CE, ISO)
5. Issue Date and Expiration Date

Provide the comparison in strict JSON format matching the following schema:
{
  "manufacturer1": "File 1 Manufacturer",
  "manufacturer2": "File 2 Manufacturer",
  "manufacturerMatch": boolean,
  "partNumber1": "File 1 Part Number",
  "partNumber2": "File 2 Part Number",
  "partNumberMatch": boolean,
  "serialNumber1": "File 1 Serial/Batch",
  "serialNumber2": "File 2 Serial/Batch",
  "serialNumberMatch": boolean,
  "standards1": "File 1 Standards",
  "standards2": "File 2 Standards",
  "standardsMatch": boolean,
  "dates1": "File 1 Dates",
  "dates2": "File 2 Dates",
  "datesMatch": boolean,
  "missingInformation": "List of missing info",
  "mismatches": "Detail of mismatches",
  "complianceVerdict": "Detailed compliance assessment and expired alerts",
  "isCompliant": boolean
}
`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              manufacturer1: { type: Type.STRING },
              manufacturer2: { type: Type.STRING },
              manufacturerMatch: { type: Type.BOOLEAN },
              partNumber1: { type: Type.STRING },
              partNumber2: { type: Type.STRING },
              partNumberMatch: { type: Type.BOOLEAN },
              serialNumber1: { type: Type.STRING },
              serialNumber2: { type: Type.STRING },
              serialNumberMatch: { type: Type.BOOLEAN },
              standards1: { type: Type.STRING },
              standards2: { type: Type.STRING },
              standardsMatch: { type: Type.BOOLEAN },
              dates1: { type: Type.STRING },
              dates2: { type: Type.STRING },
              datesMatch: { type: Type.BOOLEAN },
              missingInformation: { type: Type.STRING },
              mismatches: { type: Type.STRING },
              complianceVerdict: { type: Type.STRING },
              isCompliant: { type: Type.BOOLEAN }
            },
            required: [
              "manufacturer1", "manufacturer2", "manufacturerMatch",
              "partNumber1", "partNumber2", "partNumberMatch",
              "serialNumber1", "serialNumber2", "serialNumberMatch",
              "standards1", "standards2", "standardsMatch",
              "dates1", "dates2", "datesMatch",
              "missingInformation", "mismatches", "complianceVerdict", "isCompliant"
            ]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Compare COC API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Engineering Knowledge Assistant
  app.post("/api/gemini/knowledge-assistant", async (req, res) => {
    try {
      const { material } = req.body;
      if (!material) {
        return res.status(400).json({ error: "Material information is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate an extensive, professional instrumentation engineering guide for the following material:
Manufacturer: ${material.manufacturer}
Model: ${material.model}
Part Number: ${material.partNumber}
Description: ${material.description}
Additional Specs: ${material.notes || ""} ${material.engineeringComments || ""}

Please write a detailed technical explanation covering:
1. Technical Explanation: How this specific device or component works from a physical/engineering perspective.
2. Typical Applications: Common industrial environments, plants, systems, or process loops where this component is deployed.
3. Common Failures: Typical mechanical, electrical, thermal, or signaling failures experienced in the field.
4. Troubleshooting Guide: Step-by-step diagnostic actions for field technicians to identify and isolate faults.
5. Installation Notes: Vital mounting, wiring, orientation, and safety/containment details for initial field installation.
6. Maintenance Recommendations: Routine calibration, inspection intervals, and preventative care checklists.
7. Safety Precautions: Critical hazard warnings, electrical hazards, pressure hazards, or toxic gas warnings when servicing this device.

Provide the response in strict JSON format matching the following schema:
{
  "explanation": "Detailed explanation of how it works",
  "applications": "List/details of industrial applications",
  "failures": "Common field failures and root causes",
  "troubleshooting": "Step-by-step troubleshooting instructions",
  "installation": "Best practices and notes for installation",
  "maintenance": "Recommended maintenance schedule and steps",
  "safety": "Vital safety protocols and hazard warnings"
}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              applications: { type: Type.STRING },
              failures: { type: Type.STRING },
              troubleshooting: { type: Type.STRING },
              installation: { type: Type.STRING },
              maintenance: { type: Type.STRING },
              safety: { type: Type.STRING }
            },
            required: ["explanation", "applications", "failures", "troubleshooting", "installation", "maintenance", "safety"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Knowledge Assistant API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Alternative Parts Finder
  app.post("/api/gemini/alternative-parts", async (req, res) => {
    try {
      const { material } = req.body;
      if (!material) {
        return res.status(400).json({ error: "Material information is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Identify exact equivalent or direct functional alternatives for the following industrial instrument/part:
Manufacturer: ${material.manufacturer}
Model: ${material.model}
Part Number: ${material.partNumber}
Description: ${material.description}

Provide a list of 2-3 standard industrial equivalent parts from other reputable OEMs (such as Rosemount, ABB, Siemens, Yokogawa, Endress+Hauser, etc.), compare compatibility, list required field modifications, and detail pros & cons.

Provide the response in strict JSON format matching the following schema:
{
  "alternatives": [
    {
      "equivalentPartNumber": "Equivalent Model/Part Number",
      "manufacturer": "OEM Name",
      "compatibilityScore": number (integer 0-100),
      "requiredModifications": "E.g., requires mounting adapter, thread adapter, or wiring changes. State 'None' if completely drop-in.",
      "advantages": "E.g., higher reliability, wider availability, lower cost, or improved precision",
      "disadvantages": "E.g., slightly different calibration protocol, higher power draw, or physically larger"
    }
  ],
  "engineeringSummary": "General engineering summary and advice on substituting this part in a critical process loop."
}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    equivalentPartNumber: { type: Type.STRING },
                    manufacturer: { type: Type.STRING },
                    compatibilityScore: { type: Type.INTEGER },
                    requiredModifications: { type: Type.STRING },
                    advantages: { type: Type.STRING },
                    disadvantages: { type: Type.STRING }
                  },
                  required: ["equivalentPartNumber", "manufacturer", "compatibilityScore", "requiredModifications", "advantages", "disadvantages"]
                }
              },
              engineeringSummary: { type: Type.STRING }
            },
            required: ["alternatives", "engineeringSummary"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Alternative Parts API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for AI Engineering recommendations (bulk analysis)
  app.post("/api/gemini/bulk-recommendations", async (req, res) => {
    try {
      const { materials } = req.body;
      if (!materials || !Array.isArray(materials)) {
        return res.status(400).json({ error: "Materials list must be an array." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      // Serialize critical information to fit into prompt token budgets
      const serialized = materials.map(m => ({
        partNumber: m.partNumber,
        description: m.description,
        manufacturer: m.manufacturer,
        model: m.model,
        quantity: m.quantity,
        unit: m.unit,
        minStockLevel: m.minStockLevel || 0,
        notes: m.notes || "",
        seq: m.sequence || ""
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Perform an intelligent engineering and inventory optimization analysis on the entire registered materials ledger of EMIS.
Here is the serialized ledger data:
${JSON.stringify(serialized)}

Please perform the following analyses:
1. Low Stock Detection: Identify which materials are below or dangerously close to their minStockLevel, and calculate a recommended reorder quantity (e.g. based on PO history or a logical safety factor).
2. Obsolescence Warning: Warn about obsolete, discontinued, or legacy materials (e.g. older transmitter models like Rosemount 1151 or old HART models) that are risky to keep as spares and suggest modern equivalents.
3. Duplicate Material Detection: Detect duplicate or overlapping inventory items (e.g., parts with slightly different part numbers but identical technical descriptions or models) that can be consolidated.
4. Stock Optimization: Suggest general optimization strategies (such as reducing safety stock for highly reliable parts, or consolidating suppliers).

Provide the output in strict JSON format matching the following schema:
{
  "lowStockAlerts": [
    {
      "partNumber": "Part number",
      "description": "Item description",
      "currentQty": number,
      "minLevel": number,
      "recommendedReorderQty": number,
      "urgency": "high" | "medium"
    }
  ],
  "obsolescenceWarnings": [
    {
      "partNumber": "Part number",
      "model": "Model",
      "manufacturer": "OEM",
      "obsoleteReason": "Explanation of obsolescence or legacy status",
      "recommendedReplacement": "Suggested modern part number/model"
    }
  ],
  "duplicateDetections": [
    {
      "items": ["Part1", "Part2"],
      "similarityReason": "Explanation of why these items appear to be duplicates",
      "recommendedAction": "Action to consolidate or merge"
    }
  ],
  "optimizationTips": [
    {
      "category": "E.g., Consolidation, Safety Stock, Supplier",
      "tip": "Actionable optimization suggestion"
    }
  ]
}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lowStockAlerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partNumber: { type: Type.STRING },
                    description: { type: Type.STRING },
                    currentQty: { type: Type.NUMBER },
                    minLevel: { type: Type.NUMBER },
                    recommendedReorderQty: { type: Type.NUMBER },
                    urgency: { type: Type.STRING, enum: ["high", "medium"] }
                  },
                  required: ["partNumber", "description", "currentQty", "minLevel", "recommendedReorderQty", "urgency"]
                }
              },
              obsolescenceWarnings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partNumber: { type: Type.STRING },
                    model: { type: Type.STRING },
                    manufacturer: { type: Type.STRING },
                    obsoleteReason: { type: Type.STRING },
                    recommendedReplacement: { type: Type.STRING }
                  },
                  required: ["partNumber", "model", "manufacturer", "obsoleteReason", "recommendedReplacement"]
                }
              },
              duplicateDetections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    items: { type: Type.ARRAY, items: { type: Type.STRING } },
                    similarityReason: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING }
                  },
                  required: ["items", "similarityReason", "recommendedAction"]
                }
              },
              optimizationTips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    tip: { type: Type.STRING }
                  },
                  required: ["category", "tip"]
                }
              }
            },
            required: ["lowStockAlerts", "obsolescenceWarnings", "duplicateDetections", "optimizationTips"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Bulk recommendations API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
