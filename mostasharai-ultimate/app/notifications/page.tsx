'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubNotifications: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (unsubNotifications) {
        unsubNotifications();
        unsubNotifications = null;
      }

      if (currentUser) {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        unsubNotifications = onSnapshot(q, (snapshot) => {
          setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }, (error) => {
          console.error("Error fetching notifications:", error);
          setLoading(false);
        });
      } else {
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubNotifications) {
        unsubNotifications();
      }
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-12 neon-glow-primary">
          <h2 className="text-2xl font-bold text-primary mb-4 font-['Space_Grotesk']">الإشعارات</h2>
          <p className="text-on-surface-variant mb-8 font-['Tajawal']">يرجى تسجيل الدخول لعرض إشعاراتك.</p>
          <Link href="/login" className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all inline-block font-['Tajawal']">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary-container">notifications</span>
          <h1 className="text-3xl font-bold text-primary font-['Space_Grotesk']">الإشعارات</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-sm text-primary hover:underline font-['Tajawal']"
          >
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-8 text-center glass-obsidian">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mx-auto mb-4">notifications_off</span>
          <h3 className="text-xl font-medium text-on-surface mb-2 font-['Tajawal']">لا توجد إشعارات</h3>
          <p className="text-on-surface-variant font-['Tajawal']">ليس لديك أي إشعارات جديدة في الوقت الحالي.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`bg-surface-container-highest border rounded-2xl p-4 flex items-start gap-4 transition-colors cursor-pointer ${
                notification.read ? 'border-outline-variant/20 opacity-70' : 'border-primary-container/50 bg-primary-container/5'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                notification.read ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-container text-on-primary-container'
              }`}>
                <span className="material-symbols-outlined">
                  {notification.type === 'deposit' ? 'account_balance_wallet' : 
                   notification.type === 'consultation' ? 'event' : 
                   notification.type === 'like' ? 'favorite' : 
                   notification.type === 'comment' ? 'chat_bubble' : 'notifications'}
                </span>
              </div>
              <div className="flex-1">
                <h4 className={`font-medium font-['Tajawal'] ${notification.read ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {notification.title}
                </h4>
                <p className="text-sm text-on-surface-variant mt-1 font-['Tajawal']">{notification.message}</p>
                <span className="text-xs text-on-surface-variant mt-2 block font-['Space_Grotesk']">
                  {new Date(notification.createdAt).toLocaleString('ar-EG')}
                </span>
              </div>
              {!notification.read && (
                <div className="w-3 h-3 rounded-full bg-primary-container mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
