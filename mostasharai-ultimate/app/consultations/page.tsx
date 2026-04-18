'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Link from 'next/link';

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch where user is either client or expert
          const clientQuery = query(collection(db, 'consultations'), where('clientId', '==', currentUser.uid));
          const expertQuery = query(collection(db, 'consultations'), where('expertId', '==', currentUser.uid));
          
          const [clientSnap, expertSnap] = await Promise.all([getDocs(clientQuery), getDocs(expertQuery)]);
          
          const allConsultations = [...clientSnap.docs, ...expertSnap.docs].map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          // Sort by scheduledAt descending
          allConsultations.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
          
          // Fetch related user details (expert for client, client for expert)
          const enrichedConsultations = await Promise.all(allConsultations.map(async (cons) => {
            const otherUserId = cons.clientId === currentUser.uid ? cons.expertId : cons.clientId;
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', otherUserId)));
            return { ...cons, otherUser: userDoc.docs[0]?.data() || {} };
          }));

          setConsultations(enrichedConsultations);
        } catch (error) {
          console.error('Error fetching consultations:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setConsultations([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-12 neon-glow-primary">
          <h2 className="text-2xl font-bold text-primary mb-4 font-['Space_Grotesk']">استشاراتي</h2>
          <p className="text-on-surface-variant mb-8 font-['Tajawal']">يرجى تسجيل الدخول لعرض استشاراتك.</p>
          <Link href="/login" className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all inline-block font-['Tajawal']">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary-container">forum</span>
          <h1 className="text-3xl font-bold text-primary font-['Space_Grotesk']">استشاراتي</h1>
        </div>
        <Link href="/experts" className="px-6 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all flex items-center gap-2 font-['Tajawal']">
          <span className="material-symbols-outlined">add</span>
          احجز استشارة جديدة
        </Link>
      </div>

      <div className="space-y-4">
        {consultations.length === 0 ? (
          <div className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-8 text-center glass-obsidian">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mx-auto mb-4">videocam</span>
            <h3 className="text-xl font-medium text-on-surface mb-2 font-['Tajawal']">لا توجد استشارات</h3>
            <p className="text-on-surface-variant mb-6 font-['Tajawal']">لم تقم بحجز أي استشارات بعد.</p>
            <Link href="/experts" className="px-6 py-2 bg-primary-container text-on-primary-container font-medium rounded-full hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">
              تصفح الخبراء
            </Link>
          </div>
        ) : (
          consultations.map(cons => (
            <div key={cons.id} className="bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-outline-variant/30 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-bold text-on-surface-variant font-['Space_Grotesk']">
                  {cons.otherUser?.displayName?.[0] || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg font-['Tajawal']">{cons.otherUser?.displayName || 'مستخدم'}</h3>
                  <div className="flex items-center gap-4 text-sm text-on-surface-variant mt-1 font-['Tajawal']">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> <span className="font-['Space_Grotesk']">{new Date(cons.scheduledAt).toLocaleString('ar-EG')}</span></span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">videocam</span> <span className="font-['Space_Grotesk']">{cons.duration} دقيقة</span></span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit font-['Tajawal'] ${
                  cons.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-500' :
                  cons.status === 'active' ? 'bg-green-500/20 text-green-500' :
                  'bg-outline-variant/20 text-on-surface-variant'
                }`}>
                  {cons.status === 'scheduled' ? 'مجدولة' : cons.status === 'active' ? 'جارية الآن' : 'مكتملة'}
                </span>
                
                {cons.status === 'active' && (
                  <Link href={`/consultations/${cons.id}`} className="w-full md:w-auto px-6 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all text-center font-['Tajawal']">
                    دخول الجلسة
                  </Link>
                )}
                {cons.status === 'scheduled' && (
                  <Link href={`/consultations/${cons.id}`} className="w-full md:w-auto px-6 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all text-center font-['Tajawal']">
                    دخول الجلسة
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
