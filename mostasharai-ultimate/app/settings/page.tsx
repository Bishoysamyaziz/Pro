'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updatePassword } from 'firebase/auth';
import { getUserProfile, updateUserProfile } from '@/lib/database.adapter';
import { uploadFile } from '@/lib/storage.adapter';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
          setDisplayName(data.displayName || '');
          setBio(data.bio || '');
          setPhotoURL(data.photoURL || '');
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update Firebase Auth
      await updateProfile(auth.currentUser!, {
        displayName: displayName,
        photoURL: photoURL
      });

      // Update Firestore
      await updateUserProfile(user.uid, {
        displayName,
        bio,
        photoURL
      });

      setMessage({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح!' });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء التحديث. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await updatePassword(auth.currentUser!, newPassword);
      setNewPassword('');
      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح!' });
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'يرجى تسجيل الخروج والعودة مرة أخرى لتغيير كلمة المرور لدواعي أمنية.' });
      } else {
        setMessage({ type: 'error', text: 'حدث خطأ أثناء تغيير كلمة المرور.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    try {
      const url = await uploadFile(file, `users/${user.uid}/profile`);
      setPhotoURL(url);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء رفع الصورة.' });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-4xl text-primary-container">settings</span>
        <h1 className="text-3xl font-bold text-primary font-['Space_Grotesk']">الإعدادات</h1>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl font-['Tajawal'] ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="md:col-span-2 space-y-8">
          <section className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-8 glass-obsidian">
            <h2 className="text-xl font-bold text-on-surface mb-6 font-['Tajawal']">تعديل الملف الشخصي</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-24 h-24 rounded-full border-2 border-primary-container/30 overflow-hidden">
                  {isUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                      <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : photoURL ? (
                    <Image fill src={photoURL} alt="Preview" className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-primary-container text-2xl font-bold">
                      {displayName?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">صورة الملف الشخصي</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk'] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container/10 file:text-primary-container hover:file:bg-primary-container/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">الاسم المعروض</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">البريد الإلكتروني (للقراءة فقط)</label>
                  <input 
                    type="email" 
                    value={user?.email}
                    disabled
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface-variant/50 cursor-not-allowed font-['Space_Grotesk']"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">نبذة عنك</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all disabled:opacity-50 font-['Tajawal']"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </form>
          </section>

          <section className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-8 glass-obsidian">
            <h2 className="text-xl font-bold text-on-surface mb-6 font-['Tajawal']">تغيير كلمة المرور</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSaving || !newPassword}
                className="w-full py-3 border border-primary-container/30 text-primary-container font-bold rounded-xl hover:bg-primary-container/10 transition-all disabled:opacity-50 font-['Tajawal']"
              >
                تحديث كلمة المرور
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-6 glass-obsidian">
            <h3 className="font-bold text-on-surface mb-4 font-['Tajawal']">حالة الحساب</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-['Tajawal']">الدور</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-['Tajawal'] ${
                  profile?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                  profile?.role === 'expert' ? 'bg-primary-container/20 text-primary-container' :
                  'bg-outline-variant/20 text-on-surface-variant'
                }`}>
                  {profile?.role === 'admin' ? 'مشرف' : profile?.role === 'expert' ? 'خبير' : 'مستخدم'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-['Tajawal']">تاريخ الانضمام</span>
                <span className="text-sm text-on-surface font-['Space_Grotesk']">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ar-EG') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-['Tajawal']">الرصيد الحالي</span>
                <span className="text-sm text-primary-container font-bold font-['Space_Grotesk']">{profile?.balanceNEX || 0} NEX</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-6 glass-obsidian">
            <h3 className="font-bold text-on-surface mb-4 font-['Tajawal']">تفضيلات النظام</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-['Tajawal']">إشعارات البريد</span>
                <div className="w-10 h-5 bg-primary-container/20 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-primary-container rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-['Tajawal']">الوضع الليلي</span>
                <div className="w-10 h-5 bg-primary-container/20 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-primary-container rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
