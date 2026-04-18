'use client';

import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/lib/database.adapter';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  FaStar, FaVideo, FaComments, FaCalendarAlt, FaWallet, FaClock,
  FaBolt, FaCheck, FaShieldAlt, FaArrowRight, FaSpinner, FaGlobe
} from 'react-icons/fa';

export default function ExpertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: expertId } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();
  const [expert, setExpert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(60);
  const [bookingType, setBookingType] = useState<'video' | 'text'>('video');
  const [showBooking, setShowBooking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', expertId));
        if (snap.exists()) setExpert({ uid: snap.id, ...snap.data() });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchExpert();
  }, [expertId]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !expert) return;
    if (!bookingDate || !bookingTime) { showToast('error', 'يُرجى اختيار التاريخ والوقت'); return; }

    const cost = Math.round((bookingDuration / 60) * (expert.hourlyRateNEX || expert.hourlyRate || 80));
    if ((profile.balanceNEX || 0) < cost) {
      showToast('error', `رصيدك غير كافٍ. تحتاج ${cost} NEX`);
      return;
    }

    setIsBooking(true);
    try {
      const scheduledAt = new Date(`${bookingDate}T${bookingTime}`);
      const ref = await addDoc(collection(db, 'consultations'), {
        expertId, expertName: expert.displayName,
        clientId: user.uid, clientName: profile.displayName,
        scheduledAt, duration: bookingDuration, cost,
        status: 'scheduled', type: bookingType,
        isLive: false, files: [], createdAt: serverTimestamp()
      });
      // Deduct from client
      await updateDoc(doc(db, 'users', user.uid), { balanceNEX: (profile.balanceNEX || 0) - cost });
      // Notify expert
      await addDoc(collection(db, 'notifications'), {
        userId: expertId,
        message: `📅 حجز جلسة جديدة من ${profile.displayName} — ${bookingDate} ${bookingTime}`,
        read: false, type: 'session', relatedId: ref.id, createdAt: serverTimestamp()
      });
      setShowBooking(false);
      showToast('success', '✅ تم الحجز بنجاح! يمكنك متابعة جلساتك من صفحة "جلساتي"');
    } catch (err: any) { showToast('error', err.message); }
    finally { setIsBooking(false); }
  };

  const handleStartLive = async () => {
    if (!user || !expert) return;
    if (user.uid !== expertId) { showToast('error', 'هذا الزر للخبير فقط'); return; }
    setIsStartingLive(true);
    try {
      const ref = await addDoc(collection(db, 'consultations'), {
        expertId, expertName: expert.displayName,
        clientId: null, clientName: 'مفتوح للجمهور',
        scheduledAt: serverTimestamp(),
        duration: 60, cost: 0,
        status: 'in_progress', type: 'video',
        isLive: true, files: [], createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: expertId,
        message: `🔴 بدأت بثاً مباشراً`,
        read: false, type: 'session', relatedId: ref.id, createdAt: serverTimestamp()
      });
      router.push(`/consultations/${ref.id}`);
    } catch (err: any) { showToast('error', err.message); setIsStartingLive(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (!expert) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p style={{ color: 'var(--color-text)' }}>الخبير غير موجود</p>
      <Link href="/experts" className="text-sm" style={{ color: 'var(--color-accent)' }}>← العودة للخبراء</Link>
    </div>
  );

  const isOwnProfile = user?.uid === expertId;
  const hourlyRate = expert.hourlyRateNEX || expert.hourlyRate || 80;
  const rating = expert.rating || 4.8;
  const reviews = expert.reviewCount || 0;

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Back */}
      <Link href="/experts" className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-all"
        style={{ color: 'var(--color-text-2)' }}>
        <FaArrowRight className="w-3 h-3" /> العودة للخبراء
      </Link>

      {/* Hero card */}
      <div className="rounded-3xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {/* Cover gradient */}
        <div className="h-32 w-full" style={{ background: 'linear-gradient(135deg, #050505 0%, #0a1628 50%, #050505 100%)' }}>
          <div className="h-full w-full opacity-30" style={{ backgroundImage: `radial-gradient(circle at 30% 50%, #00f2ff22 0%, transparent 60%)` }} />
        </div>

        <div className="px-6 pb-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              {expert.photoURL ? (
                <Image src={expert.photoURL} alt={expert.displayName} width={96} height={96}
                  className="w-24 h-24 rounded-2xl border-4 object-cover"
                  style={{ borderColor: 'var(--color-surface)' }} />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 flex items-center justify-center font-black text-3xl text-black"
                  style={{ background: 'var(--color-accent)', borderColor: 'var(--color-surface)' }}>
                  {expert.displayName?.[0]}
                </div>
              )}
              {expert.isOnline && (
                <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-2 live-pulse"
                  style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 mt-4 sm:mt-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>{expert.displayName}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-black" style={{ background: 'var(--color-accent)' }}>
                  خبير موثّق
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <FaStar key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-yellow-400' : ''}`}
                      style={s > Math.round(rating) ? { color: 'var(--color-border-2)' } : {}} />
                  ))}
                  <span className="text-sm font-bold mr-1" style={{ color: 'var(--color-text)' }}>{rating.toFixed(1)}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>({reviews} تقييم)</span>
                </div>
                {expert.isOnline && (
                  <span className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>● متاح الآن</span>
                )}
              </div>
              {expert.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {expert.specialties.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-full text-xs"
                      style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price + CTA */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="text-center px-4 py-2 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                <p className="text-2xl font-black" style={{ color: 'var(--color-accent)' }}>{hourlyRate}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>NEX / ساعة</p>
              </div>
              {!isOwnProfile && user && (
                <button onClick={() => setShowBooking(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-black text-sm transition-all hover:opacity-90"
                  style={{ background: 'var(--color-accent)' }}>
                  <FaCalendarAlt className="w-4 h-4" /> احجز استشارة
                </button>
              )}
              {isOwnProfile && (
                <button onClick={handleStartLive} disabled={isStartingLive}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all bg-red-500 hover:bg-red-600 disabled:opacity-60 shadow-lg shadow-red-500/20">
                  {isStartingLive ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaVideo className="w-4 h-4" />}
                  {isStartingLive ? 'جاري الإنشاء...' : '🔴 ابدأ بثاً مباشراً الآن'}
                </button>
              )}
              {!user && (
                <Link href="/login" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-black text-sm"
                  style={{ background: 'var(--color-accent)' }}>
                  سجّل للحجز
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {expert.bio && (
            <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold mb-3" style={{ color: 'var(--color-text)' }}>نبذة تعريفية</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{expert.bio}</p>
            </div>
          )}
        </div>

        {/* Session features */}
        <div className="rounded-2xl border p-5 h-fit" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--color-accent)' }}>مميزات الجلسة</h3>
          <ul className="space-y-3">
            {[
              { icon: FaVideo, text: 'فيديو HD مباشر', textEn: 'Live HD Video' },
              { icon: FaComments, text: 'دردشة نصية فورية', textEn: 'Real-time Chat' },
              { icon: FaShieldAlt, text: 'ضمان استرداد الأموال', textEn: 'Money-back Guarantee' },
              { icon: FaGlobe, text: 'رفع ملفات ومستندات', textEn: 'File Sharing' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-accent-glow)' }}>
                  <f.icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <span style={{ color: 'var(--color-text)' }}>{f.text}</span>
                  <span className="block text-xs" style={{ color: 'var(--color-text-3)' }}>{f.textEn}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowBooking(false)}>
          <div className="w-full max-w-md rounded-3xl border shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--color-text)' }}>حجز استشارة</h3>
              <button onClick={() => setShowBooking(false)} className="p-2 rounded-xl hover:opacity-70"
                style={{ color: 'var(--color-text-2)' }}>✕</button>
            </div>

            <form onSubmit={handleBook} className="p-5 space-y-4">
              {/* Session type */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-2)' }}>نوع الجلسة / Session Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'video', label: 'فيديو', labelEn: 'Video', icon: FaVideo },
                    { val: 'text', label: 'نصي', labelEn: 'Text', icon: FaComments },
                  ].map(t => (
                    <button key={t.val} type="button" onClick={() => setBookingType(t.val as any)}
                      className="flex items-center gap-2 p-3 rounded-xl border font-medium text-sm transition-all"
                      style={bookingType === t.val
                        ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#000' }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                      <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-2)' }}>التاريخ / Date</label>
                <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>

              {/* Time */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-2)' }}>الوقت / Time</label>
                <input type="time" required value={bookingTime} onChange={e => setBookingTime(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-2)' }}>المدة / Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map(d => (
                    <button key={d} type="button" onClick={() => setBookingDuration(d)}
                      className="py-2 rounded-xl border text-sm font-medium transition-all"
                      style={bookingDuration === d
                        ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#000' }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                      {d}د
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost summary */}
              <div className="rounded-xl p-4 border" style={{ background: 'var(--color-accent-glow)', borderColor: 'rgba(0,242,255,0.2)' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--color-text-2)' }}>التكلفة الإجمالية</span>
                  <span className="text-xl font-black" style={{ color: 'var(--color-accent)' }}>
                    {Math.round((bookingDuration / 60) * hourlyRate)} NEX
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                  رصيدك: {profile?.balanceNEX || 0} NEX
                </p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={isBooking}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-black transition-all disabled:opacity-60"
                  style={{ background: 'var(--color-accent)' }}>
                  {isBooking ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaCheck className="w-4 h-4" />}
                  تأكيد الحجز
                </button>
                <button type="button" onClick={() => setShowBooking(false)}
                  className="px-4 py-3 rounded-xl border font-bold text-sm transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 z-50 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold transition-all`}
          style={toast.type === 'success'
            ? { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: '#22c55e' }
            : { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
