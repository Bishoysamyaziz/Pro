'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getNexusGuideResponse } from '@/lib/ai.adapter';

interface Props {
  sessionId: string;
  expertId: string;
  clientId: string;
  messages: Array<{ userId: string; content: string; createdAt: any }>;
  onSessionEnd: () => void;
  isExpert: boolean;
}

const EXPERT_SUGGESTIONS = [
  'كيف يمكنني مساعدتك اليوم؟',
  'هل يمكنك توضيح المشكلة أكثر؟',
  'دعني أرى ما أستطيع فعله لمساعدتك',
  'هذه حالة شائعة، إليك الحل...',
];

export default function SessionCompanionBot({ sessionId, expertId, clientId, messages, onSessionEnd, isExpert }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [botMsg, setBotMsg] = useState('');
  const [summary, setSummary] = useState('');

  const generateSessionSummary = async () => {
    if (messages.length === 0) return;
    setThinking(true);
    const conversation = messages.slice(-10).map(m =>
      `${m.userId === expertId ? 'الخبير' : 'العميل'}: ${m.content}`
    ).join('\n');

    const prompt = `لخّص هذه الجلسة الاستشارية في 3 نقاط رئيسية وخطوات عملية للمتابعة:\n\n${conversation}`;
    try {
      const result = await getNexusGuideResponse(prompt);
      setSummary(result || '');
      // Save to Firestore
      await addDoc(collection(db, 'session_notes'), {
        sessionId, summary: result, createdAt: serverTimestamp(), generatedBy: 'ai'
      });
    } finally { setThinking(false); }
  };

  const askAboutMessage = async (lastMsg: string) => {
    if (!lastMsg || thinking) return;
    setThinking(true);
    const prompt = isExpert
      ? `أنت مساعد خبير. العميل قال: "${lastMsg}". اقترح رداً مهنياً مختصراً.`
      : `أنت مساعد. الخبير قال: "${lastMsg}". ساعدني على فهم ما قاله بشكل مبسط.`;
    try {
      const result = await getNexusGuideResponse(prompt);
      setBotMsg(result || '');
    } finally { setThinking(false); }
  };

  const lastMessage = messages[messages.length - 1]?.content;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-[#00f2ff] to-[#0080ff] flex items-center justify-center shadow-lg shadow-[#00f2ff]/30 hover:scale-110 transition-transform">
        <span className="text-black text-lg">🤖</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 w-80 bg-[#0d0d0d] border border-[#00f2ff]/20 rounded-2xl shadow-2xl shadow-[#00f2ff]/10">
      <div className="flex items-center justify-between p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00f2ff]/20 flex items-center justify-center">
            <span>🤖</span>
          </div>
          <span className="text-white text-sm font-bold">المرافق الذكي</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="p-3 space-y-3 max-h-60 overflow-y-auto">
        {isExpert && (
          <div>
            <p className="text-gray-400 text-xs mb-2">اقتراحات للرد:</p>
            <div className="flex flex-wrap gap-1">
              {EXPERT_SUGGESTIONS.map((s, i) => (
                <button key={i} className="text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 px-2 py-1 rounded-lg transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {botMsg && (
          <div className="bg-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#00f2ff] text-xs font-bold mb-1">💡 اقتراح</p>
            <p className="text-gray-300 text-xs leading-relaxed">{botMsg}</p>
          </div>
        )}

        {summary && (
          <div className="bg-[#0a2a2a] border border-[#00f2ff]/20 rounded-xl p-3">
            <p className="text-[#00f2ff] text-xs font-bold mb-2">📋 ملخص الجلسة</p>
            <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#1e1e1e] space-y-2">
        {lastMessage && (
          <button onClick={() => askAboutMessage(lastMessage)} disabled={thinking}
            className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 text-xs py-2 rounded-xl transition-colors disabled:opacity-50">
            {thinking ? '⏳ جاري التفكير...' : '💭 اقترح رداً على آخر رسالة'}
          </button>
        )}
        <button onClick={generateSessionSummary} disabled={thinking || messages.length === 0}
          className="w-full bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] text-xs py-2 rounded-xl transition-colors disabled:opacity-50">
          📋 لخّص الجلسة
        </button>
        <button onClick={onSessionEnd}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-2 rounded-xl transition-colors">
          🔴 إنهاء الجلسة
        </button>
      </div>
    </div>
  );
}
