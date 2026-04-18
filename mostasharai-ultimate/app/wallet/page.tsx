'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { getUserProfile } from '@/lib/database.adapter';
import { requestDeposit, requestWithdrawal } from '@/lib/payment.adapter';
import { uploadFile } from '@/lib/storage.adapter';
import Link from 'next/link';

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

export default function WalletPage() {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Deposit Form State
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [proofURL, setProofURL] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdraw Form State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');

  useEffect(() => {
    let unsubscribeProfile: () => void;
    let unsubscribeTransactions: () => void;
    let unsubscribeRequests: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Subscribe to Profile
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
          setProfile(doc.data());
        });

        // Subscribe to Transactions
        const txQuery = query(
          collection(db, 'transactions'), 
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        unsubscribeTransactions = onSnapshot(txQuery, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Subscribe to Deposit Requests
        const reqQuery = query(
          collection(db, 'depositRequests'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        unsubscribeRequests = onSnapshot(reqQuery, (snapshot) => {
          setDepositRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Subscribe to Withdraw Requests
        const withdrawQuery = query(
          collection(db, 'withdrawRequests'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        onSnapshot(withdrawQuery, (snapshot) => {
          setWithdrawRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
      } else {
        setProfile(null);
        setTransactions([]);
        setDepositRequests([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositAmount || !proofURL) return;
    
    setIsSubmitting(true);
    try {
      await requestDeposit(user.uid, Number(depositAmount), proofURL);
      setShowDepositForm(false);
      setDepositAmount('');
      setProofURL('');
    } catch (error) {
      console.error('Error submitting deposit request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsSubmitting(true);
    try {
      const url = await uploadFile(file, `deposits/${user.uid}`);
      setProofURL(url);
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('حدث خطأ أثناء رفع الإيصال');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount || !withdrawDetails) return;
    if (Number(withdrawAmount) > (profile?.balanceNEX || 0)) {
      alert('رصيدك غير كافٍ لهذا المبلغ.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await requestWithdrawal(user.uid, Number(withdrawAmount), withdrawDetails);
      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setWithdrawDetails('');
    } catch (error) {
      console.error('Error submitting withdraw request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-12 neon-glow-primary">
          <h2 className="text-2xl font-bold text-primary mb-4 font-['Space_Grotesk']">المحفظة</h2>
          <p className="text-on-surface-variant mb-8 font-['Tajawal']">يرجى تسجيل الدخول للوصول إلى محفظتك.</p>
          <Link href="/login" className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all inline-block font-['Tajawal']">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2 font-['Space_Grotesk']">المحفظة</h1>
        <p className="text-on-surface-variant font-['Tajawal']">إدارة رصيدك ومعاملاتك المالية</p>
      </div>

      {/* Balance Card */}
      <div className="bg-surface-container rounded-xl p-8 mb-8 border border-outline-variant/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-500 group-hover:bg-primary-container/10" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-on-surface-variant mb-2 flex items-center gap-2 font-['Tajawal']">
              <span className="material-symbols-outlined text-primary-container">account_balance_wallet</span>
              الرصيد الحالي
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-primary-container font-['Space_Grotesk']">{profile?.balanceNEX || 0}</span>
              <span className="text-xl text-primary font-medium font-['Space_Grotesk']">NEX</span>
            </div>
            <p className="text-sm text-on-surface-variant mt-2 font-['Space_Grotesk']">≈ {((profile?.balanceNEX || 0) * 15).toLocaleString()} EGP</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => setShowDepositForm(true)}
              className="flex-1 md:flex-none px-8 py-3 bg-primary-container text-on-primary font-bold rounded-sm hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 font-['Tajawal']"
            >
              <span className="material-symbols-outlined">south_west</span>
              إيداع
            </button>
            <button 
              onClick={() => setShowWithdrawForm(true)}
              className="flex-1 md:flex-none px-8 py-3 border border-primary/30 text-primary hover:bg-primary/10 transition-all font-bold rounded-sm flex items-center justify-center gap-2 font-['Tajawal']"
            >
              <span className="material-symbols-outlined">north_east</span>
              سحب
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container/90 backdrop-blur-xl border border-primary-container/30 rounded-sm p-8 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowDepositForm(false)}
              className="absolute top-4 left-4 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined">cancel</span>
            </button>
            
            <h3 className="text-xl font-bold text-primary mb-6 font-['Tajawal']">طلب إيداع NEX</h3>
            
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">المبلغ (NEX)</label>
                <input
                  type="number"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-sm px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                  placeholder="مثال: 100"
                />
                {depositAmount && (
                  <p className="text-xs text-on-surface-variant mt-1 font-['Tajawal']">
                    المبلغ المطلوب تحويله: <span className="font-['Space_Grotesk']">{Number(depositAmount) * 15} EGP</span>
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">صورة إيصال التحويل</label>
                <div className="flex gap-2">
                  {proofURL ? (
                    <div className="flex-1 bg-surface-container-highest border border-outline-variant/30 rounded-sm px-4 py-3 text-primary-container flex items-center justify-between">
                      <span className="text-sm font-['Tajawal']">تم رفع الإيصال بنجاح</span>
                      <button type="button" onClick={() => setProofURL('')} className="text-error hover:text-error/80">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofUpload}
                      disabled={isSubmitting}
                      required
                      className="flex-1 bg-surface-container-highest border border-outline-variant/30 rounded-sm px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk'] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container/10 file:text-primary-container hover:file:bg-primary-container/20"
                    />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1 font-['Tajawal']">يرجى رفع صورة واضحة لإيصال الدفع.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-container text-on-primary font-bold py-3 rounded-sm hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all disabled:opacity-50 mt-4 font-['Tajawal']"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Form Modal */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container/90 backdrop-blur-xl border border-primary-container/30 rounded-sm p-8 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowWithdrawForm(false)}
              className="absolute top-4 left-4 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined">cancel</span>
            </button>
            
            <h3 className="text-xl font-bold text-primary mb-6 font-['Tajawal']">طلب سحب NEX</h3>
            
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">المبلغ (NEX)</label>
                <input
                  type="number"
                  min="1"
                  max={profile?.balanceNEX || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-sm px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                  placeholder="مثال: 100"
                />
                <p className="text-xs text-on-surface-variant mt-1 font-['Tajawal']">
                  الرصيد المتاح: <span className="font-['Space_Grotesk']">{profile?.balanceNEX || 0} NEX</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">تفاصيل وسيلة الدفع</label>
                <textarea
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-sm px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                  placeholder="مثال: فودافون كاش (010XXXXXXXX) أو رقم الحساب البنكي"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !withdrawAmount || Number(withdrawAmount) <= 0}
                className="w-full bg-primary-container text-on-primary font-bold py-3 rounded-sm hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all disabled:opacity-50 mt-4 font-['Tajawal']"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد طلب السحب'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Requests (Deposit & Withdraw) */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-primary mb-4 font-['Tajawal']">طلبات الإيداع</h3>
            <div className="space-y-4">
              {depositRequests.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant/30 rounded-sm p-6 text-center text-on-surface-variant font-['Tajawal']">
                  لا توجد طلبات إيداع سابقة
                </div>
              ) : (
                depositRequests.map((req) => (
                  <div key={req.id} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/30 transition-all duration-300 rounded-sm p-4 flex items-center justify-between">
                    <div>
                      <p className="text-on-surface font-medium font-['Tajawal']">إيداع <span className="font-['Space_Grotesk']">{req.amountNEX} NEX</span></p>
                      <p className="text-xs text-on-surface-variant font-['Space_Grotesk']">{new Date(req.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' && <span className="flex items-center gap-1 text-tertiary-fixed-dim text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">schedule</span> قيد المراجعة</span>}
                      {req.status === 'approved' && <span className="flex items-center gap-1 text-primary-container text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">check_circle</span> تمت الموافقة</span>}
                      {req.status === 'rejected' && <span className="flex items-center gap-1 text-error text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">cancel</span> مرفوض</span>}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-primary mb-4 font-['Tajawal']">طلبات السحب</h3>
            <div className="space-y-4">
              {withdrawRequests.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant/30 rounded-sm p-6 text-center text-on-surface-variant font-['Tajawal']">
                  لا توجد طلبات سحب سابقة
                </div>
              ) : (
                withdrawRequests.map((req) => (
                  <div key={req.id} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/30 transition-all duration-300 rounded-sm p-4 flex items-center justify-between">
                    <div>
                      <p className="text-on-surface font-medium font-['Tajawal']">سحب <span className="font-['Space_Grotesk']">{req.amountNEX} NEX</span></p>
                      <p className="text-xs text-on-surface-variant font-['Space_Grotesk']">{new Date(req.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' && <span className="flex items-center gap-1 text-tertiary-fixed-dim text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">schedule</span> قيد المراجعة</span>}
                      {req.status === 'approved' && <span className="flex items-center gap-1 text-primary-container text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">check_circle</span> تم السحب</span>}
                      {req.status === 'rejected' && <span className="flex items-center gap-1 text-error text-sm font-['Tajawal']"><span className="material-symbols-outlined text-sm">cancel</span> مرفوض</span>}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="text-xl font-bold text-primary mb-4 font-['Tajawal']">سجل المعاملات</h3>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="bg-surface-container border border-outline-variant/30 rounded-sm p-6 text-center text-on-surface-variant font-['Tajawal']">
                لا توجد معاملات سابقة
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary-container/30 transition-all duration-300 rounded-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center border border-outline-variant/20 ${
                      tx.type === 'deposit' || tx.type === 'earning' ? 'bg-primary-container/10 text-primary-container' : 'bg-error/10 text-error'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'earning' ? <span className="material-symbols-outlined">south_west</span> : <span className="material-symbols-outlined">north_east</span>}
                    </div>
                    <div>
                      <p className="text-on-surface font-medium font-['Tajawal']">{tx.description}</p>
                      <p className="text-xs text-on-surface-variant font-['Space_Grotesk']">{new Date(tx.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  <span className={`font-bold font-['Space_Grotesk'] ${
                    tx.type === 'deposit' || tx.type === 'earning' ? 'text-primary-container' : 'text-error'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'earning' ? '+' : ''}{tx.amountNEX}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}