'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment, addDoc, onSnapshot } from 'firebase/firestore';
import { getUserProfile } from '@/lib/database.adapter';
import { useRouter } from 'next/navigation';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, experts: 0, consultations: 0, revenue: 0 });
  
  // Prime AI Chat State
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'مرحباً أيها المالك. لقد انتهيت من تحليل تقارير الأمس. هل ترغب في عرض ملخص الفرص الاستثمارية؟' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    let unsubscribeRequests: () => void;
    let unsubscribeWithdraws: () => void;
    let unsubscribeExperts: () => void;
    let unsubscribeUsers: () => void;

    const checkAdminAndFetchData = async () => {
      if (!auth.currentUser) {
        router.push('/login');
        return;
      }

      const profile = await getUserProfile(auth.currentUser.uid);
      const isSuperAdmin = auth.currentUser.email === "bishoysamy390@gmail.com";
      if (profile?.role !== 'admin' && !isSuperAdmin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);

      // Subscribe to pending deposit requests
      const reqQuery = query(collection(db, 'depositRequests'), where('status', '==', 'pending'));
      unsubscribeRequests = onSnapshot(reqQuery, async (snapshot) => {
        const reqs = await Promise.all(snapshot.docs.map(async (d) => {
          const reqData = d.data();
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', reqData.userId)));
          return { id: d.id, ...reqData, user: userDoc.docs[0]?.data() };
        }));
        setDepositRequests(reqs);
        setLoading(false);
      });

      // Subscribe to pending withdraw requests
      const withdrawQuery = query(collection(db, 'withdrawRequests'), where('status', '==', 'pending'));
      unsubscribeWithdraws = onSnapshot(withdrawQuery, async (snapshot) => {
        const reqs = await Promise.all(snapshot.docs.map(async (d) => {
          const reqData = d.data();
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', reqData.userId)));
          return { id: d.id, ...reqData, user: userDoc.docs[0]?.data() };
        }));
        setWithdrawRequests(reqs);
      });

      // Subscribe to pending expert approvals
      const expQuery = query(collection(db, 'experts'), where('isApproved', '==', false));
      unsubscribeExperts = onSnapshot(expQuery, async (snapshot) => {
        const exps = await Promise.all(snapshot.docs.map(async (d) => {
          const expData = d.data();
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', expData.uid)));
          return { id: d.id, ...expData, user: userDoc.docs[0]?.data() };
        }));
        setExperts(exps);
      });

      // Subscribe to all users
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Calculate stats (one-time or periodic)
      const fetchStats = async () => {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const expertsSnap = await getDocs(query(collection(db, 'experts'), where('isApproved', '==', true)));
          const consultationsSnap = await getDocs(collection(db, 'consultations'));
          
          let totalRevenue = 0;
          consultationsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') {
              totalRevenue += (data.costNEX || 0) * 0.1;
            }
          });

          setStats({
            users: usersSnap.size,
            experts: expertsSnap.size,
            consultations: consultationsSnap.size,
            revenue: totalRevenue
          });
        } catch (error) {
          console.error("Error calculating stats", error);
        }
      };
      fetchStats();
    };

    checkAdminAndFetchData();

    return () => {
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeWithdraws) unsubscribeWithdraws();
      if (unsubscribeExperts) unsubscribeExperts();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [router]);

  const handleApproveDeposit = async (requestId: string, userId: string, amountNEX: number) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'depositRequests', requestId), { status: 'approved' });
      
      // Update user balance
      await updateDoc(doc(db, 'users', userId), { balanceNEX: increment(amountNEX) });
      
      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'deposit',
        amountNEX,
        description: 'إيداع معتمد من الإدارة',
        createdAt: new Date().toISOString()
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'deposit',
        title: 'تمت الموافقة على الإيداع',
        message: `تم إضافة ${amountNEX} NEX إلى محفظتك بنجاح.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Remove from list
      setDepositRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `depositRequests/${requestId}`);
    }
  };

  const handleRejectDeposit = async (requestId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'depositRequests', requestId), { status: 'rejected' });
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'deposit',
        title: 'تم رفض طلب الإيداع',
        message: 'عذراً، تم رفض طلب الإيداع الخاص بك. يرجى التأكد من صحة بيانات التحويل والمحاولة مرة أخرى.',
        read: false,
        createdAt: new Date().toISOString()
      });

      setDepositRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `depositRequests/${requestId}`);
    }
  };

  const handleApproveWithdraw = async (requestId: string, userId: string, amountNEX: number) => {
    try {
      // Check if user still has balance
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
      const userData = userSnap.docs[0]?.data();
      
      if (!userData || userData.balanceNEX < amountNEX) {
        alert('رصيد المستخدم غير كافٍ لإتمام عملية السحب.');
        return;
      }

      // Update request status
      await updateDoc(doc(db, 'withdrawRequests', requestId), { status: 'approved' });
      
      // Deduct from user balance
      await updateDoc(userRef, { balanceNEX: increment(-amountNEX) });
      
      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'withdrawal',
        amountNEX,
        description: 'سحب رصيد معتمد',
        createdAt: new Date().toISOString()
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'withdrawal',
        title: 'تم تنفيذ طلب السحب',
        message: `تم خصم ${amountNEX} NEX من محفظتك وتحويل المبلغ إليك بنجاح.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      setWithdrawRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `withdrawRequests/${requestId}`);
    }
  };

  const handleRejectWithdraw = async (requestId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'withdrawRequests', requestId), { status: 'rejected' });
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'withdrawal',
        title: 'تم رفض طلب السحب',
        message: 'عذراً، تم رفض طلب السحب الخاص بك. يرجى التواصل مع الدعم الفني للمزيد من التفاصيل.',
        read: false,
        createdAt: new Date().toISOString()
      });

      setWithdrawRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `withdrawRequests/${requestId}`);
    }
  };

  const handleApproveExpert = async (expertId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'experts', expertId), { isApproved: true });
      await updateDoc(doc(db, 'users', userId), { role: 'expert' });
      setExperts(prev => prev.filter(e => e.id !== expertId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `experts/${expertId}`);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleChargeUser = async (userId: string) => {
    const amountStr = prompt('أدخل المبلغ المراد شحنه (NEX):');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('مبلغ غير صحيح');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { balanceNEX: increment(amount) });
      
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'deposit',
        amountNEX: amount,
        description: 'شحن رصيد من الإدارة',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'deposit',
        title: 'تم شحن رصيدك',
        message: `تم شحن ${amount} NEX إلى محفظتك من قبل الإدارة.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      alert('تم شحن الرصيد بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handlePrimeChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      // Simple mock response for now, or could use Gemini
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'model', text: 'جارٍ تحليل البيانات... تم رصد نمو في قطاع الاستشارات التقنية بنسبة 5%.' }]);
        setIsChatLoading(false);
      }, 1000);
    } catch (error) {
      console.error(error);
      setIsChatLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/20 text-[#00f2ff] text-xs font-bold uppercase tracking-widest mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f2ff]"></span>
          </span>
          Active Intelligence
        </div>
        <h1 className="text-4xl font-black text-on-background font-['Tajawal'] leading-tight mb-2">نيكسوس برايم:<br/><span className="text-primary-container">السيادة الرقمية</span></h1>
        <p className="text-on-surface-variant max-w-xl text-lg font-light leading-relaxed font-['Tajawal']">تحليلات تنبؤية متقدمة ونظام مراقبة حي. نيكسوس برايم يراقب كل العمليات لضمان الأداء الأمثل.</p>
      </div>

      {/* Statistics & AI Chat */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        {/* Analytics & Health (Left/Center) */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Efficiency */}
          <div className="bg-surface-container rounded-xl p-6 border-r-2 border-primary-container flex flex-col justify-between group hover:bg-surface-container-high transition-colors">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-primary-container bg-primary-container/10 p-3 rounded-lg">insights</span>
              <div className="text-right">
                <p className="text-on-surface-variant text-sm font-['Tajawal']">كفاءة الأداء</p>
                <h3 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">98.4%</h3>
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Optimal Range</span>
                <span>Current</span>
              </div>
              <div className="w-full bg-[#050505] h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full w-[98.4%] neon-glow-primary"></div>
              </div>
            </div>
          </div>

          {/* Memory Consumption */}
          <div className="bg-surface-container rounded-xl p-6 border-r-2 border-slate-700 flex flex-col justify-between group hover:bg-surface-container-high transition-colors">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-slate-400 bg-white/5 p-3 rounded-lg">memory</span>
              <div className="text-right">
                <p className="text-on-surface-variant text-sm font-['Tajawal']">استهلاك الذاكرة</p>
                <h3 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">4.2 GB</h3>
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>32 GB Available</span>
                <span>13% Loaded</span>
              </div>
              <div className="w-full bg-[#050505] h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-500 h-full w-[13%]"></div>
              </div>
            </div>
          </div>

          {/* Revenue Forecast */}
          <div className="md:col-span-2 bg-surface-container rounded-xl p-8 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-right space-y-2 order-2 md:order-1">
                <h3 className="text-xl font-bold text-on-surface font-['Tajawal']">توقعات العوائد القادمة</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed font-['Tajawal']">يتوقع نيكسوس برايم نمواً بنسبة 12% في الـ 30 يوماً القادمة بناءً على سلوك السوق الحالي ومعدلات التحويل.</p>
                <div className="pt-4">
                  <span className="text-primary-container text-3xl font-black font-['Space_Grotesk']">+12,500 NEX</span>
                  <span className="text-on-surface-variant text-xs mr-2 font-['Tajawal']">متوقع بنهاية الربع</span>
                </div>
              </div>
              <div className="w-full md:w-64 h-32 flex items-end justify-between gap-1 order-1 md:order-2">
                <div className="w-6 bg-slate-800 rounded-t-sm h-8"></div>
                <div className="w-6 bg-slate-800 rounded-t-sm h-12"></div>
                <div className="w-6 bg-slate-800 rounded-t-sm h-10"></div>
                <div className="w-6 bg-slate-700 rounded-t-sm h-16"></div>
                <div className="w-6 bg-slate-600 rounded-t-sm h-24"></div>
                <div className="w-6 bg-primary-container rounded-t-sm h-32 neon-glow-primary"></div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary-container/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Live Chat with Prime AI */}
        <div className="md:col-span-4 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col h-[500px]">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary-container/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface leading-none font-['Tajawal']">Prime AI</h4>
                <span className="text-[10px] text-green-500 flex items-center gap-1 font-['Tajawal']">
                  <span className="h-1 w-1 bg-green-500 rounded-full"></span>
                  متصل الآن
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">more_vert</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'flex-row items-start gap-2 max-w-[85%] mr-auto' : 'flex-row-reverse items-start gap-2 max-w-[85%]'}`}>
                <div className={`${msg.role === 'user' ? 'bg-primary-container/10 border border-primary-container/20 text-primary-container rounded-tl-none' : 'bg-surface-container-highest text-on-surface-variant rounded-tr-none'} p-3 rounded-xl text-sm font-['Tajawal']`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex flex-row-reverse items-start gap-2 max-w-[85%]">
                <div className="bg-surface-container-highest p-3 rounded-xl rounded-tr-none text-sm text-on-surface-variant font-['Tajawal'] animate-pulse">
                  جاري التفكير...
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-outline-variant/30">
            <div className="relative">
              <input 
                className="w-full bg-[#050505] border-0 border-b border-outline-variant/30 text-sm py-3 px-4 text-on-surface focus:ring-0 focus:border-primary-container placeholder-on-surface-variant/40 transition-all font-['Tajawal']" 
                placeholder="اسأل نيكسوس برايم..." 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePrimeChat()}
              />
              <button 
                onClick={handlePrimeChat}
                disabled={!chatInput.trim() || isChatLoading}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-primary-container hover:scale-110 transition-transform disabled:opacity-30"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Requests Management */}
        <div className="space-y-8">
          {/* Deposit Requests */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-2xl text-green-400">payments</span>
              <h2 className="text-xl font-bold text-primary font-['Tajawal']">طلبات الإيداع المعلقة</h2>
              <span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-full text-xs font-bold mr-auto">
                {depositRequests.length}
              </span>
            </div>

            <div className="space-y-4">
              {depositRequests.length === 0 ? (
                <p className="text-on-surface-variant text-center py-4 font-['Tajawal']">لا توجد طلبات معلقة</p>
              ) : (
                depositRequests.map(req => (
                  <div key={req.id} className="bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-on-surface font-medium font-['Tajawal']">{req.user?.displayName || req.user?.email}</p>
                        <p className="text-2xl font-bold text-primary-container font-['Space_Grotesk']">{req.amountNEX} NEX</p>
                      </div>
                      <a href={req.proofURL} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline font-['Tajawal']">
                        عرض الإيصال
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveDeposit(req.id, req.userId, req.amountNEX)}
                        className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-['Tajawal']"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span> موافقة
                      </button>
                      <button 
                        onClick={() => handleRejectDeposit(req.id, req.userId)}
                        className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-['Tajawal']"
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span> رفض
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Withdraw Requests */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-2xl text-orange-400">account_balance_wallet</span>
              <h2 className="text-xl font-bold text-primary font-['Tajawal']">طلبات السحب المعلقة</h2>
              <span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-full text-xs font-bold mr-auto">
                {withdrawRequests.length}
              </span>
            </div>

            <div className="space-y-4">
              {withdrawRequests.length === 0 ? (
                <p className="text-on-surface-variant text-center py-4 font-['Tajawal']">لا توجد طلبات معلقة</p>
              ) : (
                withdrawRequests.map(req => (
                  <div key={req.id} className="bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-on-surface font-medium font-['Tajawal']">{req.user?.displayName || req.user?.email}</p>
                        <p className="text-2xl font-bold text-orange-400 font-['Space_Grotesk']">{req.amountNEX} NEX</p>
                        <p className="text-xs text-on-surface-variant mt-2 font-['Tajawal']">التفاصيل: {req.paymentDetails}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveWithdraw(req.id, req.userId, req.amountNEX)}
                        className="flex-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-['Tajawal']"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span> تنفيذ السحب
                      </button>
                      <button 
                        onClick={() => handleRejectWithdraw(req.id, req.userId)}
                        className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-['Tajawal']"
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span> رفض
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Expert Approvals */}
        <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-2xl text-blue-400">group</span>
            <h2 className="text-xl font-bold text-primary font-['Tajawal']">طلبات توثيق الخبراء</h2>
            <span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-full text-xs font-bold mr-auto">
              {experts.length}
            </span>
          </div>

          <div className="space-y-4">
            {experts.length === 0 ? (
              <p className="text-on-surface-variant text-center py-4 font-['Tajawal']">لا توجد طلبات معلقة</p>
            ) : (
              experts.map(exp => (
                <div key={exp.id} className="bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-on-surface font-bold text-lg font-['Tajawal']">{exp.user?.displayName || exp.user?.email}</p>
                      <p className="text-primary-container text-sm mb-2 font-['Tajawal']">{exp.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {exp.categories?.map((c: string) => (
                          <span key={c} className="text-xs bg-outline-variant/20 px-2 py-1 rounded-md text-on-surface-variant font-['Tajawal']">{c}</span>
                        ))}
                      </div>
                    </div>
                    <a href={exp.idCardURL} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 font-['Tajawal']">
                      <span className="material-symbols-outlined text-sm">badge</span> الهوية
                    </a>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-4 line-clamp-2 font-['Tajawal']">{exp.bio}</p>
                  <button 
                    onClick={() => handleApproveExpert(exp.id, exp.uid)}
                    className="w-full bg-primary-container text-on-primary-container font-bold py-2 rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all flex items-center justify-center gap-2 font-['Tajawal']"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span> توثيق الخبير
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Transactions & Status */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="md:col-span-2 bg-surface-container rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-primary-container/10 flex justify-between items-center">
            <h3 className="font-bold text-on-surface font-['Tajawal']">العمليات الأخيرة</h3>
            <button className="text-primary-container text-xs underline underline-offset-4 font-['Tajawal']">عرض الكل</button>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-surface-container-high rounded-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container">account_balance</span>
                </div>
                <div>
                  <p className="text-on-surface text-sm font-medium font-['Tajawal']">تحويل مكافآت NEX</p>
                  <p className="text-on-surface-variant text-[10px] font-['Tajawal']">منذ ساعتين • ID: #99021</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-primary-container font-bold text-sm font-['Space_Grotesk']">+450 NEX</p>
                <p className="text-green-500 text-[10px] font-['Tajawal']">مكتمل</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-surface-container-high rounded-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400">shopping_bag</span>
                </div>
                <div>
                  <p className="text-on-surface text-sm font-medium font-['Tajawal']">رسوم استشارة خبير</p>
                  <p className="text-on-surface-variant text-[10px] font-['Tajawal']">أمس الساعة 04:30 م</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-on-surface font-bold text-sm font-['Space_Grotesk']">-120 NEX</p>
                <p className="text-green-500 text-[10px] font-['Tajawal']">مكتمل</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-6 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent z-0 opacity-30"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="material-symbols-outlined text-primary-container">verified_user</span>
              <span className="text-[10px] text-on-surface-variant font-mono">SECURE NODE v2.4</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface font-['Tajawal']">حماية النظام نشطة</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed font-['Tajawal']">تم فحص جميع المحافظ والعمليات. تم صد 14 محاولة وصول غير مصرح بها خلال الـ 24 ساعة الماضية.</p>
          </div>
          <button className="relative z-10 w-full mt-6 border border-primary-container/20 py-2 text-xs text-primary-container hover:bg-primary-container/10 transition-colors font-['Tajawal']">
            تقرير الأمان التفصيلي
          </button>
        </div>
      </section>

      {/* User Management */}
      <div className="mt-8 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="px-6 py-4 border-b border-primary-container/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary-container">manage_accounts</span>
            <h2 className="text-xl font-bold text-on-surface font-['Tajawal']">إدارة المستخدمين</h2>
            <span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-full text-xs font-bold mr-auto font-['Space_Grotesk']">
              {users.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-surface-container-high/50 text-on-surface-variant font-['Tajawal'] text-sm">
                <th className="py-4 px-6 text-right">المستخدم</th>
                <th className="py-4 px-6 text-right">البريد الإلكتروني</th>
                <th className="py-4 px-6 text-right">الدور</th>
                <th className="py-4 px-6 text-right">الرصيد</th>
                <th className="py-4 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-surface font-['Tajawal']">{u.displayName || 'بدون اسم'}</td>
                  <td className="py-4 px-6 text-on-surface-variant font-['Space_Grotesk'] text-sm">{u.email}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-['Tajawal'] ${
                      u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      u.role === 'expert' ? 'bg-primary-container/20 text-primary-container border border-primary-container/30' :
                      'bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30'
                    }`}>
                      {u.role === 'admin' ? 'مشرف' : u.role === 'expert' ? 'خبير' : 'مستخدم'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-primary-container font-bold font-['Space_Grotesk']">{u.balanceNEX || 0} NEX</td>
                  <td className="py-4 px-6 text-center">
                    {u.role !== 'admin' && (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleChargeUser(u.id)}
                          className="px-3 py-1.5 rounded-sm text-xs font-bold transition-all font-['Tajawal'] border bg-primary-container/10 text-primary-container border-primary-container/30 hover:bg-primary-container/20"
                        >
                          شحن
                        </button>
                        <button 
                          onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                          className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all font-['Tajawal'] border ${
                            u.isBanned 
                              ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                          }`}
                        >
                          {u.isBanned ? 'فك الحظر' : 'حظر'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}