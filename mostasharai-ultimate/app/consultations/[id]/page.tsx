'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, addDoc,
  serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import FileUploader from '@/components/FileUploader';
import { analyzeAndSaveSession } from '@/lib/sessionAnalysis';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  FaVideo, FaComments, FaFile, FaRobot, FaClock, FaSpinner,
  FaPaperPlane, FaCheckDouble, FaTimesCircle, FaTimes, FaArrowRight
} from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';

const VideoCallRoom = dynamic(() => import('@/components/VideoCallRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  )
});

const TABS = [
  { id: 'video', label: 'فيديو', labelEn: 'Video', icon: FaVideo },
  { id: 'chat', label: 'دردشة', labelEn: 'Chat', icon: FaComments },
  { id: 'files', label: 'ملفات', labelEn: 'Files', icon: FaFile },
  { id: 'summary', label: 'ملخص AI', labelEn: 'Summary', icon: FaRobot },
];

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  createdAt: any;
}

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'chat' | 'files' | 'summary'>('video');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [analyzingSession, setAnalyzingSession] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session
  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, 'consultations', id), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setSession(data);
        if ((data as any).status === 'in_progress' && !timerActive) {
          setTimerActive(true);
        }
      }
      setLoading(false);
    });
  }, [id]);

  // Chat messages
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'consultations', id, 'chatMessages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [id]);

  // Timer
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sendMessage = async () => {
    if (!chatText.trim() || !user || !profile || sending) return;
    setSending(true);
    await addDoc(collection(db, 'consultations', id, 'chatMessages'), {
      content: chatText.trim(),
      senderId: user.uid,
      senderName: profile.displayName,
      senderPhoto: profile.photoURL || '',
      createdAt: serverTimestamp()
    });
    setChatText('');
    setSending(false);
  };

  const startSession = async () => {
    await updateDoc(doc(db, 'consultations', id), { status: 'in_progress', startedAt: serverTimestamp() });
    setTimerActive(true);
  };

  const endSession = async () => {
    if (!session || !user || !profile) return;
    if (!confirm('هل تريد إنهاء الجلسة وإنشاء الملخص؟')) return;

    const cost = Math.round((elapsed / 3600) * (session.cost || session.hourlyRate || 0));
    await updateDoc(doc(db, 'consultations', id), {
      status: 'completed', endedAt: serverTimestamp(),
      duration: Math.round(elapsed / 60), finalCost: cost
    });

    setTimerActive(false);
    setAnalyzingSession(true);
    setActiveTab('summary');

    const summary = await analyzeAndSaveSession(
      id,
      session.expertName || 'الخبير',
      session.clientName || 'العميل'
    );
    setAnalyzingSession(false);
  };

  const handleLeaveVideo = () => {
    if (session?.status === 'in_progress') endSession();
    else router.push('/sessions');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p style={{ color: 'var(--color-text)' }}>الجلسة غير موجودة</p>
      <Link href="/sessions" className="text-sm" style={{ color: 'var(--color-accent)' }}>العودة للجلسات</Link>
    </div>
  );

  const isExpert = session.expertId === user?.uid;
  const otherName = isExpert ? session.clientName : session.expertName;
  const isLive = session.status === 'in_progress';
  const isDone = session.status === 'completed';

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <Link href="/sessions" className="p-2 rounded-xl hover:opacity-70 transition-all" style={{ color: 'var(--color-text-2)' }}>
          <FaArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate" style={{ color: 'var(--color-text)' }}>{otherName || 'جلسة استشارية'}</p>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 live-pulse" />
                LIVE
              </span>
            )}
            {isDone && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                مكتملة
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
            {session.type === 'video' ? '📹 فيديو' : '💬 نصي'} • {session.duration || 60} دقيقة
          </p>
        </div>

        {/* Timer */}
        {(isLive || elapsed > 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono font-bold"
            style={{ background: isLive ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)', color: isLive ? '#ef4444' : 'var(--color-text-2)' }}>
            <FaClock className="w-3 h-3" />
            {formatTime(elapsed)}
          </div>
        )}

        {/* Action buttons */}
        {session.status === 'scheduled' && isExpert && (
          <button onClick={startSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-accent)' }}>
            <FaVideo className="w-4 h-4" /> ابدأ
          </button>
        )}
        {isLive && (
          <button onClick={endSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-all">
            <FaTimesCircle className="w-4 h-4" /> إنهاء
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Side by side */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left: Video (large) */}
          <div className="flex-1 flex flex-col" style={{ background: '#000' }}>
            {/* Tab bar for left panel */}
            <div className="flex border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
              {TABS.slice(0, 1).map(t => (
                <button key={t.id}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
            <VideoCallRoom sessionId={id} userId={user?.uid || ''} displayName={profile?.displayName || 'مستخدم'} onLeave={handleLeaveVideo} />
          </div>

          {/* Right: Chat + Files + Summary (w-96) */}
          <div className="w-96 flex flex-col border-r" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {/* Tab bar */}
            <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
              {TABS.slice(1).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap"
                  style={activeTab === t.id
                    ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                    : { borderColor: 'transparent', color: 'var(--color-text-2)' }}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && <ChatPanel messages={messages} user={user} profile={profile} chatText={chatText} setChatText={setChatText} sendMessage={sendMessage} sending={sending} chatBottomRef={chatBottomRef} disabled={!user} />}
              {activeTab === 'files' && <FileUploader sessionId={id} userId={user?.uid || ''} userName={profile?.displayName || ''} existingFiles={session.files || []} />}
              {activeTab === 'summary' && <SummaryPanel summary={session.summary} analyzing={analyzingSession} isDone={isDone} />}
            </div>
          </div>
        </div>

        {/* Mobile: Full screen tabs */}
        <div className="flex lg:hidden flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-1 justify-center"
                style={activeTab === t.id
                  ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                  : { borderColor: 'transparent', color: 'var(--color-text-2)' }}>
                <t.icon className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'video' && <VideoCallRoom sessionId={id} userId={user?.uid || ''} displayName={profile?.displayName || 'مستخدم'} onLeave={handleLeaveVideo} />}
            {activeTab === 'chat' && <ChatPanel messages={messages} user={user} profile={profile} chatText={chatText} setChatText={setChatText} sendMessage={sendMessage} sending={sending} chatBottomRef={chatBottomRef} disabled={!user} />}
            {activeTab === 'files' && <FileUploader sessionId={id} userId={user?.uid || ''} userName={profile?.displayName || ''} existingFiles={session.files || []} />}
            {activeTab === 'summary' && <SummaryPanel summary={session.summary} analyzing={analyzingSession} isDone={isDone} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat Panel ──────────────────────────────────────────────────────────────
function ChatPanel({ messages, user, profile, chatText, setChatText, sendMessage, sending, chatBottomRef, disabled }: any) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <FaComments className="w-8 h-8" style={{ color: 'var(--color-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>ابدأ المحادثة...</p>
          </div>
        )}
        {messages.map((m: ChatMessage) => {
          const isSelf = m.senderId === user?.uid;
          return (
            <div key={m.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isSelf && (
                m.senderPhoto ? (
                  <Image src={m.senderPhoto} alt={m.senderName} width={32} height={32} className="rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-black flex-shrink-0"
                    style={{ background: 'var(--color-accent)' }}>
                    {m.senderName?.[0]}
                  </div>
                )
              )}
              <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isSelf && <p className="text-xs font-bold" style={{ color: 'var(--color-text-2)' }}>{m.senderName}</p>}
                <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                  style={isSelf
                    ? { background: 'var(--color-accent)', color: '#000', borderRadius: '18px 4px 18px 18px' }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: '4px 18px 18px 18px' }}>
                  {m.content}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                  {m.createdAt?.toDate ? format(m.createdAt.toDate(), 'HH:mm') : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>
      {!disabled && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-2">
            <input value={chatText} onChange={e => setChatText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="اكتب رسالة... / Type a message"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={sendMessage} disabled={!chatText.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all"
              style={{ background: 'var(--color-accent)', color: '#000' }}>
              {sending ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaPaperPlane className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Panel ──────────────────────────────────────────────────────────
function SummaryPanel({ summary, analyzing, isDone }: any) {
  if (analyzing) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <FaRobot className="w-10 h-10 animate-pulse" style={{ color: 'var(--color-accent)' }} />
      <p className="font-bold" style={{ color: 'var(--color-text)' }}>Gemini يحلّل الجلسة...</p>
      <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>جاري إنشاء ملخص احترافي</p>
    </div>
  );

  if (!isDone && !summary) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <FaRobot className="w-10 h-10" style={{ color: 'var(--color-text-3)' }} />
      <p className="font-bold text-center" style={{ color: 'var(--color-text)' }}>الملخص الذكي</p>
      <p className="text-sm text-center" style={{ color: 'var(--color-text-2)' }}>
        سيتم إنشاء ملخص تلقائي بواسطة Gemini بعد انتهاء الجلسة
      </p>
    </div>
  );

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-4">
        <FaRobot className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>ملخص الجلسة بالذكاء الاصطناعي</h3>
      </div>
      <div className="rounded-xl p-4 border whitespace-pre-wrap text-sm leading-relaxed"
        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
        {summary || 'لا يوجد ملخص بعد.'}
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--color-text-3)' }}>
        🤖 تم إنشاؤه بواسطة Gemini AI · للاستخدام المرجعي فقط
      </p>
    </div>
  );
}
