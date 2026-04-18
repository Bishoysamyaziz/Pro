'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

export default function ExpertsPage() {
  const [experts, setExperts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [bookingExpert, setBookingExpert] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bookingStatus, setBookingStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const categories = ['قانون', 'طب', 'تقنية', 'مالية', 'أعمال', 'تطوير ذات'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const q = query(collection(db, 'experts'), where('isApproved', '==', true));
          const snapshot = await getDocs(q);
          const expertsData = await Promise.all(snapshot.docs.map(async (expertDoc) => {
            const expert = expertDoc.data();
            // Fetch user profile for name and photo
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', expert.uid)));
            const userData = userDoc.docs[0]?.data() || {};
            return { id: expertDoc.id, ...expert, ...userData };
          }));
          setExperts(expertsData);
        } catch (error) {
          console.error('Error fetching experts:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setExperts([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredExperts = experts.filter(expert => {
    const matchesCategory = selectedCategory ? expert.categories?.includes(selectedCategory) : true;
    const matchesSearch = expert.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          expert.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookingExpert || !bookingDate || !bookingTime) return;

    try {
      const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      const costNEX = (bookingDuration / 60) * bookingExpert.hourlyRateNEX;

      await addDoc(collection(db, 'consultations'), {
        clientId: user.uid,
        expertId: bookingExpert.uid,
        scheduledAt,
        duration: bookingDuration,
        costNEX,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });

      // Create notification for expert
      await addDoc(collection(db, 'notifications'), {
        userId: bookingExpert.uid,
        type: 'consultation',
        title: 'حجز استشارة جديد',
        message: `تم حجز استشارة جديدة معك يوم ${bookingDate} الساعة ${bookingTime}.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      setBookingExpert(null);
      setBookingDate('');
      setBookingTime('');
      setBookingDuration(30);
      setBookingStatus({ type: 'success', message: 'تم حجز الاستشارة بنجاح!' });
      setTimeout(() => setBookingStatus(null), 5000);
    } catch (error) {
      console.error('Error booking consultation:', error);
      setBookingStatus({ type: 'error', message: 'حدث خطأ أثناء حجز الاستشارة.' });
      setTimeout(() => setBookingStatus(null), 5000);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-12 neon-glow-primary">
          <h2 className="text-2xl font-bold text-primary mb-4 font-['Space_Grotesk']">سوق الخبراء</h2>
          <p className="text-on-surface-variant mb-8 font-['Tajawal']">يرجى تسجيل الدخول لتصفح الخبراء وحجز الاستشارات.</p>
          <Link href="/login" className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all inline-block font-['Tajawal']">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2 font-['Space_Grotesk']">سوق الخبراء</h1>
          <p className="text-on-surface-variant font-['Tajawal']">تواصل مع نخبة من الخبراء في مختلف المجالات</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="ابحث عن خبير أو تخصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl pr-10 pl-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
            />
          </div>
          <button className="p-2 bg-surface-container-highest border border-outline-variant/30 rounded-xl text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors font-['Tajawal'] ${
            selectedCategory === null 
              ? 'bg-primary-container text-on-primary-container' 
              : 'bg-surface-container-highest text-on-surface-variant hover:bg-outline-variant/20'
          }`}
        >
          الكل
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors font-['Tajawal'] ${
              selectedCategory === category 
                ? 'bg-primary-container text-on-primary-container' 
                : 'bg-surface-container-highest text-on-surface-variant hover:bg-outline-variant/20'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Experts Grid */}
      {filteredExperts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperts.map((expert) => (
            <Link href={`/expert/${expert.uid}`} key={expert.id} className="block group">
              <div className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,242,255,0.1)] hover:border-primary-container/30 h-full flex flex-col glass-obsidian relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-start gap-4 mb-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-surface-container-highest border border-primary-container/30 overflow-hidden flex-shrink-0">
                    {expert.photoURL ? (
                      <Image src={expert.photoURL} alt={expert.displayName || 'Expert'} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-container text-xl font-bold font-['Space_Grotesk']">
                        {expert.displayName?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary group-hover:text-primary-container transition-colors font-['Tajawal']">
                      {expert.displayName || 'خبير مجهول'}
                    </h3>
                    <p className="text-sm text-on-surface-variant line-clamp-1 font-['Tajawal']">{expert.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-tertiary-container">
                      <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="text-sm font-medium font-['Space_Grotesk']">{expert.rating || 'جديد'}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-2 flex-1 font-['Tajawal'] relative z-10">
                  {expert.bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                  {expert.categories?.slice(0, 3).map((cat: string) => (
                    <span key={cat} className="px-2 py-1 bg-primary-container/10 border border-primary-container/20 rounded-md text-xs text-primary-container font-['Tajawal']">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 mt-auto relative z-10">
                  <div className="text-right">
                    <span className="text-primary-container font-bold font-['Space_Grotesk'] text-lg">{expert.hourlyRateNEX} NEX</span>
                    <span className="text-xs text-on-surface-variant block font-['Tajawal']">/ ساعة</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setBookingExpert(expert);
                    }}
                    className="px-4 py-2 bg-primary-container text-on-primary-container font-bold rounded-sm hover:shadow-[0_0_15px_#00f2ff] transition-all text-sm font-['Tajawal'] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    احجز استشارة
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-surface-container/40 border border-outline-variant/10 rounded-2xl glass-obsidian">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mx-auto mb-4">work</span>
          <h3 className="text-xl font-medium text-on-surface mb-2 font-['Tajawal']">لا يوجد خبراء</h3>
          <p className="text-on-surface-variant font-['Tajawal']">لم نتمكن من العثور على خبراء يطابقون بحثك.</p>
        </div>
      )}

      {/* Booking Status Toast */}
      {bookingStatus && (
        <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 font-['Tajawal'] ${
          bookingStatus.type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">
              {bookingStatus.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="font-bold">{bookingStatus.message}</p>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingExpert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-6 w-full max-w-md relative glass-obsidian">
            <button 
              onClick={() => setBookingExpert(null)}
              className="absolute top-4 left-4 p-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="text-xl font-bold text-primary mb-6 font-['Space_Grotesk']">حجز استشارة</h3>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-surface-container-highest rounded-2xl border border-outline-variant/10">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container font-bold overflow-hidden">
                {bookingExpert.photoURL ? (
                  <Image fill alt="Expert" className="absolute inset-0 w-full h-full object-cover" src={bookingExpert.photoURL} referrerPolicy="no-referrer" />
                ) : (
                  bookingExpert.displayName?.[0] || '؟'
                )}
              </div>
              <div>
                <p className="font-bold text-on-surface font-['Tajawal']">{bookingExpert.displayName}</p>
                <p className="text-sm text-on-surface-variant font-['Tajawal']">{bookingExpert.title}</p>
              </div>
            </div>

            <form onSubmit={handleBookConsultation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">التاريخ</label>
                <input 
                  type="date" 
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">الوقت</label>
                <input 
                  type="time" 
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">المدة (بالدقائق)</label>
                <select 
                  value={bookingDuration}
                  onChange={(e) => setBookingDuration(Number(e.target.value))}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة</option>
                </select>
              </div>

              <div className="p-4 bg-primary-container/10 border border-primary-container/20 rounded-2xl mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-on-surface-variant font-['Tajawal']">التكلفة الإجمالية:</span>
                  <span className="text-xl font-bold text-primary-container font-['Space_Grotesk']">
                    {((bookingDuration / 60) * bookingExpert.hourlyRateNEX).toFixed(2)} NEX
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-['Tajawal']">سيتم خصم المبلغ من محفظتك عند بدء الجلسة.</p>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all mt-6 font-['Tajawal']"
              >
                تأكيد الحجز
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}