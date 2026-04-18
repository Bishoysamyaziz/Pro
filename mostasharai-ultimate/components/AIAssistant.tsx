'use client';

import { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner, FaMinus } from 'react-icons/fa';
import { getNexusGuideResponse } from '@/lib/ai.adapter';
import { useTheme } from '@/context/ThemeContext';

interface Msg { role: 'user' | 'bot'; text: string; }

const SUGGESTIONS = [
  'كيف أحجز استشارة؟',
  'ما هي عملة NEX؟',
  'كيف أشحن محفظتي؟',
  'How do I book a session?',
];

export default function AIAssistant() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'مرحباً! أنا دليل مستشاري 🤖\nكيف يمكنني مساعدتك اليوم؟\n\nHello! I\'m Mostasharai Guide. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user' as const, text };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const newHistory = [...history, { role: 'user', parts: [{ text }] }];
      const reply = await getNexusGuideResponse(text, history);
      const botMsg = { role: 'bot' as const, text: reply || 'عذراً، لم أفهم. حاول مجدداً.' };
      setMsgs(p => [...p, botMsg]);
      setHistory([...newHistory, { role: 'model', parts: [{ text: reply }] }]);
    } catch {
      setMsgs(p => [...p, { role: 'bot', text: '⚠️ الخدمة غير متاحة حالياً. حاول لاحقاً.' }]);
    } finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-24 left-4 lg:bottom-8 lg:left-8 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 glow"
      style={{ background: 'var(--color-accent)' }}>
      <FaRobot className="w-6 h-6 text-black" />
    </button>
  );

  return (
    <div className="fixed bottom-24 left-4 lg:bottom-8 lg:left-8 z-40 w-80 sm:w-96 rounded-3xl border shadow-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: 'var(--color-accent)' }}>
        <FaRobot className="w-6 h-6 text-black" />
        <div className="flex-1">
          <p className="font-black text-black text-sm">دليل مستشاري</p>
          <p className="text-black/70 text-xs">Mostasharai Guide • مساعد ذكي</p>
        </div>
        <button onClick={() => setMinimized(!minimized)} className="text-black/70 hover:text-black p-1">
          <FaMinus className="w-3 h-3" />
        </button>
        <button onClick={() => setOpen(false)} className="text-black/70 hover:text-black p-1">
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="h-72 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap`}
                  style={m.role === 'user'
                    ? { background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: '4px 18px 18px 18px' }
                    : { background: 'var(--color-accent)', color: '#000', borderRadius: '18px 4px 18px 18px' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
                  style={{ background: 'var(--color-accent)', borderRadius: '18px 4px 18px 18px' }}>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {msgs.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', background: 'var(--color-accent-glow)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="اكتب سؤالك... / Ask me anything"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all"
              style={{ background: 'var(--color-accent)', color: '#000' }}>
              {loading ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaPaperPlane className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
