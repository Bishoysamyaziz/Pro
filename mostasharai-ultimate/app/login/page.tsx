'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { createUserProfile, getUserProfile } from '@/lib/database.adapter';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(userCredential.user.uid);
        if (profile?.isBanned) {
          await auth.signOut();
          throw new Error('تم حظر هذا الحساب من قبل الإدارة.');
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user.uid, {
          email,
          displayName: name,
          role: 'user'
        });
      }
      if (profile?.role === 'admin_owner') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المصادقة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if profile exists, if not create one
      const profile = await getUserProfile(result.user.uid);
      if (profile?.isBanned) {
        await auth.signOut();
        throw new Error('تم حظر هذا الحساب من قبل الإدارة.');
      }
      
      if (!profile) {
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          role: 'user'
        });
      }
      if (googleProfile?.role === 'admin_owner') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول بحساب جوجل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-8 neon-glow-primary">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4 border border-primary-container/30">
            <span className="material-symbols-outlined text-primary-container text-3xl">hub</span>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2 font-['Space_Grotesk']">
            {isLogin ? 'مرحباً بعودتك' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-on-surface-variant text-sm font-['Tajawal']">
            نقطة التقاء المعرفة والخبرة
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/50 text-error p-3 rounded-xl mb-6 text-sm text-center font-['Tajawal']">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 transition-colors font-['Tajawal']"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 transition-colors font-['Tajawal']"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container/50 transition-colors font-['Tajawal']"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-container text-on-primary-container font-bold py-3 rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all disabled:opacity-50 mt-6 font-['Tajawal']"
          >
            {isLoading ? 'جاري المعالجة...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-container text-on-surface-variant font-['Tajawal']">أو</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 font-['Tajawal']"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            المتابعة باستخدام جوجل
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-on-surface-variant font-['Tajawal']">
          {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? 'سجل الآن' : 'سجل الدخول'}
          </button>
        </p>
      </div>
    </div>
  );
}