'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setNotifications(snap.docs.slice(0, 30).map(d => ({ id: d.id, ...d.data() } as Notification)));
    });
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  if (!user) return null;

  const icons: Record<string, string> = {
    like: '❤️', comment: '💬', session: '📅', deposit: '💰', system: '📢', follow: '👤'
  };

  return (
    <div ref={panelRef} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] flex items-center justify-center transition-all">
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00f2ff] text-black text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-80 bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
            <h3 className="text-white font-bold text-sm">الإشعارات</h3>
            <button onClick={markAllRead} className="text-[#00f2ff] text-xs hover:underline">قراءة الكل</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">لا توجد إشعارات</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-4 border-b border-[#111] flex gap-3 hover:bg-[#1a1a1a]/50 transition-colors ${!n.read ? 'bg-[#00f2ff]/3' : ''}`}>
                  <span className="text-lg flex-shrink-0">{icons[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm leading-relaxed">{n.message}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-[#00f2ff] rounded-full flex-shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
