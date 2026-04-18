'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      router.push('/');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'البريد مستخدم مسبقاً',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
      };
      setError(msgs[err.code] || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00f2ff]/10 border border-[#00f2ff]/20 mb-4">
            <span className="text-[#00f2ff] text-2xl font-black">م</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">إنشاء حساب</h1>
          <p className="text-gray-500">احصل على <span className="text-[#00f2ff] font-bold">50 NEX</span> مجاناً</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">الاسم الكامل</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="محمد أحمد"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#00f2ff]/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@mail.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#00f2ff]/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#00f2ff]/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">تأكيد كلمة المرور</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#00f2ff]/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#00f2ff] hover:bg-[#00d4e0] disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all">
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب مجاناً ✨'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm">
            لديك حساب؟ <Link href="/login" className="text-[#00f2ff] hover:underline">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
