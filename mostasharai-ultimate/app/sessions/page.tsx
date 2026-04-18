'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, or } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  FaCalendarAlt, FaVideo, FaClock, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaLock, FaArrowLeft, FaUser, FaCircle
} from 'react-icons/fa';

interface Session {
  id: string;
  expertId: string;
  expertName: string;
  clientId: string;
  clientName: string;
  scheduledAt: any;
  duration: number;
  cost: number;
  status: string;
  isLive?: boolean;
  type?: string;
}

const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; bg: string; icon: any }> = {
  scheduled:   { label: 'مجدولة',      labelEn: 'Scheduled',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: FaCalendarAlt },
  in_progress: { label: 'جارية الآن',  labelEn: 'Live Now',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: FaCircle },
  completed:   { label: 'مكتملة',      labelEn: 'Completed',   color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: FaCheckCircle },
  cancelled:   { label: 'ملغاة',       labelEn: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: FaTimesCircle },
};

export default function SessionsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (!user) return;
    // Query sessions where user is expert or client
    const q = query(
      collection(db, 'consultations'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Session))
        .filter(s => s.expertId === user.uid || s.clientId === user.uid);
      setSessions(all);
      setFetching(false);
    });
    return unsub;
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <FaLock className="w-12 h-12" style={{ color: 'var(--color-text-3)' }} />
      <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>يجب تسجيل الدخول</p>
      <Link href="/login" className="px-6 py-3 rounded-xl font-bold text-black text-sm"
        style={{ background: 'var(--color-accent)' }}>تسجيل الدخول</Link>
    </div>
  );

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);
  const liveSessions = sessions.filter(s => s.status === 'in_progress');

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>جلساتي</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-2)' }}>
            My Sessions • {sessions.length} جلسة
          </p>
        </div>
        <Link href="/experts" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
          style={{ background: 'var(--color-accent)' }}>
          <FaCalendarAlt className="w-4 h-4" />
          حجز جلسة جديدة
        </Link>
      </div>

      {/* Live Sessions Alert */}
      {liveSessions.length > 0 && (
        <div className="rounded-2xl p-4 border" style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="live-pulse w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
            <p className="font-bold" style={{ color: '#22c55e' }}>
              لديك {liveSessions.length} جلسة مباشرة الآن!
            </p>
          </div>
          {liveSessions.map(s => (
            <Link key={s.id} href={`/consultations/${s.id}`}
              className="mt-3 flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <div className="flex items-center gap-3">
                <FaVideo className="w-5 h-5" style={{ color: '#22c55e' }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                    {s.expertId === user.uid ? s.clientName : s.expertName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                    {s.expertId === user.uid ? 'عميلك' : 'خبيرك'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-black live-pulse"
                style={{ background: '#22c55e' }}>
                <FaVideo className="w-4 h-4" />
                🔴 دخول البث
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'الكل', labelEn: 'All' },
          { key: 'in_progress', label: 'مباشر', labelEn: 'Live' },
          { key: 'scheduled', label: 'مجدولة', labelEn: 'Upcoming' },
          { key: 'completed', label: 'مكتملة', labelEn: 'Done' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={filter === f.key
              ? { background: 'var(--color-accent)', color: '#000' }
              : { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
            {f.label} <span className="opacity-60 text-xs">/ {f.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {fetching ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <FaCalendarAlt className="w-12 h-12" style={{ color: 'var(--color-text-3)' }} />
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>لا توجد جلسات</p>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
            {filter === 'all' ? 'ابدأ باستشارة خبير الآن' : 'لا توجد جلسات بهذه الحالة'}
          </p>
          {filter === 'all' && (
            <Link href="/experts" className="px-5 py-2.5 rounded-xl font-bold text-sm text-black"
              style={{ background: 'var(--color-accent)' }}>
              استعرض الخبراء
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(session => {
            const isExpert = session.expertId === user.uid;
            const otherName = isExpert ? session.clientName : session.expertName;
            const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled;
            const StatusIcon = cfg.icon;
            const isLive = session.status === 'in_progress';
            const canJoin = session.status === 'scheduled' || isLive;
            const date = session.scheduledAt?.toDate?.() || new Date(session.scheduledAt || Date.now());

            return (
              <div key={session.id}
                className="rounded-2xl border p-4 transition-all hover:border-opacity-60"
                style={{ background: 'var(--color-surface)', borderColor: isLive ? '#22c55e' : 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-black flex-shrink-0"
                      style={{ background: 'var(--color-accent)' }}>
                      {otherName?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--color-text)' }}>{otherName || 'غير محدد'}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                        {isExpert ? '👤 عميل' : '🎓 خبير'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <FaClock className="w-3 h-3" style={{ color: 'var(--color-text-3)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                          {format(date, 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                          • {session.duration || 60} دقيقة
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {isLive && <div className="w-2 h-2 rounded-full live-pulse" style={{ background: cfg.color }} />}
                      <StatusIcon className="w-3 h-3" />
                      <span>{cfg.label}</span>
                    </div>
                    {session.cost > 0 && (
                      <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                        {session.cost} NEX
                      </span>
                    )}
                  </div>
                </div>

                {canJoin && (
                  <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <Link href={`/consultations/${session.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                      style={isLive
                        ? { background: '#22c55e', color: '#000' }
                        : { background: 'var(--color-accent)', color: '#000' }}>
                      <FaVideo className="w-4 h-4" />
                      {isLive ? '🔴 دخول البث المباشر' : 'فتح الجلسة'}
                    </Link>
                  </div>
                )}

                {session.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <Link href={`/consultations/${session.id}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                      style={{ color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
                      <FaArrowLeft className="w-3 h-3" /> عرض الملخص
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
