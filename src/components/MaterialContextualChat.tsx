import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { Material, User } from '../types';
import { dbService } from '../services/dbService';

interface MaterialContextualChatProps {
  material: Material;
  currentUser: User;
  triggerToast: (type: 'success' | 'error', message: string) => void;
}

const MaterialContextualChat: React.FC<MaterialContextualChatProps> = ({
  material,
  currentUser,
  triggerToast
}) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load chat history when the component mounts or the material changes
  useEffect(() => {
    setChatMessages(dbService.getChatHistory(material.partNumber));
  }, [material.partNumber]);

  // Scroll to bottom whenever messages list or loading state changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isChatLoading) return;

    const userMessageText = messageText.trim();

    const newMsg = {
      role: 'user' as const,
      text: userMessageText,
      timestamp: new Date().toISOString()
    };

    let currentHistory: any[] = [];
    setChatMessages((prev) => {
      currentHistory = [...prev, newMsg];
      dbService.saveChatHistory(material.partNumber, currentHistory);
      return currentHistory;
    });

    setIsChatLoading(true);

    try {
      const systemInstruction = `You are a highly professional, precise, and specialized "Instrumentation Engineer Assistant" (مساعد هندسي متخصص في أجهزة القياس والتحكم الصناعي).
You are assisting an engineer working on the EMIS system.

Here is the context of the Material the engineer is currently inspecting:
- Part Number (رقم الجزء): ${material.partNumber}
- Description (الوصف): ${material.description}
- Manufacturer (الشركة المصنعة): ${material.manufacturer}
- Model (الموديل): ${material.model}
- Quantity in Stock (الكمية المتوفرة): ${material.quantity} ${material.unit}
- Store Location (موقع التخزين): Store ${material.store}, Rack ${material.rack}, Shelf ${material.shelf}
- Notes (ملاحظات): ${material.notes || 'None'}
- Compatible Equipment Tags (المعدات المتوافقة): ${(material.compatibleEquipment || []).join(', ') || 'None'}
- OEM Verification Status (حالة التحقق من المصنع الأصلي): ${material.oemVerificationStatus || 'Pending'}
- Engineering Notes (الملاحظات الهندسية): ${material.engineeringNotes || 'None'}
${material.oemVerificationNotes ? `- OEM Verification Audit Notes (ملاحظات تدقيق المصنع): ${material.oemVerificationNotes}` : ''}

Your guidelines:
1. Always answer in the language the user is speaking (Arabic or English). If the user asks in Arabic, answer in professional Arabic.
2. Be technically precise, clear, and professional.
3. You must answer ONLY regarding this specific material [${material.partNumber}]. Do not talk about general warehouse inventory unless it directly relates to comparing with this part.
4. If asked about technical parameters, authenticity, or compatibility with other equipment, and the provided material context doesn't explicitly confirm it with 100% certainty, you MUST clearly warn the engineer that this is an AI estimate/assessment and not an official database confirmation, and strongly recommend reviewing the official OEM datasheet or contacting the OEM/warehouse supervisors.
5. Keep the tone helpful, engineering-focused, and completely objective. Avoid promotional language.`;

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageText,
          history: currentHistory.slice(0, -1),
          systemInstruction: systemInstruction
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI Engineering Assistant");
      }

      const resData = await response.json();

      const assistantMsg = {
        role: 'model' as const,
        text: resData.text,
        timestamp: new Date().toISOString()
      };

      setChatMessages((prev) => {
        const finalHistory = [...prev, assistantMsg];
        dbService.saveChatHistory(material.partNumber, finalHistory);
        return finalHistory;
      });
    } catch (err: any) {
      console.error(err);
      triggerToast('error', 'فشل إرسال الرسالة للمساعد الذكي، الرجاء التأكد من الاتصال.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputValue.trim()) return;
    const text = chatInputValue;
    setChatInputValue('');
    await sendMessage(text);
  };

  const handleClearChatHistory = () => {
    dbService.clearChatHistory(material.partNumber);
    setChatMessages([]);
    triggerToast('success', 'تم مسح سجل المحادثة لهذه المادة بنجاح.');
  };

  const suggestions = [
    "هل هذه الكمية كافية؟ / Is this quantity sufficient?",
    "أين تم استخدام هذه المادة سابقًا؟ / Where was this material used before?",
    "هل يوجد بديل مناسب؟ / Is there a suitable alternative?",
    "لخص كل المعلومات المتوفرة عن هذه المادة / Summarize all available info"
  ];

  return (
    <div className="flex flex-col h-[55vh] border border-industrial-150 rounded-xl overflow-hidden bg-industrial-50/30">
      {/* Chat Header */}
      <div className="bg-industrial-100 px-4 py-2.5 flex justify-between items-center border-b border-industrial-200 shrink-0">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-brand-600 animate-pulse" />
          <span className="font-bold text-xs text-industrial-800 flex items-center gap-1 font-sans">
            🤖 اسأل عن المادة {material.partNumber} / Ask about {material.partNumber}
          </span>
        </div>
        {chatMessages.length > 0 && (
          <button
            onClick={handleClearChatHistory}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
          >
            مسح السجل / Clear Chat
          </button>
        )}
      </div>

      {/* Chat Messages Frame */}
      <div ref={containerRef} className="flex-1 p-4 overflow-y-auto space-y-4 font-sans" id="chat-messages-container">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-3 bg-brand-50 text-brand-500 rounded-full">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-xs text-industrial-800 font-sans">مساعد المادة الذكي جاهز لمساعدتك</p>
              <p className="text-[11px] text-industrial-450 mt-1 max-w-sm font-sans leading-normal">
                اسأل عن التوافق، البدائل المتاحة، تفاصيل الموديل، أو أي استفسار تقني حول هذه المادة تحديداً.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 max-w-md w-full">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(s)}
                  disabled={isChatLoading}
                  className="text-center font-sans text-[10.5px] font-bold bg-white hover:bg-brand-50 border border-industrial-200 hover:border-brand-300 text-industrial-700 hover:text-brand-800 p-2 rounded-xl transition-all shadow-2xs cursor-pointer focus:outline-none"
                >
                  {s.split(" / ")[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-industrial-850 text-white rounded-br-none shadow-xs'
                  : 'bg-white border border-industrial-150 text-industrial-800 rounded-bl-none shadow-xs'
              }`}>
                <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                <span className="text-[9px] text-industrial-400 mt-1 block text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Loading state indicator */}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-industrial-150 rounded-xl p-3.5 flex items-center gap-1.5 shadow-xs">
              <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Small Quick Suggestions Bar above the input field */}
      {chatMessages.length > 0 && (
        <div className="px-3 py-2 bg-industrial-100/50 border-t border-industrial-150 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
          <span className="text-[10px] text-industrial-500 font-bold font-sans shrink-0">أسئلة مقترحة:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={isChatLoading}
              className="text-[10px] font-sans bg-white hover:bg-brand-50 hover:text-brand-700 border border-industrial-200 text-industrial-600 px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer disabled:opacity-50 font-medium"
            >
              {s.split(" / ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSendForm} className="p-3 bg-white border-t border-industrial-150 flex gap-2 shrink-0">
        <input
          type="text"
          value={chatInputValue}
          onChange={(e) => setChatInputValue(e.target.value)}
          placeholder={`اسأل المساعد الهندسي بخصوص ${material.partNumber}...`}
          className="flex-1 bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 font-sans"
          disabled={isChatLoading}
        />
        <button
          type="submit"
          disabled={!chatInputValue.trim() || isChatLoading}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Send className="h-4 w-4" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};

export default MaterialContextualChat;
