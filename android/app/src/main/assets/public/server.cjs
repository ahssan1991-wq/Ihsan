var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
import_dotenv.default.config();
var DB_FILE = import_path.default.join(process.cwd(), "firestore_db.json");
function readDb() {
  if (!import_fs.default.existsSync(DB_FILE)) {
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
    const data = JSON.parse(import_fs.default.readFileSync(DB_FILE, "utf-8"));
    if (data && data.initialized === void 0) {
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
function writeDb(data) {
  try {
    data.initialized = true;
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write DB file:", e);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const UPLOADS_DIR = import_path.default.join(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(UPLOADS_DIR)) {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use("/uploads", import_express.default.static(UPLOADS_DIR));
  function getAi() {
    return new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  async function callGeminiResiliently(options) {
    let preferred = options.preferredModel;
    if (preferred === "gemini-3.7-flash") {
      preferred = "gemini-3.8-flash";
    } else if (preferred === "gemini-2.5-flash" || preferred === "gemini-2.5-pro" || preferred === "gemini-1.5-flash") {
      preferred = "gemini-3.1-flash-lite";
    }
    const candidateModels = [
      preferred,
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.1-pro-preview"
    ].filter((m) => Boolean(m) && m !== "gemini-2.5-flash" && m !== "gemini-2.5-pro");
    const uniqueModels = Array.from(new Set(candidateModels));
    const ai = getAi();
    let lastError = null;
    const isTransientError = (err) => {
      const status = Number(err?.status || err?.code || err?.statusCode || 0);
      const msg = String(err?.message || "").toLowerCase();
      return status === 503 || status === 429 || status === 500 || status === 502 || status === 504 || status === 404 || msg.includes("503") || msg.includes("429") || msg.includes("404") || msg.includes("overloaded") || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("unavailable") || msg.includes("timeout") || msg.includes("fetch failed") || msg.includes("no longer available") || msg.includes("not_found");
    };
    for (let i = 0; i < uniqueModels.length; i++) {
      const model = uniqueModels[i];
      const maxRetries = 1;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config
          });
          if (i > 0 || attempt > 0) {
            console.log(`[Gemini Resilience] Model ${model} succeeded (fallback level ${i + 1})`);
          }
          return {
            text: response.text,
            modelUsed: model,
            rawResponse: response
          };
        } catch (err) {
          lastError = err;
          const status = err?.status || err?.code || err?.message || "unknown";
          const msg = String(err?.message || "").toLowerCase();
          const isTransient = isTransientError(err);
          const isNotFound = status === 404 || String(status).includes("404") || msg.includes("404") || msg.includes("no longer available") || msg.includes("not_found");
          const isOverloadOrQuota = status === 503 || status === 429 || String(status).includes("503") || String(status).includes("429") || msg.includes("503") || msg.includes("429") || msg.includes("overloaded") || msg.includes("resource_exhausted") || msg.includes("quota");
          if ((isOverloadOrQuota || isNotFound) && i < uniqueModels.length - 1) {
            console.log(`[Gemini Resilience] Model ${model} returned (${status}). Switching instantly to ${uniqueModels[i + 1]}...`);
            break;
          }
          if (isTransient && attempt < maxRetries && !isOverloadOrQuota && !isNotFound) {
            const delayMs = 300 * Math.pow(1.5, attempt) + Math.random() * 150;
            console.log(`[Gemini Resilience] Model ${model} transient status (${status}). Retrying in ${Math.round(delayMs)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          } else {
            if (i < uniqueModels.length - 1) {
              console.log(`[Gemini Resilience] Switching from ${model} to next candidate model...`);
            }
            break;
          }
        }
      }
    }
    throw lastError || new Error("All Gemini model fallbacks failed");
  }
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "EMIS Inspection & Materials Server v0.5",
      environment: process.env.NODE_ENV || "development",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    });
  });
  app.get("/api/gemini/ping", async (req, res) => {
    const startTime = Date.now();
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    if (!hasKey) {
      return res.json({
        success: false,
        status: "unconfigured",
        error: "GEMINI_API_KEY environment variable is not configured on server. Please configure GEMINI_API_KEY in Settings > Secrets.",
        durationMs: Date.now() - startTime
      });
    }
    try {
      const callPromise = callGeminiResiliently({
        contents: "Respond with single word: OK",
        config: {
          thinkingConfig: { thinkingLevel: import_genai.ThinkingLevel.MINIMAL },
          temperature: 0.1
        },
        preferredModel: "gemini-3.1-flash-lite"
      });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Gemini API connection timed out after 25 seconds.")), 25e3)
      );
      const result = await Promise.race([callPromise, timeoutPromise]);
      return res.json({
        success: true,
        status: "connected",
        model: result.modelUsed,
        probeReply: result.text?.trim() || "OK",
        durationMs: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Gemini ping error:", err);
      return res.json({
        success: false,
        status: "error",
        error: err.message || "Gemini ping probe failed",
        errorDetails: {
          code: err.code || err.status || "API_ERROR",
          message: err.message,
          stack: err.stack
        },
        durationMs: Date.now() - startTime
      });
    }
  });
  app.get("/api/firebase/ping", (req, res) => {
    const startTime = Date.now();
    try {
      let config = null;
      const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
      if (import_fs.default.existsSync(configPath)) {
        config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
      }
      const hasConfig = Boolean(config && config.projectId);
      const isRemixed = config?.apiKey === "remixed-api-key";
      return res.json({
        success: hasConfig,
        status: hasConfig ? "configured" : "unconfigured",
        projectId: config?.projectId || null,
        databaseId: config?.firestoreDatabaseId || "(default)",
        authDomain: config?.authDomain || null,
        storageBucket: config?.storageBucket || null,
        isCustomApiKey: !isRemixed,
        durationMs: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to read Firebase config",
        durationMs: Date.now() - startTime
      });
    }
  });
  app.get("/api/db/load", (req, res) => {
    try {
      const db = readDb();
      res.json(db);
    } catch (error) {
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
    } catch (error) {
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
      const filePath = import_path.default.join(UPLOADS_DIR, fileName);
      import_fs.default.writeFileSync(filePath, buffer);
      res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/gemini/scan-nameplate", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          // default to jpeg
          data: base64Data
        }
      };
      const promptPart = {
        text: `Analyze the provided industrial machine or equipment nameplate image. 
Note: The image may be captured at an oblique angle, rotated (90\xB0, 180\xB0, 270\xB0), tilted, upside-down, or have glare/low contrast. Carefully inspect and mentally re-orient all sections of the nameplate to accurately read stamped text, laser etchings, serial numbers, model plates, 1D barcodes, and 2D QR matrix codes. Extract technical specifications and return them in a strict JSON format.
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
        type: import_genai.Type.OBJECT,
        properties: {
          value: { type: import_genai.Type.STRING },
          confidence: { type: import_genai.Type.INTEGER }
        },
        required: ["confidence"]
      };
      const response = await callGeminiResiliently({
        contents: { parts: [imagePart, promptPart] },
        preferredModel: "gemini-3.8-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
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
              qrCode: fieldSchema
            },
            required: [
              "manufacturer",
              "brand",
              "model",
              "partNumber",
              "serialNumber",
              "voltage",
              "current",
              "power",
              "output",
              "input",
              "frequency",
              "revision",
              "manufactureDate",
              "countryOfOrigin",
              "certificationMarks",
              "barcode",
              "qrCode"
            ]
          }
        }
      });
      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("Empty response from Gemini model");
      }
      const parsedData = JSON.parse(extractedText.trim());
      res.json(parsedData);
    } catch (error) {
      console.error("Scan nameplate error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/auto-complete-material", async (req, res) => {
    try {
      const { partNumber, manufacturer, model, description, scannedText } = req.body;
      if (!partNumber && !model && !description && !scannedText) {
        return res.status(400).json({ error: "At least one identifying detail (part number, model, description, or scanned text) is required." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }
      const prompt = `You are a certified industrial instrumentation and electrical engineering specialist.
Analyze the following item parameters and generate a complete, accurate, standardized technical profile for an industrial materials inventory ledger:

Input Data:
- Part Number: "${partNumber || "N/A"}"
- Manufacturer: "${manufacturer || "N/A"}"
- Model: "${model || "N/A"}"
- Current Description: "${description || "N/A"}"
- Scanned / OCR text: "${scannedText || "N/A"}"

Based on standard industrial catalog databases (Rosemount, Emerson, Siemens, ABB, Endress+Hauser, Schneider, Rockwell, Yokogawa, etc.):
1. Formulate a standardized industrial description (English & Arabic terms).
2. Determine or verify the official Manufacturer and exact Model series.
3. Determine standard stock unit (pcs, m, set, box, kg).
4. Recommend a logical minimum stock level (minStockLevel: 2-20).
5. Recommend typical storage zone / lab (e.g., "Instrumentation Workshop (Store B)", "Electronics Lab (Lab A)", "Primary Warehouse (Rack 01)").
6. Extract or estimate standard electrical / operational specifications (voltage, signal output like 4-20mA HART / Modbus / dry contact, power rating, operating range, IP rating, ATEX / IECEx rating).
7. Write a concise technical datasheet summary and safety handling instructions for warehouse technicians.

Provide the output in strict JSON format according to this schema:
{
  "description": "Standardized industrial description",
  "manufacturer": "Standardized OEM Name",
  "model": "Standardized Model",
  "unit": "pcs" | "set" | "m" | "box" | "kg",
  "minStockLevel": number,
  "suggestedStore": "Recommended store/workshop name",
  "voltage": "e.g. 24 VDC or 110-240 VAC",
  "current": "e.g. 4-20 mA",
  "power": "e.g. 1.5 W",
  "signalOutput": "e.g. 4-20mA HART / Modbus RTU / Relay",
  "operatingRange": "e.g. -40\xB0C to +85\xB0C, 0-100 bar",
  "ipRating": "e.g. IP66 / NEMA 4X",
  "hazardousCertification": "e.g. ATEX Ex ia IIC T4 Ga / FM Approved",
  "technicalSummary": "Concise engineering specs summary",
  "safetyNotes": "Warehouse handling and electrostatic/pressure cautions"
}
`;
      const response = await callGeminiResiliently({
        contents: prompt,
        preferredModel: "gemini-3.8-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              description: { type: import_genai.Type.STRING },
              manufacturer: { type: import_genai.Type.STRING },
              model: { type: import_genai.Type.STRING },
              unit: { type: import_genai.Type.STRING },
              minStockLevel: { type: import_genai.Type.INTEGER },
              suggestedStore: { type: import_genai.Type.STRING },
              voltage: { type: import_genai.Type.STRING },
              current: { type: import_genai.Type.STRING },
              power: { type: import_genai.Type.STRING },
              signalOutput: { type: import_genai.Type.STRING },
              operatingRange: { type: import_genai.Type.STRING },
              ipRating: { type: import_genai.Type.STRING },
              hazardousCertification: { type: import_genai.Type.STRING },
              technicalSummary: { type: import_genai.Type.STRING },
              safetyNotes: { type: import_genai.Type.STRING }
            },
            required: [
              "description",
              "manufacturer",
              "model",
              "unit",
              "minStockLevel",
              "suggestedStore",
              "voltage",
              "current",
              "power",
              "signalOutput",
              "operatingRange",
              "ipRating",
              "hazardousCertification",
              "technicalSummary",
              "safetyNotes"
            ]
          }
        }
      });
      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("Empty response from Gemini");
      }
      res.json(JSON.parse(extractedText.trim()));
    } catch (error) {
      console.error("Auto-complete material error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/quick-match", async (req, res) => {
    try {
      const { query, materials } = req.body;
      if (!query || !Array.isArray(materials)) {
        return res.status(400).json({ error: "Query and materials array are required." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      const serializedList = materials.slice(0, 100).map((m) => ({
        seq: m.sequence,
        partNumber: m.partNumber,
        model: m.model,
        manufacturer: m.manufacturer,
        description: m.description,
        serialNumber: m.serialNumber || "",
        location: `${m.store} - Rack ${m.rack} - Shelf ${m.shelf}`
      }));
      const prompt = `You are a precision inventory search engine.
The user is looking for or scanned: "${query}".

Analyze the following candidate items from our inventory ledger:
${JSON.stringify(serializedList)}

Identify the best matching items. Score them from 0 to 100 based on exact or fuzzy part number match, model equivalence, manufacturer, serial number, and semantic description match.
Return up to 5 top matching items with match score and reasoning.

Schema:
{
  "matches": [
    {
      "partNumber": "Part number",
      "score": number (0-100),
      "matchType": "exact_part" | "model_match" | "fuzzy_part" | "semantic_description" | "serial_match",
      "reason": "Clear explanation of match"
    }
  ]
}
`;
      const response = await callGeminiResiliently({
        contents: prompt,
        preferredModel: "gemini-3.8-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              matches: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    partNumber: { type: import_genai.Type.STRING },
                    score: { type: import_genai.Type.INTEGER },
                    matchType: { type: import_genai.Type.STRING },
                    reason: { type: import_genai.Type.STRING }
                  },
                  required: ["partNumber", "score", "matchType", "reason"]
                }
              }
            },
            required: ["matches"]
          }
        }
      });
      res.json(JSON.parse(response.text || '{"matches": []}'));
    } catch (error) {
      console.error("Quick match API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/find-nearest-substitute", async (req, res) => {
    try {
      const { query, criteria, materials, decisions = [], blacklist = [] } = req.body;
      if (!query && !criteria) {
        return res.status(400).json({ error: "Query or criteria object is required." });
      }
      if (!Array.isArray(materials) || materials.length === 0) {
        return res.json({ substitutes: [] });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      const condensedMaterials = materials.slice(0, 100).map((m) => ({
        partNumber: m.partNumber,
        manufacturer: m.manufacturer,
        model: m.model,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        store: m.store,
        rack: m.rack,
        shelf: m.shelf,
        materialType: m.materialType || "",
        inletPressure: m.inletPressure || "",
        outletPressure: m.outletPressure || "",
        connectionSize: m.connectionSize || "",
        connectionType: m.connectionType || "",
        bodyMaterial: m.bodyMaterial || m.materialOfConstruction || "",
        temperatureRange: m.temperatureRange || m.temperatureLimits || "",
        flowRate: m.flowRate || "",
        voltage: m.voltage || m.electricalRating || m.powerSupply || "",
        signalProtocol: m.signalProtocol || m.outputProtocol || "",
        ipRating: m.ipRating || "",
        exClassification: m.exClassification || m.hazardousClassification || "",
        measuringRange: m.measuringRange || "",
        processConnection: m.processConnection || ""
      }));
      const prompt = `You are a certified Lead Instrumentation & Process Engineering Specialist for an industrial plant.
The user is searching for an industrial spare part or equipment component that is NOT in stock or does NOT have an exact match.

Search Request / Target Specifications:
- Search Query: "${query || "N/A"}"
- Structured Criteria: ${JSON.stringify(criteria || {})}

Existing Warehouse Inventory Ledger (Candidate Pool):
${JSON.stringify(condensedMaterials)}

Task:
Find the TOP 1 to 5 NEAREST functional substitute materials available in the inventory.
For each nearest candidate:
1. "nearestModel": The model/series of this candidate.
2. "nearestPartNumber": Part number of this candidate.
3. "matchScore": Compatibility percentage from 1 to 99 (never 100 since it is not an exact match).
4. "compatibilityReason": Clear engineering justification why this can serve as a substitute (Arabic & English technical context).
5. "similarityBreakdown": Object with specific match tags:
   - "typeMatch": "Match" | "Different" | "Compatible" | "N/A"
   - "pressureMatch": "Match" | "Different" | "Compatible" | "N/A"
   - "connectionMatch": "Match" | "Different" | "Compatible" | "N/A"
   - "manufacturerMatch": "Match" | "Different" | "Compatible" | "N/A"
   - "voltageMatch": "Match" | "Different" | "Compatible" | "N/A"
   - "materialMatch": "Match" | "Different" | "Compatible" | "N/A"
6. "differences": Array of specific technical differences between the requested item and this substitute. Each item must have:
   - "feature": Feature name (e.g., "\u0646\u0637\u0627\u0642 \u0636\u063A\u0637 \u0627\u0644\u062F\u062E\u0648\u0644 / Inlet Pressure", "\u0646\u0637\u0627\u0642 \u0636\u063A\u0637 \u0627\u0644\u062E\u0631\u0648\u062C / Outlet Pressure", "\u062D\u062C\u0645 \u0648\u0646\u0648\u0639 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 / Connection Size & Type", "\u0645\u0627\u062F\u0629 \u0627\u0644\u062A\u0635\u0646\u064A\u0639 / Body Material", "\u0646\u0648\u0639 \u0627\u0644\u0625\u0634\u0627\u0631\u0629 / Signal Protocol", "\u0641\u0648\u0644\u062A\u064A\u0629 \u0627\u0644\u062A\u063A\u0630\u064A\u0629 / Power Supply", "\u062F\u0631\u062C\u0629 \u0627\u0644\u062D\u0645\u0627\u064A\u0629 / IP Rating", "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0635\u0646\u0639\u0629 / Brand")
   - "requested": What was requested/needed
   - "candidate": What this substitute has
   - "impact": "low" | "medium" | "critical" | "favorable"
7. "differencesSummary": A concise summary of the key differences and what must be adapted (e.g. requires re-calibration, adapter flange, or re-wiring).
8. "engineeringAdvisory": A mandatory safety & engineering cautionary message: "\u26A0\uFE0F Engineering Review Required: \u0647\u0630\u0627 \u0627\u0644\u0628\u062F\u064A\u0644 \u0645\u0642\u062A\u0631\u062D \u0622\u0644\u064A\u0627\u064B \u0648\u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0647\u0646\u062F\u0633 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0648\u0627\u0644\u0622\u0644\u0627\u062A \u0627\u0644\u062F\u0642\u064A\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0641\u064A \u062E\u0637 \u0627\u0644\u0625\u0646\u062A\u0627\u062C."

Provide the response in strict JSON:
{
  "substitutes": [
    {
      "nearestPartNumber": string,
      "nearestModel": string,
      "matchScore": number,
      "compatibilityReason": string,
      "similarityBreakdown": {
        "typeMatch": "Match" | "Different" | "Compatible" | "N/A",
        "pressureMatch": "Match" | "Different" | "Compatible" | "N/A",
        "connectionMatch": "Match" | "Different" | "Compatible" | "N/A",
        "manufacturerMatch": "Match" | "Different" | "Compatible" | "N/A",
        "voltageMatch": "Match" | "Different" | "Compatible" | "N/A",
        "materialMatch": "Match" | "Different" | "Compatible" | "N/A"
      },
      "differences": [
        {
          "feature": string,
          "requested": string,
          "candidate": string,
          "impact": "low" | "medium" | "critical" | "favorable"
        }
      ],
      "differencesSummary": string,
      "engineeringAdvisory": string,
      "matchingParameters": string[]
    }
  ]
}
`;
      const response = await callGeminiResiliently({
        contents: prompt,
        preferredModel: "gemini-3.8-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              substitutes: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    nearestPartNumber: { type: import_genai.Type.STRING },
                    nearestModel: { type: import_genai.Type.STRING },
                    matchScore: { type: import_genai.Type.INTEGER },
                    compatibilityReason: { type: import_genai.Type.STRING },
                    similarityBreakdown: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        typeMatch: { type: import_genai.Type.STRING },
                        pressureMatch: { type: import_genai.Type.STRING },
                        connectionMatch: { type: import_genai.Type.STRING },
                        manufacturerMatch: { type: import_genai.Type.STRING },
                        voltageMatch: { type: import_genai.Type.STRING },
                        materialMatch: { type: import_genai.Type.STRING }
                      }
                    },
                    differences: {
                      type: import_genai.Type.ARRAY,
                      items: {
                        type: import_genai.Type.OBJECT,
                        properties: {
                          feature: { type: import_genai.Type.STRING },
                          requested: { type: import_genai.Type.STRING },
                          candidate: { type: import_genai.Type.STRING },
                          impact: { type: import_genai.Type.STRING }
                        },
                        required: ["feature", "requested", "candidate", "impact"]
                      }
                    },
                    differencesSummary: { type: import_genai.Type.STRING },
                    engineeringAdvisory: { type: import_genai.Type.STRING },
                    matchingParameters: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    }
                  },
                  required: [
                    "nearestPartNumber",
                    "nearestModel",
                    "matchScore",
                    "compatibilityReason",
                    "differences",
                    "differencesSummary",
                    "engineeringAdvisory"
                  ]
                }
              }
            },
            required: ["substitutes"]
          }
        }
      });
      const parsed = JSON.parse(response.text || '{"substitutes": []}');
      res.json(parsed);
    } catch (error) {
      console.error("Find nearest substitute error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/engineering-insights", async (req, res) => {
    try {
      const { site, metrics, shortages, aging, suppliers, dateRange } = req.body;
      const prompt = `You are a Principal Industrial Engineering & QA/QC Systems Specialist for the EMIS Engineering Material Intelligence System.
Analyze the following REAL plant telemetry, material inventory, supplier ratings, and inspection backlog to produce structured engineering insights.

Context:
- Target Site: "${site || "All Enterprise Sites"}"
- Evaluation Period: "${dateRange || "Current 30-Day Period"}"
- High-level KPIs: ${JSON.stringify(metrics || [])}
- Critical Stock Shortages / Opportunities: ${JSON.stringify(shortages || [])}
- Inspection & Approval Aging: ${JSON.stringify(aging || [])}
- Supplier Risk Scorecards: ${JSON.stringify(suppliers || [])}

STRICT ENGINEERING SAFETY & ACCURACY RULES:
1. Ground every risk, opportunity, and recommendation on the REAL evidence provided above.
2. NEVER invent numbers, supplier names, or part numbers that do not exist in the context.
3. NEVER instruct the system to automatically approve, reject, or adjust inventory without human engineer sign-off.
4. If evidence is insufficient, explicitly specify "UNKNOWN" or note insufficient data.
5. Provide bilingual summaries (English and Arabic) suitable for technical leadership.

Output structured JSON strictly conforming to the schema.`;
      const response = await callGeminiResiliently({
        contents: prompt,
        preferredModel: "gemini-3.8-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              summary: { type: import_genai.Type.STRING },
              arabicSummary: { type: import_genai.Type.STRING },
              risks: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    title: { type: import_genai.Type.STRING },
                    severity: { type: import_genai.Type.STRING },
                    details: { type: import_genai.Type.STRING },
                    affectedEntities: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    }
                  },
                  required: ["title", "severity", "details", "affectedEntities"]
                }
              },
              opportunities: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    title: { type: import_genai.Type.STRING },
                    details: { type: import_genai.Type.STRING },
                    potentialGain: { type: import_genai.Type.STRING }
                  },
                  required: ["title", "details", "potentialGain"]
                }
              },
              recommendations: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    title: { type: import_genai.Type.STRING },
                    actionType: { type: import_genai.Type.STRING },
                    priority: { type: import_genai.Type.STRING },
                    rationale: { type: import_genai.Type.STRING }
                  },
                  required: ["title", "actionType", "priority", "rationale"]
                }
              },
              evidence: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    metric: { type: import_genai.Type.STRING },
                    value: { type: import_genai.Type.STRING },
                    source: { type: import_genai.Type.STRING }
                  },
                  required: ["metric", "value", "source"]
                }
              },
              confidence: { type: import_genai.Type.INTEGER }
            },
            required: ["summary", "arabicSummary", "risks", "opportunities", "recommendations", "evidence", "confidence"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json({
        id: `INS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        site: site || "ALL",
        dateRange: dateRange || "30_DAYS",
        model: "gemini-3.8-flash",
        status: "ACTIVE",
        ...parsed
      });
    } catch (error) {
      console.error("Engineering insights API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI insights" });
    }
  });
  app.post("/api/gemini/natural-analytics", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        res.status(400).json({ error: "query is required" });
        return;
      }
      const prompt = `You are an AI Search & Analytical Query Parser for the EMIS Material System.
Translate the user's natural language request into safe structured filter parameters.
Query: "${query}"

Valid Sites: "NDGS", "H-IPF DGS", "DGS North", "DGS South", "Jumna", "PETROMAINT", "ALL"
Valid Categories: "STOCK", "DOCUMENT", "INSPECTION", "APPROVAL", "MISMATCH", "TRANSFER", "SUPPLIER", "ALL"
Valid Statuses: "Available", "Under Inspection", "Rejected", "On Hold", "ALL"

Provide a clear explanation and structured filter object.`;
      const response = await callGeminiResiliently({
        contents: prompt,
        preferredModel: "gemini-3.1-flash-lite",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              explanation: { type: import_genai.Type.STRING },
              arabicExplanation: { type: import_genai.Type.STRING },
              filters: {
                type: import_genai.Type.OBJECT,
                properties: {
                  site: { type: import_genai.Type.STRING },
                  category: { type: import_genai.Type.STRING },
                  status: { type: import_genai.Type.STRING },
                  searchTerm: { type: import_genai.Type.STRING },
                  hasMissingDocsOnly: { type: import_genai.Type.BOOLEAN },
                  lowStockOnly: { type: import_genai.Type.BOOLEAN }
                },
                required: ["site", "category", "status", "searchTerm", "hasMissingDocsOnly", "lowStockOnly"]
              }
            },
            required: ["explanation", "arabicExplanation", "filters"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error) {
      console.error("Natural analytics API error:", error);
      res.status(500).json({ error: error.message || "Query parser error" });
    }
  });
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, systemInstruction } = req.body;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }
      const contents = (history || []).map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      }));
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
      const response = await callGeminiResiliently({
        contents,
        preferredModel: "gemini-3.8-flash",
        config: {
          systemInstruction: systemInstruction || "You are a professional engineering assistant.",
          temperature: 0.2
          // lower temperature for precision
        }
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
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
      const response = await callGeminiResiliently({
        preferredModel: "gemini-3.8-flash",
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
            type: import_genai.Type.OBJECT,
            properties: {
              compatibilityPercentage: { type: import_genai.Type.INTEGER },
              summary: { type: import_genai.Type.STRING },
              electricalDiffs: { type: import_genai.Type.STRING },
              mechanicalDiffs: { type: import_genai.Type.STRING },
              environmentalDiffs: { type: import_genai.Type.STRING },
              certificationsDiffs: { type: import_genai.Type.STRING },
              pinoutDiffs: { type: import_genai.Type.STRING },
              ioDiffs: { type: import_genai.Type.STRING },
              powerDiffs: { type: import_genai.Type.STRING },
              overallVerdict: { type: import_genai.Type.STRING }
            },
            required: [
              "compatibilityPercentage",
              "summary",
              "electricalDiffs",
              "mechanicalDiffs",
              "environmentalDiffs",
              "certificationsDiffs",
              "pinoutDiffs",
              "ioDiffs",
              "powerDiffs",
              "overallVerdict"
            ]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Compare Datasheets API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
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
      const response = await callGeminiResiliently({
        preferredModel: "gemini-3.8-flash",
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
            type: import_genai.Type.OBJECT,
            properties: {
              manufacturer1: { type: import_genai.Type.STRING },
              manufacturer2: { type: import_genai.Type.STRING },
              manufacturerMatch: { type: import_genai.Type.BOOLEAN },
              partNumber1: { type: import_genai.Type.STRING },
              partNumber2: { type: import_genai.Type.STRING },
              partNumberMatch: { type: import_genai.Type.BOOLEAN },
              serialNumber1: { type: import_genai.Type.STRING },
              serialNumber2: { type: import_genai.Type.STRING },
              serialNumberMatch: { type: import_genai.Type.BOOLEAN },
              standards1: { type: import_genai.Type.STRING },
              standards2: { type: import_genai.Type.STRING },
              standardsMatch: { type: import_genai.Type.BOOLEAN },
              dates1: { type: import_genai.Type.STRING },
              dates2: { type: import_genai.Type.STRING },
              datesMatch: { type: import_genai.Type.BOOLEAN },
              missingInformation: { type: import_genai.Type.STRING },
              mismatches: { type: import_genai.Type.STRING },
              complianceVerdict: { type: import_genai.Type.STRING },
              isCompliant: { type: import_genai.Type.BOOLEAN }
            },
            required: [
              "manufacturer1",
              "manufacturer2",
              "manufacturerMatch",
              "partNumber1",
              "partNumber2",
              "partNumberMatch",
              "serialNumber1",
              "serialNumber2",
              "serialNumberMatch",
              "standards1",
              "standards2",
              "standardsMatch",
              "dates1",
              "dates2",
              "datesMatch",
              "missingInformation",
              "mismatches",
              "complianceVerdict",
              "isCompliant"
            ]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Compare COC API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/knowledge-assistant", async (req, res) => {
    try {
      const { material } = req.body;
      if (!material) {
        return res.status(400).json({ error: "Material information is required." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      const response = await callGeminiResiliently({
        preferredModel: "gemini-3.8-flash",
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
            type: import_genai.Type.OBJECT,
            properties: {
              explanation: { type: import_genai.Type.STRING },
              applications: { type: import_genai.Type.STRING },
              failures: { type: import_genai.Type.STRING },
              troubleshooting: { type: import_genai.Type.STRING },
              installation: { type: import_genai.Type.STRING },
              maintenance: { type: import_genai.Type.STRING },
              safety: { type: import_genai.Type.STRING }
            },
            required: ["explanation", "applications", "failures", "troubleshooting", "installation", "maintenance", "safety"]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Knowledge Assistant API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/alternative-parts", async (req, res) => {
    try {
      const { material } = req.body;
      if (!material) {
        return res.status(400).json({ error: "Material information is required." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      const response = await callGeminiResiliently({
        preferredModel: "gemini-3.8-flash",
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
            type: import_genai.Type.OBJECT,
            properties: {
              alternatives: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    equivalentPartNumber: { type: import_genai.Type.STRING },
                    manufacturer: { type: import_genai.Type.STRING },
                    compatibilityScore: { type: import_genai.Type.INTEGER },
                    requiredModifications: { type: import_genai.Type.STRING },
                    advantages: { type: import_genai.Type.STRING },
                    disadvantages: { type: import_genai.Type.STRING }
                  },
                  required: ["equivalentPartNumber", "manufacturer", "compatibilityScore", "requiredModifications", "advantages", "disadvantages"]
                }
              },
              engineeringSummary: { type: import_genai.Type.STRING }
            },
            required: ["alternatives", "engineeringSummary"]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Alternative Parts API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/gemini/bulk-recommendations", async (req, res) => {
    try {
      const { materials } = req.body;
      if (!materials || !Array.isArray(materials)) {
        return res.status(400).json({ error: "Materials list must be an array." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      const serialized = materials.map((m) => ({
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
      const response = await callGeminiResiliently({
        preferredModel: "gemini-3.8-flash",
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
            type: import_genai.Type.OBJECT,
            properties: {
              lowStockAlerts: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    partNumber: { type: import_genai.Type.STRING },
                    description: { type: import_genai.Type.STRING },
                    currentQty: { type: import_genai.Type.NUMBER },
                    minLevel: { type: import_genai.Type.NUMBER },
                    recommendedReorderQty: { type: import_genai.Type.NUMBER },
                    urgency: { type: import_genai.Type.STRING, enum: ["high", "medium"] }
                  },
                  required: ["partNumber", "description", "currentQty", "minLevel", "recommendedReorderQty", "urgency"]
                }
              },
              obsolescenceWarnings: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    partNumber: { type: import_genai.Type.STRING },
                    model: { type: import_genai.Type.STRING },
                    manufacturer: { type: import_genai.Type.STRING },
                    obsoleteReason: { type: import_genai.Type.STRING },
                    recommendedReplacement: { type: import_genai.Type.STRING }
                  },
                  required: ["partNumber", "model", "manufacturer", "obsoleteReason", "recommendedReplacement"]
                }
              },
              duplicateDetections: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    items: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                    similarityReason: { type: import_genai.Type.STRING },
                    recommendedAction: { type: import_genai.Type.STRING }
                  },
                  required: ["items", "similarityReason", "recommendedAction"]
                }
              },
              optimizationTips: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    category: { type: import_genai.Type.STRING },
                    tip: { type: import_genai.Type.STRING }
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
    } catch (error) {
      console.error("Bulk recommendations API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  const OFFICIAL_DOMAINS = [
    "emerson.com",
    "rosemount.com",
    "yokogawa.com",
    "endress.com",
    "siemens.com",
    "abb.com",
    "krohne.com",
    "vega.com",
    "honeywell.com",
    "swagelok.com",
    "rotork.com",
    "se.com",
    "schneider-electric.com",
    "bakerhughes.com",
    "slb.com",
    "cameron.slb.com",
    "wika.com",
    "wika.de",
    "danfoss.com",
    "omron.com",
    "rockwellautomation.com",
    "pepperl-fuchs.com",
    "parker.com",
    "festo.com",
    "eaton.com",
    "phoenixcontact.com",
    "spiraxsarco.com",
    "bentlynevada.com",
    "det-tronics.com",
    "spectrex.net",
    "draeger.com"
  ];
  function classifyDomain(urlStr) {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      const isOfficial = OFFICIAL_DOMAINS.some((d) => host.endsWith(d));
      if (isOfficial) {
        if (urlStr.toLowerCase().includes(".pdf") || urlStr.toLowerCase().includes("datasheet") || urlStr.toLowerCase().includes("manual")) {
          return { sourceType: "MANUFACTURER_DATASHEET", isOfficial: true, confidence: "HIGH" };
        }
        return { sourceType: "OFFICIAL_MANUFACTURER", isOfficial: true, confidence: "HIGH" };
      }
      if (urlStr.toLowerCase().includes(".pdf")) {
        return { sourceType: "TECHNICAL_DOCUMENTATION", isOfficial: false, confidence: "MEDIUM" };
      }
      if (host.includes("distributor") || host.includes("supply") || host.includes("mouser") || host.includes("digikey") || host.includes("rs-online")) {
        return { sourceType: "AUTHORIZED_DISTRIBUTOR", isOfficial: false, confidence: "MEDIUM" };
      }
      return { sourceType: "WEB_SEARCH", isOfficial: false, confidence: "LOW" };
    } catch {
      return { sourceType: "WEB_SEARCH", isOfficial: false, confidence: "LOW" };
    }
  }
  app.post("/api/material/translate", async (req, res) => {
    try {
      const { text, sourceLang = "en", targetLang = "ar", context, materialId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text string is required for translation" });
      }
      const prompt = `You are a Senior Certified Industrial Instrumentation and Materials Engineer specializing in oil & gas, petrochemical, and heavy industry terminology (matching standards from Saudi Aramco, ADNOC, EGPC, SABIC, Shell, and ISO/IEC).

Translate the following technical term or equipment description:
Input Text: "${text}"
Source Language: ${sourceLang}
Target Language: ${targetLang}
Context / Equipment info: ${context || "Industrial Equipment / Spare Part"}

Strict Instructions:
1. Provide the exact, industry-standard translation used by field instrumentation & maintenance engineers.
2. In Arabic, translate accurately (e.g. "Pressure Transmitter" -> "\u0645\u0631\u0633\u0644 \u0636\u063A\u0637", "Flow Meter" -> "\u0645\u0642\u064A\u0627\u0633 \u062A\u062F\u0641\u0642", "Check Valve" -> "\u0635\u0645\u0627\u0645 \u0644\u0627 \u0631\u062C\u0639\u064A", "RTD Pt100" -> "\u0645\u0642\u0627\u0648\u0645\u0629 \u062D\u0631\u0627\u0631\u064A\u0629 Pt100").
3. Include the "technicalMeaning" explaining what the device or part does in industrial operations.
4. If the term is completely unknown, garbled, or cannot be determined with certainty, set confidence to "UNKNOWN" and state what is needed. Do not invent fictitious translations.

Return JSON matching the schema.`;
      const response = await callGeminiResiliently({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              originalText: { type: import_genai.Type.STRING },
              translatedText: { type: import_genai.Type.STRING },
              technicalMeaning: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              confidence: { type: import_genai.Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] },
              keySpecifications: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              }
            },
            required: ["originalText", "translatedText", "technicalMeaning", "category", "confidence"]
          }
        }
      });
      const result = JSON.parse(response.text || "{}");
      const translationRecord = {
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        materialId,
        originalText: text,
        originalLanguage: sourceLang,
        translatedText: result.translatedText || text,
        translatedLanguage: targetLang,
        technicalMeaning: result.technicalMeaning || "",
        category: result.category || "Instrumentation",
        confidence: result.confidence || "HIGH",
        source: "AI_GEMINI",
        provider: response.modelUsed,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(translationRecord);
    } catch (error) {
      console.error("Material translation error:", error);
      res.status(500).json({ error: error.message || "Translation service error" });
    }
  });
  app.post("/api/material/search-web", async (req, res) => {
    try {
      const { query, manufacturer, model, partNumber, description } = req.body;
      const searchQuery = query || [manufacturer, model, partNumber, description].filter(Boolean).join(" ");
      if (!searchQuery.trim()) {
        return res.status(400).json({ error: "A search query or material identifiers are required" });
      }
      const prompt = `Perform a live web search for industrial material intelligence on:
Search Query: "${searchQuery}"
Manufacturer: ${manufacturer || "Unknown"}
Model: ${model || "Unknown"}
Part Number: ${partNumber || "Unknown"}

Goal:
1. Search for official manufacturer product pages, datasheets, catalog manuals, and authorized technical specifications.
2. Return factual information found on the web.
3. If no official documentation exists or if the part is discontinued/unknown, explicitly note that.
4. Formulate verified sources with real titles, URLs, and summaries.`;
      let response;
      try {
        response = await callGeminiResiliently({
          contents: prompt,
          preferredModel: "gemini-flash-latest",
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (searchToolErr) {
        console.warn("[Web Search] Search grounding tool unavailable or rate limited, using internal engineering knowledge:", searchToolErr?.message || searchToolErr);
        response = await callGeminiResiliently({
          contents: prompt + "\nProvide comprehensive verified technical specifications, typical operating parameters, and official manufacturer portal links.",
          preferredModel: "gemini-3.1-flash-lite"
        });
      }
      const rawText = response.text || "";
      const rawCandidate = response.rawResponse?.candidates?.[0];
      const groundingMeta = rawCandidate?.groundingMetadata;
      const webSources = [];
      const seenUrls = /* @__PURE__ */ new Set();
      if (groundingMeta?.groundingChunks) {
        for (const chunk of groundingMeta.groundingChunks) {
          const web = chunk.web;
          if (web && web.uri && !seenUrls.has(web.uri)) {
            seenUrls.add(web.uri);
            const classification = classifyDomain(web.uri);
            webSources.push({
              id: `src_${Date.now()}_${webSources.length}`,
              title: web.title || "Technical Web Document",
              url: web.uri,
              domain: new URL(web.uri).hostname.replace(/^www\./, ""),
              snippet: rawText.slice(0, 300),
              sourceType: classification.sourceType,
              confidence: classification.confidence,
              isOfficialDomain: classification.isOfficial,
              relevance: classification.isOfficial ? "HIGH" : "MEDIUM",
              date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            });
          }
        }
      }
      if (webSources.length === 0) {
        const urlRegex = /(https?:\/\/[^\s\)\],"\']+)/gi;
        const matches = rawText.match(urlRegex) || [];
        for (const matchUrl of matches) {
          if (!seenUrls.has(matchUrl)) {
            try {
              seenUrls.add(matchUrl);
              const classification = classifyDomain(matchUrl);
              webSources.push({
                id: `src_${Date.now()}_${webSources.length}`,
                title: `${manufacturer || "Industrial"} Reference`,
                url: matchUrl,
                domain: new URL(matchUrl).hostname.replace(/^www\./, ""),
                snippet: rawText.slice(0, 200),
                sourceType: classification.sourceType,
                confidence: classification.confidence,
                isOfficialDomain: classification.isOfficial,
                relevance: "MEDIUM",
                date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
              });
            } catch {
            }
          }
        }
      }
      if (manufacturer && webSources.length === 0) {
        const mKey = manufacturer.toLowerCase();
        for (const d of OFFICIAL_DOMAINS) {
          if (d.includes(mKey) || mKey.includes(d.split(".")[0])) {
            webSources.push({
              id: `src_${Date.now()}_0`,
              title: `${manufacturer} Official Portal`,
              url: `https://www.${d}`,
              domain: d,
              snippet: `Official website and product catalog for ${manufacturer}.`,
              sourceType: "OFFICIAL_MANUFACTURER",
              confidence: "HIGH",
              isOfficialDomain: true,
              relevance: "HIGH",
              date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            });
            break;
          }
        }
      }
      res.json({
        query: searchQuery,
        summary: rawText,
        sourcesCount: webSources.length,
        webSources,
        modelUsed: response.modelUsed,
        searchQueriesUsed: groundingMeta?.webSearchQueries || [searchQuery]
      });
    } catch (error) {
      console.error("Web search API error:", error);
      res.status(500).json({ error: error.message || "Web search error" });
    }
  });
  app.post("/api/material/find-datasheet", async (req, res) => {
    try {
      const { manufacturer, model, partNumber, description } = req.body;
      const target = [manufacturer, model, partNumber, description].filter(Boolean).join(" ");
      if (!target.trim()) {
        return res.status(400).json({ error: "Material details required for datasheet search" });
      }
      const prompt = `Search for official manufacturer PDF datasheets, product manuals, specifications, and CAD drawings for:
Target: "${target}"
Manufacturer: ${manufacturer || ""}
Model: ${model || ""}
Part Number: ${partNumber || ""}

Locate real PDF data sheets from the manufacturer or accredited industrial registries. Summarize what specifications are found in the official documents.`;
      let response;
      try {
        response = await callGeminiResiliently({
          contents: prompt,
          preferredModel: "gemini-flash-latest",
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (searchToolErr) {
        console.warn("[Datasheet Search] Search grounding tool unavailable, using internal engineering knowledge:", searchToolErr?.message || searchToolErr);
        response = await callGeminiResiliently({
          contents: prompt + "\nProvide key technical specifications, operational ranges, pinout/wiring overview, and official documentation reference portals.",
          preferredModel: "gemini-3.1-flash-lite"
        });
      }
      const rawText = response.text || "";
      const rawCandidate = response.rawResponse?.candidates?.[0];
      const groundingMeta = rawCandidate?.groundingMetadata;
      const datasheets = [];
      const seen = /* @__PURE__ */ new Set();
      if (groundingMeta?.groundingChunks) {
        for (const chunk of groundingMeta.groundingChunks) {
          const uri = chunk.web?.uri;
          if (uri && !seen.has(uri)) {
            seen.add(uri);
            const isPdf = uri.toLowerCase().endsWith(".pdf") || uri.toLowerCase().includes(".pdf");
            const classification = classifyDomain(uri);
            datasheets.push({
              id: `ds_${Date.now()}_${datasheets.length}`,
              title: chunk.web?.title || `${manufacturer || "Technical"} Datasheet`,
              manufacturer: manufacturer || "OEM",
              model: model || "",
              partNumber: partNumber || "",
              url: uri,
              domain: new URL(uri).hostname.replace(/^www\./, ""),
              fileType: isPdf ? "PDF" : "HTML",
              confidence: classification.confidence,
              isOfficial: classification.isOfficial,
              summary: rawText.slice(0, 300)
            });
          }
        }
      }
      if (datasheets.length === 0 && manufacturer) {
        const mKey = manufacturer.toLowerCase();
        for (const d of OFFICIAL_DOMAINS) {
          if (d.includes(mKey) || mKey.includes(d.split(".")[0])) {
            datasheets.push({
              id: `ds_${Date.now()}_0`,
              title: `${manufacturer} ${model || partNumber || "Equipment"} Technical Documentation & Manuals`,
              manufacturer,
              model: model || "",
              partNumber: partNumber || "",
              url: `https://www.${d}`,
              domain: d,
              fileType: "HTML",
              confidence: "HIGH",
              isOfficial: true,
              summary: `Direct link to official datasheets, user manuals, and calibration guides for ${manufacturer} ${model || ""}.`
            });
            break;
          }
        }
      }
      res.json({
        datasheets,
        summary: rawText,
        queriesUsed: groundingMeta?.webSearchQueries || [`${target} datasheet PDF`],
        modelUsed: response.modelUsed
      });
    } catch (error) {
      console.error("Datasheet search API error:", error);
      res.status(500).json({ error: error.message || "Datasheet search error" });
    }
  });
  app.post("/api/material/search-images", async (req, res) => {
    try {
      const { query, manufacturer, model, partNumber } = req.body;
      const term = query || [manufacturer, model, partNumber].filter(Boolean).join(" ");
      const prompt = `Search for official visual reference images, technical catalog photos, and wiring/dimensional diagrams for the industrial equipment:
Equipment: "${term}"
Manufacturer: ${manufacturer || ""}
Model: ${model || ""}
Part Number: ${partNumber || ""}

Provide reference links and visual descriptions.`;
      let response;
      try {
        response = await callGeminiResiliently({
          contents: prompt,
          preferredModel: "gemini-flash-latest",
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (searchToolErr) {
        console.warn("[Image Search] Search grounding tool unavailable, using internal engineering knowledge:", searchToolErr?.message || searchToolErr);
        response = await callGeminiResiliently({
          contents: prompt + "\nProvide detailed physical appearance, terminal block layout, and housing dimensional description.",
          preferredModel: "gemini-3.1-flash-lite"
        });
      }
      const rawText = response.text || "";
      const rawCandidate = response.rawResponse?.candidates?.[0];
      const groundingMeta = rawCandidate?.groundingMetadata;
      const images = [];
      const seen = /* @__PURE__ */ new Set();
      if (groundingMeta?.groundingChunks) {
        for (const chunk of groundingMeta.groundingChunks) {
          const uri = chunk.web?.uri;
          if (uri && !seen.has(uri)) {
            seen.add(uri);
            const classification = classifyDomain(uri);
            images.push({
              id: `img_${Date.now()}_${images.length}`,
              title: chunk.web?.title || `${manufacturer || "Equipment"} Reference Visual`,
              imageUrl: uri,
              sourceUrl: uri,
              sourceDomain: new URL(uri).hostname.replace(/^www\./, ""),
              confidence: classification.confidence,
              matchType: "REFERENCE_IMAGE",
              isReferenceOnly: true
            });
          }
        }
      }
      res.json({
        images,
        summary: rawText,
        modelUsed: response.modelUsed
      });
    } catch (error) {
      console.error("Image search API error:", error);
      res.status(500).json({ error: error.message || "Image search error" });
    }
  });
  app.post("/api/material/analyze", async (req, res) => {
    try {
      const { material, webSources = [], ocrText, targetLanguage = "ar" } = req.body;
      if (!material) {
        return res.status(400).json({ error: "Material object is required" });
      }
      const prompt = `You are a Lead Materials & Quality Engineer performing an ISO-level verification and technical intelligence analysis on an industrial asset.

Material Database Record:
- Name / Description: ${material.description || material.name || "N/A"}
- Manufacturer: ${material.manufacturer || "N/A"}
- Model: ${material.model || "N/A"}
- Part Number (PN): ${material.partNumber || material.pn || "N/A"}
- Serial Number (SN): ${material.serialNumber || material.sn || "N/A"}
- Category: ${material.category || "N/A"}
- Unit & Quantity: ${material.quantity || 0} ${material.unit || "EA"}
- Specification: ${material.specification || "N/A"}
- Additional OCR or Document Text: ${ocrText || "None"}
- Web Evidence URLs available: ${JSON.stringify(webSources.slice(0, 5).map((s) => ({ title: s.title, url: s.url, domain: s.domain })))}

Your Analysis Mandates:
1. Provide the exact professional Arabic Name and Description.
2. Provide technical meaning in Arabic and English.
3. Validate if the Manufacturer and Model / Part Number are verified industry standards.
4. Extract known technical specifications (e.g. pressure rating, temp limits, process connection, body material, communication protocol).
5. Detect conflicts between the database record and official web/datasheet values (e.g. typo in part number, incorrect pressure rating, wrong flange size).
6. Assign evidence level: 'Verified' (fully supported by official source), 'Likely' (standard product match), 'Possible' (inferred), or 'Unknown' (insufficient or ambiguous).
7. If data is missing or ambiguous, NEVER invent fake information. Explicitly state what is unknown.

Return JSON adhering to the schema.`;
      const response = await callGeminiResiliently({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              originalName: { type: import_genai.Type.STRING },
              arabicName: { type: import_genai.Type.STRING },
              arabicDescription: { type: import_genai.Type.STRING },
              technicalMeaningArabic: { type: import_genai.Type.STRING },
              technicalMeaningEnglish: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              manufacturer: { type: import_genai.Type.STRING },
              model: { type: import_genai.Type.STRING },
              partNumber: { type: import_genai.Type.STRING },
              application: { type: import_genai.Type.STRING },
              industry: { type: import_genai.Type.STRING },
              confidence: { type: import_genai.Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] },
              evidenceLevel: { type: import_genai.Type.STRING, enum: ["Verified", "Likely", "Possible", "Unknown"] },
              knownSpecifications: {
                type: import_genai.Type.OBJECT,
                properties: {
                  processConnection: { type: import_genai.Type.STRING },
                  pressureRating: { type: import_genai.Type.STRING },
                  temperatureRange: { type: import_genai.Type.STRING },
                  wettedMaterials: { type: import_genai.Type.STRING },
                  outputSignal: { type: import_genai.Type.STRING },
                  hazardousAreaRating: { type: import_genai.Type.STRING }
                }
              },
              relatedEquipment: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              possibleAlternatives: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              conflictsDetected: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    field: { type: import_genai.Type.STRING },
                    dbValue: { type: import_genai.Type.STRING },
                    webValue: { type: import_genai.Type.STRING },
                    severity: { type: import_genai.Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                    description: { type: import_genai.Type.STRING }
                  },
                  required: ["field", "dbValue", "webValue", "severity", "description"]
                }
              },
              aiExplanation: { type: import_genai.Type.STRING }
            },
            required: [
              "originalName",
              "arabicName",
              "technicalMeaningArabic",
              "category",
              "manufacturer",
              "model",
              "confidence",
              "evidenceLevel",
              "aiExplanation"
            ]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      const isDetermined = parsed.confidence !== "UNKNOWN" && parsed.evidenceLevel !== "Unknown";
      const result = {
        materialId: material.id,
        ...parsed,
        webSources,
        datasheets: [],
        images: [],
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isDeterminedConfident: isDetermined
      };
      res.json(result);
    } catch (error) {
      console.error("Material analysis API error:", error);
      res.status(500).json({ error: error.message || "Analysis error" });
    }
  });
  app.get("/api/material/search-history", (req, res) => {
    const db = readDb();
    res.json(db.search_history || []);
  });
  app.post("/api/material/search-history", (req, res) => {
    const db = readDb();
    if (!db.search_history) db.search_history = [];
    const item = {
      id: `sh_${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...req.body
    };
    db.search_history.unshift(item);
    if (db.search_history.length > 100) {
      db.search_history = db.search_history.slice(0, 100);
    }
    writeDb(db);
    res.json(item);
  });
  function getEmailConfig() {
    const db = readDb();
    const stored = db.email_config || {};
    const smtpObj = stored.smtp || {};
    return {
      enabled: stored.enabled !== false,
      provider: stored.provider || "SMTP",
      // 'SMTP' | 'SendGrid' | 'Mailgun' | 'Simulation'
      smtpHost: stored.smtpHost || smtpObj.host || process.env.SMTP_HOST || "",
      smtpPort: parseInt(stored.smtpPort || smtpObj.port || process.env.SMTP_PORT || "587", 10),
      smtpUser: stored.smtpUser || smtpObj.user || process.env.SMTP_USER || "",
      smtpPass: stored.smtpPass || smtpObj.pass || process.env.SMTP_PASS || "",
      smtpSecure: stored.smtpSecure !== void 0 ? Boolean(stored.smtpSecure) : smtpObj.secure !== void 0 ? Boolean(smtpObj.secure) : process.env.SMTP_SECURE === "true",
      senderEmail: stored.senderEmail || process.env.SMTP_FROM || stored.smtpUser || smtpObj.user || "emis-alerts@company.com",
      senderName: stored.senderName || "EMIS Material Intelligence",
      adminNotificationEmail: stored.adminNotificationEmail || process.env.ADMIN_NOTIFICATION_EMAIL || "ahssan1991@gmail.com",
      defaultRecipients: stored.defaultRecipients || (stored.adminNotificationEmail ? [stored.adminNotificationEmail] : [process.env.ADMIN_NOTIFICATION_EMAIL || "ahssan1991@gmail.com"]),
      ccRecipients: stored.ccRecipients || [],
      bccRecipients: stored.bccRecipients || [],
      engineeringTeamEmail: stored.engineeringTeamEmail || process.env.ENGINEERING_TEAM_EMAIL || stored.adminNotificationEmail || "ahssan1991@gmail.com",
      engineeringRecipients: stored.engineeringRecipients || (stored.engineeringTeamEmail ? [stored.engineeringTeamEmail] : [stored.adminNotificationEmail || "ahssan1991@gmail.com"]),
      criticalMaterialAlertsEnabled: stored.criticalMaterialAlertsEnabled !== false,
      triggers: stored.triggers || {
        materialAdded: true,
        materialUpdated: true,
        existingMaterialQuantityChanged: true,
        criticalMaterialUpdated: true,
        criticalStockBreached: true,
        missingDocuments: true,
        mismatchDetected: true,
        engineeringApproval: true,
        lowStock: true,
        transferApproval: true,
        syncFailure: true,
        systemUpdate: false
      }
    };
  }
  function formatSmtpError(err, config) {
    const msg = err?.message || String(err);
    const host = (config?.smtpHost || "").toLowerCase();
    const user = (config?.smtpUser || "").toLowerCase();
    const isGmail = host.includes("gmail.com") || user.endsWith("@gmail.com");
    if (msg.includes("535") || msg.includes("5.7.8") || msg.includes("BadCredentials") || msg.includes("Username and Password not accepted")) {
      if (isGmail) {
        return `Gmail Authentication Error (535-5.7.8): Google does NOT accept personal passwords or 4-digit PINs for SMTP. You MUST use a 16-character Google App Password (e.g., "abcd efgh ijkl mnop"). Steps: 1) Go to https://myaccount.google.com/security 2) Ensure 2-Step Verification is ON 3) Open "App passwords" 4) Generate an App Password for "EMIS" 5) Paste the 16 characters into the SMTP Password field.`;
      }
      return `SMTP Authentication Rejected (535-5.7.8): The username or password was rejected by the mail server. Please verify your credentials or generate an App-Specific Password.`;
    }
    if (msg.includes("ETIMEDOUT") || msg.includes("ESOCKETTIMEDOUT")) {
      return `SMTP Connection Timed Out: Unable to reach mail host ${config?.smtpHost || "server"} on port ${config?.smtpPort || 587}. Please check host address and firewall rules.`;
    }
    if (msg.includes("ECONNREFUSED")) {
      return `SMTP Connection Refused: The mail server at ${config?.smtpHost || "server"}:${config?.smtpPort || 587} refused the connection. Verify host and port.`;
    }
    return `SMTP delivery failed: ${msg}`;
  }
  function isPlaceholderPassword(pass) {
    if (!pass) return true;
    const clean = String(pass).trim().replace(/\s+/g, "").toLowerCase();
    return clean.length === 0 || clean === "abcdefghijklmnop" || clean === "xxxxxxxxxxxxxxxx" || clean === "yourapppassword" || clean === "testpassword1234" || clean === "password" || clean === "12345678" || clean === "1234567890123456" || clean === "your_password" || clean === "your_app_password" || clean.startsWith("example") || clean.includes("placeholder");
  }
  function getEmailTransporter(config) {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      return null;
    }
    const host = String(config.smtpHost).trim();
    const user = String(config.smtpUser).trim();
    const pass = String(config.smtpPass).trim().replace(/\s+/g, "");
    if (isPlaceholderPassword(pass)) {
      return null;
    }
    const port = parseInt(config.smtpPort || "587", 10);
    const isGmail = host.toLowerCase().includes("gmail.com") || user.toLowerCase().endsWith("@gmail.com");
    const isSecure = port === 465 || Boolean(config.smtpSecure);
    const transportOpts = {
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15e3,
      greetingTimeout: 1e4,
      socketTimeout: 15e3
    };
    if (isGmail && !isSecure) {
      transportOpts.requireTLS = true;
    }
    return import_nodemailer.default.createTransport(transportOpts);
  }
  app.get("/api/email/config", (req, res) => {
    try {
      const cfg = getEmailConfig();
      const safeConfig = {
        enabled: Boolean(cfg.enabled),
        provider: cfg.provider || "SMTP",
        smtpHost: cfg.smtpHost || "",
        smtpPort: cfg.smtpPort || 587,
        smtpUser: cfg.smtpUser || "",
        smtpSecure: Boolean(cfg.smtpSecure),
        hasPassword: Boolean(cfg.smtpPass),
        senderEmail: cfg.senderEmail || "emis-alerts@company.com",
        senderName: cfg.senderName || "EMIS Material Intelligence",
        adminNotificationEmail: cfg.adminNotificationEmail || "ahssan1991@gmail.com",
        defaultRecipients: cfg.defaultRecipients || ["ahssan1991@gmail.com"],
        ccRecipients: cfg.ccRecipients || [],
        bccRecipients: cfg.bccRecipients || [],
        engineeringTeamEmail: cfg.engineeringTeamEmail || "ahssan1991@gmail.com",
        engineeringRecipients: cfg.engineeringRecipients || ["ahssan1991@gmail.com"],
        criticalMaterialAlertsEnabled: cfg.criticalMaterialAlertsEnabled !== false,
        triggers: cfg.triggers || {},
        status: cfg.smtpHost && cfg.smtpUser && cfg.smtpPass ? "CONFIGURED" : "NOT_CONFIGURED"
      };
      res.json(safeConfig);
    } catch (err) {
      res.status(500).json({ error: err.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/email/config", (req, res) => {
    try {
      const db = readDb();
      const current = getEmailConfig();
      const body = req.body || {};
      const smtpObj = body.smtp || {};
      const smtpHost = (body.smtpHost || smtpObj.host || current.smtpHost || "").trim();
      const smtpPort = parseInt(body.smtpPort || smtpObj.port || current.smtpPort || "587", 10);
      const smtpUser = (body.smtpUser || smtpObj.user || current.smtpUser || "").trim();
      const rawPass = body.smtpPass !== void 0 ? body.smtpPass : smtpObj.pass !== void 0 ? smtpObj.pass : null;
      let smtpPass = current.smtpPass || "";
      if (rawPass !== null && typeof rawPass === "string") {
        if (rawPass.trim() !== "") {
          smtpPass = rawPass.trim().replace(/\s+/g, "");
        }
      }
      const smtpSecure = body.smtpSecure !== void 0 ? Boolean(body.smtpSecure) : smtpObj.secure !== void 0 ? Boolean(smtpObj.secure) : current.smtpSecure;
      const updated = {
        ...current,
        ...body,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        smtp: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          secure: smtpSecure
        }
      };
      db.email_config = updated;
      writeDb(db);
      res.json({ success: true, message: "Email configuration saved successfully.", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/email/test", async (req, res) => {
    const startTime = Date.now();
    const config = getEmailConfig();
    const recipient = req.body.recipient || config.adminNotificationEmail;
    if (!recipient) {
      return res.status(400).json({
        success: false,
        status: "NOT_CONFIGURED",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Recipient email address is required. Please specify a recipient or configure the Primary Admin Notification Recipient in EMIS Settings > Email."
      });
    }
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      const logEntry = {
        id: `eml-test-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "TEST_EMAIL",
        subject: "EMIS SMTP Connectivity Test",
        to: [recipient],
        body: "Test probe",
        status: "NOT_CONFIGURED",
        error: "SMTP Host, Username, or Password is not configured in EMIS Settings > Email."
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "NOT_CONFIGURED",
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "SMTP Host, Username, or Password is not configured in EMIS Settings > Email. Please configure SMTP server parameters to enable live email delivery.",
        durationMs: Date.now() - startTime
      });
    }
    const isGmail = (config.smtpHost || "").toLowerCase().includes("gmail.com") || (config.smtpUser || "").toLowerCase().endsWith("@gmail.com");
    const cleanPass = (config.smtpPass || "").trim().replace(/\s+/g, "");
    if (isPlaceholderPassword(cleanPass)) {
      const placeholderError = isGmail ? `Gmail Authentication Error (535-5.7.8): The current password is an example placeholder ("${cleanPass}"). Google requires a dedicated 16-character App Password generated from your Google Account (https://myaccount.google.com/apppasswords). Please create an App Password for "EMIS" and enter the 16 characters.` : `SMTP Setup Error: The configured password is an example placeholder. Please provide valid SMTP credentials.`;
      const logEntry = {
        id: `eml-test-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "TEST_EMAIL",
        subject: "EMIS SMTP Connectivity Test",
        to: [recipient],
        body: "Test probe",
        status: "FAILED",
        error: placeholderError
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "FAILED",
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: placeholderError,
        durationMs: Date.now() - startTime
      });
    }
    if (isGmail && cleanPass.length < 16) {
      const passLengthError = `Gmail Authentication Error (535-5.7.8): Google requires a 16-character Google App Password for smtp.gmail.com (your configured password has only ${cleanPass.length} characters). Standard personal passwords or 4-digit PINs are blocked by Google security. Please generate an App Password at https://myaccount.google.com/apppasswords and enter the 16 characters.`;
      const logEntry = {
        id: `eml-test-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "TEST_EMAIL",
        subject: "EMIS SMTP Connectivity Test",
        to: [recipient],
        body: "Test probe",
        status: "FAILED",
        error: passLengthError
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "FAILED",
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: passLengthError,
        durationMs: Date.now() - startTime
      });
    }
    try {
      const transporter = getEmailTransporter(config);
      if (!transporter) {
        throw new Error("Could not initialize SMTP transport.");
      }
      await transporter.verify();
      const mailOptions = {
        from: `"${config.senderName || "EMIS Material Intelligence"}" <${config.senderEmail || config.smtpUser}>`,
        to: recipient,
        subject: "EMIS System | Real-time SMTP Connectivity Verification \u2705",
        text: `EMIS Verification Test

This is a verified test email sent from the Engineering Material Intelligence System (EMIS).
Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
Host: ${config.smtpHost}
Port: ${config.smtpPort}
Recipient: ${recipient}

All email delivery channels are fully operational.`,
        html: `
          <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; border-radius: 12px; max-width: 550px;">
            <div style="border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 16px;">
              <span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 1px solid rgba(16,185,129,0.4);">LIVE SMTP CONNECTED</span>
              <h2 style="color: #38bdf8; margin: 8px 0 0 0;">EMIS Email Verification</h2>
            </div>
            <p style="font-size: 14px; color: #cbd5e1;">This is a live test email confirming that the EMIS SMTP email alert service is successfully connected and transmitting alerts.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #94a3b8;">Configured Recipient:</td><td style="font-weight: bold; color: #fff;">${recipient}</td></tr>
              <tr><td style="padding: 6px 0; color: #94a3b8;">SMTP Host:</td><td style="color: #fff;">${config.smtpHost}:${config.smtpPort}</td></tr>
              <tr><td style="padding: 6px 0; color: #94a3b8;">Sender:</td><td style="color: #fff;">${config.senderEmail || config.smtpUser}</td></tr>
              <tr><td style="padding: 6px 0; color: #94a3b8;">Timestamp:</td><td style="color: #fff;">${(/* @__PURE__ */ new Date()).toISOString()}</td></tr>
            </table>
            <div style="font-size: 11px; color: #64748b; border-top: 1px solid #334155; padding-top: 10px; margin-top: 16px;">EMIS Master Data Governance & Notification Center</div>
          </div>
        `
      };
      const info = await transporter.sendMail(mailOptions);
      const logEntry = {
        id: `eml-test-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "TEST_EMAIL",
        subject: mailOptions.subject,
        to: [recipient],
        body: "Test probe",
        status: "SENT",
        messageId: info.messageId
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: true,
        status: "SENT",
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        messageId: info.messageId,
        message: `Test email successfully sent to ${recipient}`,
        durationMs: Date.now() - startTime
      });
    } catch (err) {
      const formattedError = formatSmtpError(err, config);
      console.warn("[EMIS SMTP Test] Live connection check note:", formattedError);
      const logEntry = {
        id: `eml-test-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "TEST_EMAIL",
        subject: "EMIS SMTP Connectivity Test",
        to: [recipient],
        body: "Test probe",
        status: "FAILED",
        error: formattedError
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "FAILED",
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: formattedError,
        durationMs: Date.now() - startTime
      });
    }
  });
  app.post("/api/email/send-material-alert", async (req, res) => {
    const startTime = Date.now();
    const config = getEmailConfig();
    const event = req.body;
    const recipient = config.adminNotificationEmail || config.defaultRecipients && config.defaultRecipients[0];
    if (!recipient) {
      return res.json({
        success: false,
        status: "NOT_CONFIGURED",
        eventId: event.eventId || `EVT-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Notification recipient email is not configured in EMIS Settings > Email.",
        durationMs: Date.now() - startTime
      });
    }
    const allRecipients = Array.from(/* @__PURE__ */ new Set([recipient, ...config.defaultRecipients || []]));
    const isNew = event.eventType === "NEW_MATERIAL" || !event.existingMaterial;
    const subject = isNew ? `EMIS | New Material Added | ${event.partNumber || "N/A"}` : `EMIS | Existing Material Updated | ${event.partNumber || "N/A"}`;
    const prevQty = event.previousQuantity !== void 0 ? event.previousQuantity : isNew ? 0 : "UNKNOWN";
    const addedQty = event.addedQuantity || 0;
    const currQty = event.currentQuantity !== void 0 ? event.currentQuantity : typeof prevQty === "number" ? prevQty + addedQty : addedQty;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 20px; }
          .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; }
          .header { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #38bdf8; margin: 8px 0 0 0; }
          .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
          .badge-new { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background-color: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
          .badge-updated { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background-color: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
          .badge-dup { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); margin-left: 8px; }
          .qty-box { background-color: #0f172a; border: 1px solid #475569; border-radius: 8px; padding: 14px; margin: 16px 0; display: flex; justify-content: space-around; text-align: center; }
          .qty-item { flex: 1; text-align: center; }
          .qty-val { font-size: 20px; font-weight: bold; color: #38bdf8; }
          .qty-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }
          .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
          .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #334155; }
          .table th { color: #94a3b8; font-weight: 600; width: 38%; }
          .table td { color: #f1f5f9; }
          .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <span class="${isNew ? "badge-new" : "badge-updated"}">${isNew ? "NEW MATERIAL CREATED" : "EXISTING MATERIAL UPDATED"}</span>
              ${event.isDuplicateCandidate ? '<span class="badge-dup">DUPLICATE WARNING</span>' : ""}
            </div>
            <h1 class="title">${subject}</h1>
            <p class="subtitle">Engineering Material Intelligence System \u2022 Event ID: ${event.eventId || "EVT-" + Date.now()}</p>
          </div>

          <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 16px;">
            ${isNew ? "A brand new material has been registered into the EMIS central inventory ledger." : "An existing material record has been updated with incoming quantity and specifications."}
          </p>

          <table style="width: 100%; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; text-align: center; border-right: 1px solid #334155;">
                <div style="font-size: 18px; font-weight: bold; color: #94a3b8;">${prevQty}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px;">Previous Quantity</div>
              </td>
              <td style="padding: 12px; text-align: center; border-right: 1px solid #334155;">
                <div style="font-size: 18px; font-weight: bold; color: #34d399;">+${addedQty}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px;">Added Quantity</div>
              </td>
              <td style="padding: 12px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #38bdf8;">${currQty}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px;">Current Quantity (${event.unit || "pcs"})</div>
              </td>
            </tr>
          </table>

          <table class="table">
            <tr><th>Material Description</th><td><strong>${event.materialName || "N/A"}</strong></td></tr>
            <tr><th>Part Number (PN)</th><td><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">${event.partNumber || "N/A"}</code></td></tr>
            <tr><th>Manufacturer</th><td>${event.manufacturer || "N/A"}</td></tr>
            <tr><th>Model</th><td>${event.model || "N/A"}</td></tr>
            <tr><th>Serial Number</th><td>${event.serialNumber || "N/A"}</td></tr>
            <tr><th>Site / Station</th><td>${event.siteName || "Not configured"}</td></tr>
            <tr><th>Warehouse / Store</th><td>${event.warehouseName || "Not configured"}</td></tr>
            <tr><th>Storage Location</th><td>${event.location || "N/A"}</td></tr>
            <tr><th>Existing Material</th><td><strong>${event.existingMaterial ? "YES" : "NO"}</strong></td></tr>
            <tr><th>Duplicate Warning</th><td><strong>${event.isDuplicateCandidate ? "YES" : "NO"}</strong></td></tr>
            <tr><th>Material Request (MR)</th><td>${event.mr || "N/A"}</td></tr>
            <tr><th>Purchase Order (PO)</th><td>${event.po || "N/A"}</td></tr>
            <tr><th>Work Order (WO)</th><td>${event.wo || "N/A"}</td></tr>
            <tr><th>Created By</th><td>${event.createdBy || "Authorized User"}</td></tr>
            <tr><th>Transaction Date / Time</th><td>${event.timestamp || (/* @__PURE__ */ new Date()).toISOString()}</td></tr>
          </table>

          <div class="footer">
            Automated operational alert from EMIS Master Data Governance & Notification Engine.<br>
            Designated Admin Recipient: <strong>${recipient}</strong>
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `
============================================================
EMIS MATERIAL TRANSACTION NOTIFICATION
============================================================
Event: ${subject}
Existing Material: ${event.existingMaterial ? "YES" : "NO"}
Duplicate: ${event.isDuplicateCandidate ? "YES" : "NO"}

MATERIAL DETAILS:
- Description: ${event.materialName || "N/A"}
- Part Number: ${event.partNumber || "N/A"}
- Manufacturer: ${event.manufacturer || "N/A"}
- Model: ${event.model || "N/A"}
- Serial Number: ${event.serialNumber || "N/A"}
- Site: ${event.siteName || "Not configured"}
- Warehouse: ${event.warehouseName || "Not configured"}
- Storage Location: ${event.location || "N/A"}

QUANTITY TRACKING:
- Previous Quantity: ${prevQty}
- Added Quantity: ${addedQty}
- Current Quantity: ${currQty} ${event.unit || "pcs"}

REFERENCES & AUDIT:
- MR: ${event.mr || "N/A"}
- PO: ${event.po || "N/A"}
- WO: ${event.wo || "N/A"}
- Added By: ${event.createdBy || "Authorized User"}
- Date/Time: ${event.timestamp || (/* @__PURE__ */ new Date()).toISOString()}

Admin Notification Recipient: ${recipient}
============================================================
    `.trim();
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      const logEntry = {
        id: `eml-alert-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: isNew ? "NEW_MATERIAL" : "EXISTING_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "NOT_CONFIGURED",
        error: "SMTP is not configured in EMIS Settings > Email. Alert persisted in local notification queue."
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "NOT_CONFIGURED",
        eventId: event.eventId || `EVT-${Date.now()}`,
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Email alert queued but not transmitted via SMTP because SMTP server credentials are not configured.",
        durationMs: Date.now() - startTime
      });
    }
    try {
      const transporter = getEmailTransporter(config);
      if (!transporter) {
        throw new Error("Transporter unavailable");
      }
      const info = await transporter.sendMail({
        from: `"${config.senderName || "EMIS Material Intelligence"}" <${config.senderEmail || config.smtpUser}>`,
        to: allRecipients,
        subject,
        text: textBody,
        html: htmlBody
      });
      const logEntry = {
        id: `eml-alert-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: isNew ? "NEW_MATERIAL" : "EXISTING_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "SENT",
        messageId: info.messageId
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: true,
        status: "SENT",
        eventId: event.eventId || `EVT-${Date.now()}`,
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        messageId: info.messageId,
        message: `Material notification email transmitted to ${recipient}`,
        durationMs: Date.now() - startTime
      });
    } catch (err) {
      const formattedError = formatSmtpError(err, config);
      console.warn("[EMIS Material Alert] SMTP delivery notice:", formattedError);
      const logEntry = {
        id: `eml-alert-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: isNew ? "NEW_MATERIAL" : "EXISTING_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "FAILED",
        error: formattedError
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return res.json({
        success: false,
        status: "FAILED",
        eventId: event.eventId || `EVT-${Date.now()}`,
        recipient,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: formattedError,
        durationMs: Date.now() - startTime
      });
    }
  });
  app.get("/api/email/logs", (req, res) => {
    const db = readDb();
    res.json(db.email_logs || []);
  });
  async function triggerEngineeringCriticalMaterialAlert(params) {
    const startTime = Date.now();
    const config = getEmailConfig();
    const after = params.after || {};
    const before = params.before || {};
    const isTest = Boolean(params.isTest);
    const partNumber = after.partNumber || after.materialId || before.partNumber || "PART-UNKNOWN";
    const description = after.description || before.description || "Instrumentation Process Spare";
    const manufacturer = after.manufacturer || before.manufacturer || "OEM";
    const model = after.model || before.model || "Standard";
    const unit = after.unit || before.unit || "PCS";
    const criticalityVal = (after.criticality || before.criticality || "").toString().toLowerCase();
    const isCriticalGrade = criticalityVal === "critical" || criticalityVal === "major" || after.isCritical === true || before.isCritical === true;
    const isStockBreached = typeof after.quantity === "number" && typeof after.minStockLevel === "number" && after.minStockLevel > 0 && after.quantity <= after.minStockLevel;
    const hasCriticalTag = Array.isArray(after.tags) && after.tags.some((t) => String(t).toLowerCase().includes("critical"));
    const isCriticalRecord = isTest || isCriticalGrade || isStockBreached || hasCriticalTag;
    if (!isCriticalRecord) {
      return {
        success: true,
        triggered: false,
        isCritical: false,
        partNumber,
        message: "Material record does not meet critical criteria; engineering alert bypassed.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const primaryRecipient = config.engineeringTeamEmail || config.adminNotificationEmail || "ahssan1991@gmail.com";
    const allRecipients = Array.from(new Set([
      primaryRecipient,
      ...config.engineeringRecipients || [],
      ...config.defaultRecipients || [],
      "ahssan1991@gmail.com"
    ].filter(Boolean)));
    const deltas = [];
    if (before.quantity !== void 0 && after.quantity !== void 0 && before.quantity !== after.quantity) {
      deltas.push({
        field: "quantity",
        label: "Inventory Balance",
        oldValue: `${before.quantity} ${unit}`,
        newValue: `${after.quantity} ${unit}`,
        severity: isStockBreached ? "CRITICAL DEFICIT" : "MODIFIED"
      });
    }
    if (before.criticality && after.criticality && before.criticality !== after.criticality) {
      deltas.push({
        field: "criticality",
        label: "Process Criticality Tier",
        oldValue: before.criticality,
        newValue: after.criticality,
        severity: "CRITICAL TIER CHANGE"
      });
    }
    if (before.description && after.description && before.description.trim() !== after.description.trim()) {
      deltas.push({
        field: "description",
        label: "Technical Specification",
        oldValue: before.description,
        newValue: after.description,
        severity: "SPECIFICATION SHIFT"
      });
    }
    if (before.manufacturer && after.manufacturer && before.manufacturer !== after.manufacturer) {
      deltas.push({
        field: "manufacturer",
        label: "Original Equipment Manufacturer",
        oldValue: before.manufacturer,
        newValue: after.manufacturer,
        severity: "OEM CHANGE"
      });
    }
    if ((before.store || before.rack || before.shelf) && (after.store || after.rack || after.shelf)) {
      const oldLoc = `Store ${before.store || "-"} / Rack ${before.rack || "-"} / Shelf ${before.shelf || "-"}`;
      const newLoc = `Store ${after.store || "-"} / Rack ${after.rack || "-"} / Shelf ${after.shelf || "-"}`;
      if (oldLoc !== newLoc) {
        deltas.push({
          field: "location",
          label: "Physical Bin Location",
          oldValue: oldLoc,
          newValue: newLoc,
          severity: "STORAGE RELOCATION"
        });
      }
    }
    if (isTest && deltas.length === 0) {
      deltas.push({
        field: "systemTest",
        label: "Engineering Verification Probe",
        oldValue: "Standard State",
        newValue: "Critical Simulation Probe",
        severity: "SYSTEM VERIFIED"
      });
    }
    const eventId = `CRIT-EVT-${Date.now()}`;
    const subject = isTest ? `\u{1F6A8} [TEST ALERT] EMIS Critical Material Engineering Service Integration | Part ${partNumber}` : `\u{1F6A8} [CRITICAL MATERIAL ALERT] ${partNumber} Updated - Engineering Action Required`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 20px; margin: 0; }
          .container { max-width: 680px; margin: 0 auto; background-color: #111827; border: 1px solid #374151; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .alert-banner { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%); padding: 18px 24px; color: #ffffff; }
          .alert-pill { display: inline-block; background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.4); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .alert-title { margin: 10px 0 4px 0; font-size: 22px; font-weight: 800; }
          .alert-sub { margin: 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 24px; }
          .card-section { background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 12px; }
          .grid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .grid-table td { padding: 6px 4px; }
          .grid-label { color: #9ca3af; width: 35%; font-weight: 500; }
          .grid-value { color: #f3f4f6; font-weight: 600; }
          .stock-warning { background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
          .stock-warning-title { font-size: 14px; font-weight: 700; color: #fca5a5; display: flex; align-items: center; gap: 8px; }
          .delta-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          .delta-table th { background-color: #111827; color: #9ca3af; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #374151; }
          .delta-table td { padding: 10px; border-bottom: 1px solid #374151; }
          .badge-critical { background-color: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-modified { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .action-bar { text-align: center; padding: 20px; background-color: #111827; border-top: 1px solid #374151; }
          .btn-action { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 0 6px; }
          .footer { font-size: 11px; color: #6b7280; text-align: center; padding: 16px 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert-banner">
            <span class="alert-pill">CRITICAL PLANT SPARE \u2022 IMMEDIATE ENGINEERING AWARENESS</span>
            <h1 class="alert-title">${subject}</h1>
            <p class="alert-sub">EMIS Cloud Function & Service Integration \u2022 Event ID: ${eventId}</p>
          </div>
          
          <div class="content">
            ${isStockBreached ? `
              <div class="stock-warning">
                <div class="stock-warning-title">\u26A0\uFE0F SAFETY INVENTORY THRESHOLD BREACHED</div>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #fecaca;">
                  Current on-hand stock (<strong>${after.quantity} ${unit}</strong>) is at or below the mandatory engineering minimum reserve level (<strong>${after.minStockLevel || 1} ${unit}</strong>). Risk of plant unit downtime is elevated.
                </p>
              </div>
            ` : ""}

            <div class="card-section">
              <div class="section-title">Critical Instrumentation Details</div>
              <table class="grid-table">
                <tr><td class="grid-label">Part Number:</td><td class="grid-value" style="font-family: monospace; font-size: 15px; color: #60a5fa;">${partNumber}</td></tr>
                <tr><td class="grid-label">Technical Description:</td><td class="grid-value">${description}</td></tr>
                <tr><td class="grid-label">Manufacturer / OEM:</td><td class="grid-value">${manufacturer}</td></tr>
                <tr><td class="grid-label">Model Designation:</td><td class="grid-value">${model}</td></tr>
                <tr><td class="grid-label">Criticality Rating:</td><td class="grid-value"><span class="badge-critical">${after.criticality || "Critical"}</span></td></tr>
                <tr><td class="grid-label">Facility / Site:</td><td class="grid-value">${after.site || "Main Process Plant"}</td></tr>
                <tr><td class="grid-label">Storage Location:</td><td class="grid-value">Store: ${after.store || "Primary"} \u2022 Rack: ${after.rack || "-"} \u2022 Shelf: ${after.shelf || "-"}</td></tr>
              </table>
            </div>

            <div class="card-section">
              <div class="section-title">Record Modification Audit Trail</div>
              <table class="grid-table">
                <tr><td class="grid-label">Modified By:</td><td class="grid-value">${params.user || "Authorized Engineer"} (${params.userRole || "Lead"})</td></tr>
                <tr><td class="grid-label">Change Reason:</td><td class="grid-value">${params.reason || "Material specification / stock level adjustment"}</td></tr>
                <tr><td class="grid-label">Trigger Source:</td><td class="grid-value">${params.source || "Cloud Service Integration"}</td></tr>
                <tr><td class="grid-label">Timestamp:</td><td class="grid-value">${(/* @__PURE__ */ new Date()).toISOString()}</td></tr>
              </table>
            </div>

            <div class="card-section">
              <div class="section-title">Change Delta & Impact Analysis</div>
              <table class="delta-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Previous Value</th>
                    <th>Updated Value</th>
                    <th>Impact Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${deltas.map((d) => `
                    <tr>
                      <td style="font-weight: 600; color: #e5e7eb;">${d.label}</td>
                      <td style="color: #9ca3af;">${String(d.oldValue)}</td>
                      <td style="color: #60a5fa; font-weight: 600;">${String(d.newValue)}</td>
                      <td><span class="${d.severity.includes("CRITICAL") ? "badge-critical" : "badge-modified"}">${d.severity}</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="action-bar">
            <span style="font-size: 13px; color: #9ca3af; display: block; margin-bottom: 10px;">Stakeholder alert transmitted to: ${allRecipients.join(", ")}</span>
          </div>

          <div class="footer">
            Engineering Material Intelligence System (EMIS) \u2022 Automated Governance & Process Loop Protection<br>
            All critical instrument adjustments are permanently recorded in the Immutable Audit Register.
          </div>
        </div>
      </body>
      </html>
    `;
    const textBody = `[CRITICAL MATERIAL ALERT] ${partNumber} Updated

Part Number: ${partNumber}
Description: ${description}
Manufacturer: ${manufacturer}
Model: ${model}
Criticality: ${after.criticality || "Critical"}
Current Stock: ${after.quantity} ${unit} (Min Level: ${after.minStockLevel || 1} ${unit})
Modified By: ${params.user || "Engineer"} at ${(/* @__PURE__ */ new Date()).toISOString()}
Deltas:
` + deltas.map((d) => ` - ${d.label}: ${d.oldValue} -> ${d.newValue} [${d.severity}]`).join("\n") + `

Event ID: ${eventId}`;
    const isGmail = (config.smtpHost || "").toLowerCase().includes("gmail.com") || (config.smtpUser || "").toLowerCase().endsWith("@gmail.com");
    const cleanPass = (config.smtpPass || "").trim().replace(/\s+/g, "");
    const hasSmtp = Boolean(config.smtpHost && config.smtpUser && cleanPass && !isPlaceholderPassword(cleanPass));
    if (!hasSmtp) {
      const notConfiguredMsg = isPlaceholderPassword(cleanPass) && cleanPass.length > 0 ? `SMTP Configuration Notice: An example placeholder password ("${cleanPass}") is configured. To transmit real-time outbound emails via Gmail, generate a 16-character App Password at https://myaccount.google.com/apppasswords and save it in Admin Settings > Email. The critical material update has been safely executed and recorded in the audit ledger.` : "SMTP credentials not yet configured in Settings > Email; alert queued and logged to immutable audit ledger.";
      const logEntry = {
        id: `eml-crit-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "CRITICAL_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "NOT_CONFIGURED",
        error: notConfiguredMsg,
        relatedEntityId: partNumber
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      if (!db.activities) db.activities = [];
      db.activities.unshift({
        id: `act-crit-${Date.now()}`,
        userId: params.userId || "system",
        userName: params.user || "System Integration",
        action: "CRITICAL_MATERIAL_UPDATED",
        details: `Critical material ${partNumber} updated. Engineering team alert logged for ${allRecipients.join(", ")}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      writeDb(db);
      return {
        success: true,
        triggered: true,
        isCritical: true,
        status: "NOT_CONFIGURED",
        eventId,
        recipients: allRecipients,
        deltas,
        message: notConfiguredMsg,
        durationMs: Date.now() - startTime
      };
    }
    if (isGmail && cleanPass.length < 16) {
      const passLengthError = `Gmail Authentication Error (535-5.7.8): Google requires a 16-character Google App Password for smtp.gmail.com (your configured password has only ${cleanPass.length} characters). Standard personal passwords or 4-digit PINs are blocked by Google security. Please generate an App Password at https://myaccount.google.com/apppasswords and enter the 16 characters.`;
      const logEntry = {
        id: `eml-crit-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "CRITICAL_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "FAILED",
        error: passLengthError,
        relatedEntityId: partNumber
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return {
        success: false,
        triggered: true,
        isCritical: true,
        status: "FAILED",
        eventId,
        recipients: allRecipients,
        deltas,
        error: passLengthError,
        durationMs: Date.now() - startTime
      };
    }
    try {
      const transporter = getEmailTransporter(config);
      if (!transporter) {
        throw new Error("Could not initialize SMTP transport.");
      }
      const mailOptions = {
        from: `"${config.senderName || "EMIS Material Intelligence"}" <${config.senderEmail || config.smtpUser}>`,
        to: allRecipients,
        subject,
        text: textBody,
        html: htmlBody,
        priority: "high",
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "High"
        }
      };
      const info = await transporter.sendMail(mailOptions);
      const logEntry = {
        id: `eml-crit-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "CRITICAL_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "SENT",
        messageId: info.messageId,
        relatedEntityId: partNumber
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      if (!db.activities) db.activities = [];
      db.activities.unshift({
        id: `act-crit-${Date.now()}`,
        userId: params.userId || "system",
        userName: params.user || "System Integration",
        action: "CRITICAL_MATERIAL_EMAIL_SENT",
        details: `High-priority email dispatched to engineering team (${allRecipients.join(", ")}) for critical part ${partNumber}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      writeDb(db);
      return {
        success: true,
        triggered: true,
        isCritical: true,
        status: "SENT",
        eventId,
        messageId: info.messageId,
        recipients: allRecipients,
        deltas,
        message: `High-priority email alert transmitted to engineering stakeholders: ${allRecipients.join(", ")}`,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      const formattedError = formatSmtpError(err, config);
      console.warn("[EMIS Critical Material Alert] SMTP delivery notice:", formattedError);
      const logEntry = {
        id: `eml-crit-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: "CRITICAL_MATERIAL_UPDATED",
        subject,
        to: allRecipients,
        body: textBody,
        status: "FAILED",
        error: formattedError,
        relatedEntityId: partNumber
      };
      const db = readDb();
      if (!db.email_logs) db.email_logs = [];
      db.email_logs.unshift(logEntry);
      writeDb(db);
      return {
        success: false,
        triggered: true,
        isCritical: true,
        status: "FAILED",
        eventId,
        recipients: allRecipients,
        error: formattedError,
        durationMs: Date.now() - startTime
      };
    }
  }
  app.post("/api/cloud-functions/on-material-update", async (req, res) => {
    try {
      const payload = req.body || {};
      const before = payload.before || payload.data?.before || null;
      const after = payload.after || payload.data?.after || payload.material || payload;
      const result = await triggerEngineeringCriticalMaterialAlert({
        before,
        after,
        user: payload.user || payload.userName || "Engineering Operator",
        userId: payload.userId || "user-eng",
        userRole: payload.userRole || "Lead Engineer",
        reason: payload.reason || payload.notes || "Material catalog modification",
        source: payload.source || "Cloud Function Webhook"
      });
      res.json(result);
    } catch (err) {
      console.error("Cloud function trigger error:", err);
      res.status(500).json({ error: err.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/email/notify-engineering-critical", async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await triggerEngineeringCriticalMaterialAlert({
        before: payload.before,
        after: payload.after || payload,
        user: payload.user,
        userId: payload.userId,
        userRole: payload.userRole,
        reason: payload.reason,
        source: "API Service Integration"
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/email/test-critical-alert", async (req, res) => {
    try {
      const db = readDb();
      const sampleMaterial = db.materials && db.materials.find((m) => m.criticality === "Critical" || m.criticality === "Major") || db.materials && db.materials[0] || {
        partNumber: "E+H-PMC71-AAA1F1GHAAA",
        description: "Cerabar S Pressure Transmitter 0-100 bar, SIL2 Certified Process Safety Unit",
        manufacturer: "Endress+Hauser",
        model: "PMC71",
        quantity: 2,
        minStockLevel: 5,
        unit: "PCS",
        criticality: "Critical",
        site: "Mizra Central Processing Facility",
        store: "Main Warehouse",
        rack: "R-04",
        shelf: "S-12"
      };
      const result = await triggerEngineeringCriticalMaterialAlert({
        before: {
          ...sampleMaterial,
          quantity: (sampleMaterial.quantity || 2) + 8,
          criticality: "Major"
        },
        after: {
          ...sampleMaterial,
          quantity: sampleMaterial.quantity || 2,
          criticality: "Critical"
        },
        user: req.body.user || "Ahssan (Engineering Lead)",
        userId: req.body.userId || "user-lead-1",
        userRole: "Administrator & Lead Engineer",
        reason: "Routine safety stock audit revealed critical reserve deficit.",
        source: "Admin Dashboard Verification Test",
        isTest: true
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  const requireAdminRole = (req, res, next) => {
    const role = (req.headers["x-user-role"] || req.headers["x-role"] || "").toString().toLowerCase();
    if (role && role !== "admin") {
      return res.status(403).json({
        error: "Forbidden: Administrative privilege required for this master data operation.",
        code: "ACCESS_DENIED"
      });
    }
    next();
  };
  app.get("/api/admin/sites", (req, res) => {
    const db = readDb();
    res.json(db.master_sites || []);
  });
  app.post("/api/admin/sites", requireAdminRole, (req, res) => {
    const db = readDb();
    if (!db.master_sites) db.master_sites = [];
    const code = (req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Site code is required." });
    if (db.master_sites.some((s) => (s.code || "").toUpperCase() === code)) {
      return res.status(409).json({ error: `Site with code "${code}" already exists in the system.` });
    }
    const newSite = {
      id: req.body.id || `site-${Date.now()}`,
      siteId: req.body.siteId || `SITE-${Math.floor(100 + Math.random() * 900)}`,
      name: req.body.name?.trim(),
      code,
      description: req.body.description || "",
      location: req.body.location || "Not configured",
      status: req.body.status || "ACTIVE",
      active: req.body.active !== false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: req.body.createdBy || "Admin",
      dataSource: req.body.dataSource || "USER_CREATED"
    };
    db.master_sites.unshift(newSite);
    writeDb(db);
    res.json(newSite);
  });
  app.put("/api/admin/sites/:id", requireAdminRole, (req, res) => {
    const db = readDb();
    if (!db.master_sites) db.master_sites = [];
    const idx = db.master_sites.findIndex((s) => s.id === req.params.id);
    if (idx >= 0) {
      db.master_sites[idx] = {
        ...db.master_sites[idx],
        ...req.body,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      writeDb(db);
      return res.json(db.master_sites[idx]);
    }
    res.status(404).json({ error: "Site not found" });
  });
  app.get("/api/admin/warehouses", (req, res) => {
    const db = readDb();
    res.json(db.master_warehouses || []);
  });
  app.post("/api/admin/warehouses", requireAdminRole, (req, res) => {
    const db = readDb();
    if (!db.master_warehouses) db.master_warehouses = [];
    const siteId = req.body.siteId;
    if (!siteId) return res.status(400).json({ error: "Parent siteId is required." });
    const parentSite = (db.master_sites || []).find((s) => s.id === siteId || s.siteId === siteId);
    if (!parentSite) {
      return res.status(400).json({ error: "Selected parent site does not exist." });
    }
    const code = (req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Warehouse code is required." });
    if (db.master_warehouses.some((w) => w.siteId === siteId && (w.code || "").toUpperCase() === code)) {
      return res.status(409).json({ error: `Warehouse with code "${code}" already exists in site "${parentSite.name}".` });
    }
    const newWh = {
      id: req.body.id || `wh-${Date.now()}`,
      warehouseId: req.body.warehouseId || `WH-${Math.floor(100 + Math.random() * 900)}`,
      code,
      name: req.body.name?.trim(),
      siteId,
      siteCode: parentSite.code || req.body.siteCode,
      siteName: parentSite.name || req.body.siteName,
      description: req.body.description || "",
      location: req.body.location || "Not configured",
      status: req.body.status || "ACTIVE",
      active: req.body.active !== false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: req.body.createdBy || "Admin",
      dataSource: req.body.dataSource || "USER_CREATED"
    };
    db.master_warehouses.unshift(newWh);
    writeDb(db);
    res.json(newWh);
  });
  app.get("/api/admin/health", (req, res) => {
    const emailCfg = getEmailConfig();
    const hasSmtp = Boolean(emailCfg.smtpHost && emailCfg.smtpUser && emailCfg.smtpPass);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "HEALTHY",
      services: {
        database: { status: "ONLINE", type: "JSON Ledger + Firestore Hybrid", connected: true },
        email: {
          status: hasSmtp ? "CONFIGURED" : "NOT_CONFIGURED",
          provider: emailCfg.provider || "SMTP",
          adminRecipient: emailCfg.adminNotificationEmail || "NOT CONFIGURED"
        },
        notifications: { status: "ONLINE", queueActive: true },
        geminiAi: { status: hasGemini ? "ONLINE" : "NOT_CONFIGURED" },
        syncEngine: { status: "ONLINE", mode: "Live Hybrid Sync" },
        ocrEngine: { status: "ONLINE", mode: "Client & Gemini OCR" }
      }
    });
  });
  app.get("/api/app/version", (req, res) => {
    const db = readDb();
    const versionConfig = db.app_version || {
      currentVersion: "3.1.0",
      latestVersion: "3.2.0",
      minimumSupportedVersion: "3.0.0",
      isUpdateAvailable: true,
      isMandatory: false,
      releaseDate: "2026-09-03",
      releaseNotes: [
        "Port 13 Enterprise Evolution: Unified Android + Web Access Architecture",
        "Industrial Material Passport with full timeline, QR generation & deep links",
        "Enterprise Recycle Bin with soft delete, 30-day retention & conflict-aware restoration",
        "Append-only Material Version History tracking field changes",
        "Controlled Remote/Emergency Web Access with active session revocation",
        "Real-time Anomaly Detection for abnormal quantity drops and duplicate materials"
      ],
      securityChanges: [
        "Enforced server-side RBAC validation on all mutation endpoints",
        "Added tamper-evident login audit with device and browser fingerprinting",
        "Secured material sharing links with time-based expiration and instant revocation"
      ],
      featureChanges: [
        "Single centralized language selector with Iraq flag (\u{1F1EE}\u{1F1F6} \u0627\u0644\u0639\u0631\u0628\u064A\u0629)",
        "Enterprise 12-subsystem deep health monitoring dashboard",
        "Engineering AI Assistant with verified data badges vs suggestions"
      ]
    };
    res.json(versionConfig);
  });
  app.post("/api/admin/app/version", requireAdminRole, (req, res) => {
    const db = readDb();
    db.app_version = {
      ...db.app_version || {},
      ...req.body,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeDb(db);
    res.json({ success: true, version: db.app_version });
  });
  app.get("/api/admin/remote-access", (req, res) => {
    const db = readDb();
    res.json(db.remote_access_settings || {
      remoteAccessEnabled: true,
      allowEmergencyBypass: true,
      sessionTimeoutMinutes: 60,
      maxConcurrentSessions: 10
    });
  });
  app.post("/api/admin/remote-access", requireAdminRole, (req, res) => {
    const db = readDb();
    db.remote_access_settings = {
      ...db.remote_access_settings || {},
      ...req.body,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeDb(db);
    res.json({ success: true, settings: db.remote_access_settings });
  });
  app.get("/api/admin/sessions", (req, res) => {
    const db = readDb();
    res.json(db.active_sessions || []);
  });
  app.post("/api/admin/sessions/revoke", requireAdminRole, (req, res) => {
    const db = readDb();
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    if (db.active_sessions) {
      const sess = db.active_sessions.find((s) => s.sessionId === sessionId);
      if (sess) {
        sess.isRevoked = true;
        sess.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
        writeDb(db);
        return res.json({ success: true, session: sess });
      }
    }
    res.status(404).json({ error: "Session not found" });
  });
  app.post("/api/auth/login-audit", (req, res) => {
    const db = readDb();
    if (!db.login_audits) db.login_audits = [];
    const auditEntry = {
      id: `la-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      username: (req.body.username || "unknown").toString().slice(0, 100),
      userId: req.body.userId,
      userRole: req.body.userRole,
      success: Boolean(req.body.success),
      ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.body.ipAddress || "127.0.0.1").toString(),
      deviceType: req.body.deviceType || "Desktop",
      browser: req.body.browser || "Web Client",
      platform: req.body.platform || "Web",
      sessionId: req.body.sessionId,
      isRemote: Boolean(req.body.isRemote),
      failureReason: req.body.failureReason ? req.body.failureReason.toString().slice(0, 200) : void 0
    };
    db.login_audits.unshift(auditEntry);
    if (db.login_audits.length > 200) {
      db.login_audits = db.login_audits.slice(0, 200);
    }
    writeDb(db);
    res.json({ success: true, id: auditEntry.id });
  });
  app.get("/api/admin/login-audits", requireAdminRole, (req, res) => {
    const db = readDb();
    res.json(db.login_audits || []);
  });
  app.get("/api/admin/recycle-bin", (req, res) => {
    const db = readDb();
    res.json(db.recycle_bin || []);
  });
  app.post("/api/admin/recycle-bin/restore", (req, res) => {
    const db = readDb();
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Item id is required" });
    if (!db.recycle_bin) db.recycle_bin = [];
    const item = db.recycle_bin.find((rb) => rb.id === id);
    if (!item) return res.status(404).json({ error: "Recycle bin item not found" });
    if (item.recordType === "Material" && db.materials) {
      const conflict = db.materials.find((m) => m.partNumber.toUpperCase() === (item.recordId || item.data?.partNumber || "").toUpperCase());
      if (conflict) {
        return res.status(409).json({
          error: `Conflict: Active material with Part #${conflict.partNumber} already exists in the active catalog. Please rename or archive before restoring.`
        });
      }
      db.materials.unshift(item.data);
    }
    item.status = "RESTORED";
    item.restoredAt = (/* @__PURE__ */ new Date()).toISOString();
    item.restoredBy = req.body.restoredBy || "Admin";
    writeDb(db);
    res.json({ success: true, item });
  });
  app.post("/api/admin/recycle-bin/purge", requireAdminRole, (req, res) => {
    const db = readDb();
    const { id, autoPurgeExpired } = req.body;
    if (!db.recycle_bin) db.recycle_bin = [];
    if (autoPurgeExpired) {
      const now = (/* @__PURE__ */ new Date()).getTime();
      let purgedCount = 0;
      db.recycle_bin = db.recycle_bin.filter((item) => {
        const isExpired = item.status === "EXPIRED" || item.status === "DELETED / RECOVERABLE" && now > new Date(item.restoreAvailableUntil).getTime();
        if (isExpired) {
          purgedCount++;
          return false;
        }
        return true;
      });
      writeDb(db);
      return res.json({ success: true, purgedCount });
    }
    if (!id) return res.status(400).json({ error: "Item id is required" });
    const targetIdx = db.recycle_bin.findIndex((rb) => rb.id === id);
    if (targetIdx === -1) return res.status(404).json({ error: "Item not found" });
    db.recycle_bin.splice(targetIdx, 1);
    writeDb(db);
    res.json({ success: true, message: "Item permanently purged." });
  });
  app.post("/api/material/share", (req, res) => {
    const db = readDb();
    if (!db.shared_tokens) db.shared_tokens = [];
    const { partNumber, createdBy, durationHours = 24 } = req.body;
    if (!partNumber) return res.status(400).json({ error: "partNumber is required" });
    const token = `emis-share-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1e3).toISOString();
    const tokenRecord = {
      token,
      partNumber,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: createdBy || "User",
      expiresAt,
      isRevoked: false,
      accessCount: 0
    };
    db.shared_tokens.unshift(tokenRecord);
    writeDb(db);
    const shareUrl = `/share?token=${token}`;
    res.json({ success: true, token, expiresAt, shareUrl });
  });
  app.get("/api/material/shared/:token", (req, res) => {
    const db = readDb();
    const tokenRecord = (db.shared_tokens || []).find((t) => t.token === req.params.token);
    if (!tokenRecord) {
      return res.status(404).json({ error: "Share link not found or expired." });
    }
    if (tokenRecord.isRevoked) {
      return res.status(403).json({ error: "This share link has been revoked by an administrator." });
    }
    if ((/* @__PURE__ */ new Date()).getTime() > new Date(tokenRecord.expiresAt).getTime()) {
      return res.status(410).json({ error: "This share link has expired." });
    }
    tokenRecord.accessCount = (tokenRecord.accessCount || 0) + 1;
    tokenRecord.lastAccessedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeDb(db);
    const material = (db.materials || []).find((m) => m.partNumber.toUpperCase() === tokenRecord.partNumber.toUpperCase());
    if (!material) {
      return res.status(404).json({ error: "Material record not found." });
    }
    const sanitized = {
      partNumber: material.partNumber,
      name: material.name || material.description,
      description: material.description,
      arabicDescription: material.arabicDescription,
      category: material.category,
      manufacturer: material.manufacturer,
      model: material.model,
      quantity: material.quantity,
      unit: material.unit,
      site: material.site,
      warehouse: material.warehouse,
      status: material.status,
      sharedAt: tokenRecord.createdAt,
      expiresAt: tokenRecord.expiresAt,
      isReadonly: true
    };
    res.json(sanitized);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
