import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Send, 
  MessageSquare, 
  Cpu, 
  Trash2, 
  Sparkles, 
  CornerDownLeft, 
  Database,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Material, User, ChatMessage } from '../types';
import { dbService } from '../services/dbService';
import { apiChatWithAi } from '../services/apiClient';

interface AiCopilotViewProps {
  materials: Material[];
  currentUser: User;
}

export default function AiCopilotView({ materials, currentUser }: AiCopilotViewProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested Prompts
  const suggestedPrompts = [
    { text: "اشرح لي نظام EMIS بالكامل ودورة حياة المواد من الاستلام إلى الصرف؟", label: "دليل ودورة عمل النظام" },
    { text: "كيف أقوم بإجراء جرد دوري (Cycle Count) وتسوية الفروقات الميدانية؟", label: "دليل الجرد الميداني" },
    { text: "كيف استخدم استوديو طباعة ملصقات الباركود والرفوف (Barcode Studio)؟", label: "دليل طباعة الباركود" },
    { text: "كيف يعمل مركز أتمتة إعادة الطلب وإنشاء أوامر الشراء (Reorder Hub)؟", label: "دليل أتمتة المشتريات" },
    { text: "ما هي المواد المتوفرة في المخزن والتابعة لشركة Rosemount؟", label: "البحث عن Rosemount" },
    { text: "هل يمكنك تلخيص حالة المخزون الحالي وأي مواد أوشكت على النفاد؟", label: "ملخص مستويات المخزون" }
  ];

  // Load chat history from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('emis_global_copilot_chat');
    if (cached) {
      try {
        setChatMessages(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached copilot chat", e);
      }
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Save chat helper
  const saveChat = (msgs: ChatMessage[]) => {
    setChatMessages(msgs);
    dbService.safeSetItem('emis_global_copilot_chat', JSON.stringify(msgs));
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    setChatError(null);
    const userText = textToSend.trim();
    setChatInputValue('');

    const newMsg: ChatMessage = {
      role: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...chatMessages, newMsg];
    saveChat(updatedHistory);
    setIsChatLoading(true);

    try {
      // Compile the entire materials database summary for Gemini context
      const materialsSummary = materials.map((m, index) => {
        return `${index + 1}. Part: ${m.partNumber} | Manufacturer: ${m.manufacturer} | Model: ${m.model} | Desc: ${m.description} | Qty: ${m.quantity} ${m.unit} | Location: Store ${m.store}, Rack ${m.rack}, Shelf ${m.shelf} | Notes: ${m.notes || 'None'}`;
      }).join('\n');

      const systemInstruction = `You are the chief AI Engineering Assistant & System Tutor for EMIS (Engineering Material & Inspection System).
You serve as both a Senior Instrumentation & Control Engineer and the complete Interactive System Guide/Bot for users.

=== LIVE REGISTERED MATERIALS IN EMIS ===
${materialsSummary}

=== COMPREHENSIVE EMIS SYSTEM ARCHITECTURE & USER MANUAL ===
You have full knowledge of all modules and operational workflows inside EMIS:

1. COMMAND CENTER & DASHBOARD:
- Provides real-time overview of inventory metrics: total parts, critical shortages, pending inspections, active sites, and recent transaction history.
- Quick Operational Commands Bar for 1-click navigation to core tools.

2. MATERIALS LEDGER & PASSPORT:
- Complete catalog of parts with Part Numbers (PN), Serial Numbers (SN), Manufacturer, Model, Quantity, and Storage Coordinates (Store, Rack, Shelf).
- Digital Material Passport: Generates verifiable QR code passport allowing technicians to scan and inspect material specs in the field or share a secure web link.

3. BARCODE & SHELF LABEL STUDIO (Barcode Studio):
- Generates high-density Code 128 (Subset B) industrial barcodes and 2D QR codes.
- Supports direct thermal printing for Zebra, Dymo, TSC, and A4 multi-label sheets.
- Prints Part Number, Description, Manufacturer, and exact Warehouse/Shelf location coordinates.

4. CYCLE COUNTING & PHYSICAL AUDIT (Cycle Count):
- Manages field inventory counting sessions (Full audit or filtered by Warehouse/Rack).
- Barcode scanner assistance for rapid physical counting.
- Auto-calculates count variances and discrepancy percentages.
- Generates official signed Inventory Reconciliation Certificates with 1-click ledger balance update.

5. AUTOMATED REORDER & REQUISITIONS (Reorder Hub):
- Real-time detection of items below Safety Stock / Min Level or zero balance.
- Computes Economic Order Quantity (EOQ) and suggested order amounts.
- 1-click generation of formal Purchase Requisitions (PR) with export and print preview.

6. ENTERPRISE OPERATIONS & MOVEMENTS:
- Receiving (GRN): Goods receipt against POs with batch numbers and vendor tags.
- Issuance (GIS): Dispatches parts to Maintenance Work Orders (WO) or plant tags.
- Internal Transfers: Multi-warehouse site-to-site transfer tracking.
- Stock Ledger: Immutable chronological movement log of all inputs and outputs.

7. MRF, PO, WO & QUALITY INSPECTION:
- Incoming QA/QC inspection workflow with Pass/Fail/Deviation sign-off.
- Tracks Mill Test Reports (MTR), Certificates of Conformity (CoC), and material test certificates.

8. TRACEABILITY & VERIFICATION:
- End-to-end lifecycle audit trail linking materials to equipment tags and drawings.

9. EQUIPMENT REGISTER:
- Plant machinery and instrument tag register (Transmitters, Valves, Pumps, Analyzers).

10. DATA QUALITY & RECYCLE BIN:
- Audits records for missing specifications or duplicate part numbers.
- Two-stage soft deletion with instantaneous restore protection.

OPERATIONAL BEHAVIOR:
- Respond in the language of the user (Arabic or English).
- When asked how to perform an action or workflow in the software, provide clear, numbered, step-by-step instructions.
- When asked about registered parts, query your live materials ledger accurately.
- Maintain a helpful, respectful, and authoritative engineering tone.`;

      const resData = await apiChatWithAi(
        userText,
        updatedHistory.slice(0, -1),
        systemInstruction,
        materials
      );
      
      const assistantMsg: ChatMessage = {
        role: 'model',
        text: resData.text,
        timestamp: new Date().toISOString()
      };

      saveChat([...updatedHistory, assistantMsg]);
    } catch (err: any) {
      console.error("Global Co-Pilot Chat Error:", err);
      setChatError("عذراً، فشل الاتصال بخادم الذكاء الاصطناعي. يرجى التحقق من اتصال الشبكة والمحاولة مرة أخرى.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem('emis_global_copilot_chat');
    setChatMessages([]);
    setChatError(null);
  };

  return (
    <div className="space-y-6" id="ai-copilot-workspace">
      {/* View Header */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-600 animate-pulse shrink-0" /> AI Co-Pilot Operating Center
          </h2>
          <p className="text-xs text-industrial-500 mt-1">
            Access the global intelligent instrumentation assistant. Ask questions directly about any component, inventory levels, or technical specifications.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">
            Core Connection Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Quick Insights / Recommendations */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono flex items-center gap-2">
              <Cpu className="h-4 w-4 text-brand-600" /> Co-Pilot Capabilities
            </h3>
            
            <div className="space-y-3.5 text-xs text-industrial-600 leading-normal font-sans">
              <p>مساعد الذكاء الاصطناعي مبرمج لخدمة غرف التحكم والمخازن الصناعية.</p>
              
              <div className="p-3 bg-industrial-50 rounded-xl border border-industrial-100 space-y-2">
                <p className="font-bold text-[10px] text-industrial-500 font-mono tracking-wider uppercase">Live Database Sync</p>
                <p className="text-[11px] text-industrial-500">
                  تم تلقيم المساعد ببيانات {materials.length} مادة وقطعة غيار مسجلة في النظام لمعرفتها وتتبعها بالاسم والموقع فوراً.
                </p>
              </div>

              <div className="p-3 bg-brand-50/30 rounded-xl border border-brand-100 space-y-2">
                <p className="font-bold text-[10px] text-brand-700 font-mono tracking-wider uppercase">Technical Expert</p>
                <p className="text-[11px] text-brand-600">
                  مؤهل لتقديم الاستشارات حول توافق الأجهزة ومواصفات الإشارات (HART, 4-20mA, Modbus) واقتراح البدائل المصنعية.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Clear Action */}
          {chatMessages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="w-full py-3 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              <span>مسح سجل المحادثة بالكامل / Reset Chat</span>
            </button>
          )}
        </div>

        {/* Right Column: Chat Workspace */}
        <div className="lg:col-span-3 flex flex-col h-[70vh] bg-white rounded-2xl border border-industrial-200 shadow-sm overflow-hidden relative">
          
          {/* Chat Panel Header */}
          <div className="bg-industrial-50/50 p-4 border-b border-industrial-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-brand-100 text-brand-600 rounded-lg">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-industrial-800">قناة المحادثة العامة / Global Assistant Terminal</h3>
                <p className="text-[10px] text-industrial-400">Ask about models, restock alert levels, store positions, or specifications</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-industrial-50/20" id="global-chat-frame">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
                <div className="p-4 bg-brand-50 text-brand-500 rounded-full animate-pulse">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="max-w-md space-y-2">
                  <p className="font-bold text-sm text-industrial-800">أهلاً بك في نظام المساعد الهندسي الذكي</p>
                  <p className="text-xs text-industrial-500 leading-relaxed">
                    يسعدني إجابتك عن أي تفاصيل تتعلق بالقطع المسجلة، مستويات المخزون، أو اقتراح بدائل هندسية مطابقة. اختر أحد الأسئلة المقترحة بالأسفل أو اكتب استفسارك مباشرة:
                  </p>
                </div>

                {/* Suggested Prompts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full pt-2">
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p.text)}
                      className="text-right p-3 bg-white hover:bg-brand-50/40 border border-industrial-150 hover:border-brand-200 rounded-xl transition-all cursor-pointer text-xs group flex flex-col justify-between"
                    >
                      <span className="font-semibold text-brand-700 text-[10px] uppercase font-mono tracking-wide">{p.label}</span>
                      <span className="text-industrial-600 mt-1.5 flex items-start justify-between gap-2 leading-relaxed">
                        <span>{p.text}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-industrial-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs border ${
                      msg.role === 'user' 
                        ? 'bg-industrial-850 border-industrial-900 text-white rounded-tr-none' 
                        : 'bg-white border-industrial-150 text-industrial-800 rounded-tl-none'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1.5 opacity-65 font-mono text-[9px] uppercase tracking-wider">
                        {msg.role === 'user' ? (
                          <span>ENGINEER (YOU)</span>
                        ) : (
                          <span className="text-brand-600 font-bold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> EMIS CO-PILOT
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                      <span className="text-[9px] text-industrial-400 mt-2 block text-right font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Loading bubble */}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-industrial-150 rounded-2xl rounded-tl-none p-4 flex flex-col gap-2 shadow-xs max-w-[200px]">
                  <span className="text-[9px] font-mono text-brand-600 uppercase tracking-wider font-bold animate-pulse">Analyzing ledger...</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Error message */}
            {chatError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex gap-2.5">
                <Trash2 className="h-4.5 w-4.5 shrink-0 text-red-500" />
                <p>{chatError}</p>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Bar */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInputValue); }} className="p-4 bg-white border-t border-industrial-150 flex gap-3 shrink-0">
            <input
              type="text"
              value={chatInputValue}
              onChange={(e) => setChatInputValue(e.target.value)}
              placeholder="اكتب استفسارك هنا عن أي مادة فنية بالكامل... (مثال: أين تقع قطع Rosemount؟)"
              className="flex-1 bg-industrial-50 border border-industrial-200 text-xs px-4 py-3 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 transition-all font-sans"
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={!chatInputValue.trim() || isChatLoading}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-brand-950/10"
            >
              <span>إرسال</span>
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
