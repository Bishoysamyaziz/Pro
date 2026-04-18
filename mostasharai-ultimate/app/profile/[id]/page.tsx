'use client';

import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, subscribeToUserPosts, updateUserProfile, applyToBeExpert, followUser, unfollowUser, checkIsFollowing } from '@/lib/database.adapter';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage.adapter';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isApplyingExpert, setIsApplyingExpert] = useState(false);
  const [expertTitle, setExpertTitle] = useState('');
  const [expertBio, setExpertBio] = useState('');
  const [expertRate, setExpertRate] = useState(50);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && profileId !== currentUser.uid) {
        const following = await checkIsFollowing(currentUser.uid, profileId);
        setIsFollowing(following);
      }
    });

    const fetchProfile = async () => {
      try {
        // Use onSnapshot for real-time profile updates (like balance and followers)
        const unsubProfile = onSnapshot(doc(db, 'users', profileId), (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setProfile(data);
            setEditName(data.displayName || '');
            setEditBio(data.bio || '');
          }
        });
        return unsubProfile;
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    let unsubProfile: any;
    fetchProfile().then(unsub => unsubProfile = unsub);

    const unsubPosts = subscribeToUserPosts(profileId, (fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubPosts();
      if (unsubProfile) unsubProfile();
    };
  }, [profileId]);

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, profileId);
        setIsFollowing(false);
      } else {
        await followUser(user.uid, profileId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile(profileId, {
        displayName: editName,
        bio: editBio
      });
      setProfile({ ...profile, displayName: editName, bio: editBio });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleApplyExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFile) {
      alert('يرجى إرفاق صورة الهوية');
      return;
    }
    setUploadingId(true);
    try {
      const idCardURL = await uploadFile(idCardFile, `idCards/${profileId}_${Date.now()}`);
      await applyToBeExpert(profileId, {
        title: expertTitle,
        bio: expertBio,
        hourlyRateNEX: expertRate,
        categories: ['عام'],
        idCardURL
      });
      setIsApplyingExpert(false);
      alert('تم إرسال طلبك بنجاح! سيتم مراجعته من قبل الإدارة.');
    } catch (error) {
      console.error("Error applying for expert:", error);
      alert('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setUploadingId(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;

  const isOwnProfile = user?.uid === profileId;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-8 mb-8 glass-obsidian relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="relative w-32 h-32 rounded-full border-4 border-primary-container/30 overflow-hidden shadow-2xl">
              {profile?.photoURL ? (
                <Image fill src={profile.photoURL} alt={profile.displayName} className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-primary-container text-4xl font-bold">
                  {profile?.displayName?.[0] || '?'}
                </div>
              )}
            </div>
            {profile?.isLive && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#050505] animate-pulse">
                LIVE
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-3xl font-bold text-primary mb-2 font-['Space_Grotesk']">{profile?.displayName || 'مستخدم نيكسوس'}</h1>
            <p className="text-on-surface-variant mb-4 font-['Tajawal']">{profile?.bio || 'لا يوجد وصف حتى الآن.'}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-primary-container font-['Space_Grotesk']">{profile?.postsCount || posts.length}</p>
                <p className="text-xs text-on-surface-variant font-['Tajawal']">منشور</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary-container font-['Space_Grotesk']">{profile?.followersCount || 0}</p>
                <p className="text-xs text-on-surface-variant font-['Tajawal']">متابع</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary-container font-['Space_Grotesk']">{profile?.balanceNEX || 0}</p>
                <p className="text-xs text-on-surface-variant font-['Tajawal']">رصيد NEX</p>
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']"
              >
                تعديل الملف
              </button>
              {profile?.role !== 'expert' && (
                <button 
                  onClick={() => setIsApplyingExpert(true)}
                  className="px-6 py-2 border border-primary-container/30 text-primary-container font-bold rounded-xl hover:bg-primary-container/10 transition-all font-['Tajawal']"
                >
                  تصبح خبيراً
                </button>
              )}
              <Link 
                href={`/live/${profileId}`}
                className="px-6 py-2 bg-error/10 text-error border border-error/20 font-bold rounded-xl hover:bg-error/20 transition-all font-['Tajawal'] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">live_tv</span>
                بدء بث مباشر
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button 
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-8 py-2 font-bold rounded-xl transition-all font-['Tajawal'] ${
                  isFollowing 
                    ? 'bg-surface-container-highest text-on-surface border border-outline-variant/30' 
                    : 'bg-primary-container text-on-primary-container hover:shadow-[0_0_20px_#00f2ff]'
                }`}
              >
                {followLoading ? '...' : (isFollowing ? 'إلغاء المتابعة' : 'متابعة')}
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ رابط الملف الشخصي!');
                }}
                className="px-8 py-2 border border-outline-variant/30 text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all font-['Tajawal'] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                مشاركة
              </button>
              {profile?.isLive && (
                <Link 
                  href={`/live/${profileId}`}
                  className="px-8 py-2 bg-error text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all font-['Tajawal'] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">live_tv</span>
                  مشاهدة البث
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-3 font-['Space_Grotesk']">
          <span className="material-symbols-outlined">grid_view</span>
          المنشورات
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-20 bg-surface-container/20 rounded-3xl border border-outline-variant/10 font-['Tajawal'] text-on-surface-variant">
            لا توجد منشورات بعد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <article key={post.id} className="bg-surface-container/40 border border-outline-variant/10 p-6 rounded-2xl glass-obsidian">
                <p className="text-on-surface leading-relaxed mb-4 font-['Tajawal']">{post.content}</p>
                {post.imageUrl && (
                  <div className="aspect-video relative rounded-xl overflow-hidden mb-4 border border-outline-variant/10">
                    <Image fill src={post.imageUrl} alt="Post content" className="object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-on-surface-variant font-['Space_Grotesk']">
                  <span>{new Date(post.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">favorite</span> {post.likes?.length || 0}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-8 w-full max-w-md glass-obsidian">
            <h3 className="text-xl font-bold text-primary mb-6 font-['Tajawal']">تعديل الملف الشخصي</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">الاسم</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">الوصف</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">حفظ</button>
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl hover:bg-outline-variant/10 transition-all font-['Tajawal']">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Expert Modal */}
      {isApplyingExpert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-8 w-full max-w-md glass-obsidian">
            <h3 className="text-xl font-bold text-primary mb-6 font-['Tajawal']">طلب توثيق كخبير</h3>
            <form onSubmit={handleApplyExpert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">المسمى الوظيفي</label>
                <input 
                  type="text" 
                  value={expertTitle}
                  onChange={(e) => setExpertTitle(e.target.value)}
                  placeholder="مثال: مستشار قانوني، مطور برمجيات"
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">نبذة عن خبرتك</label>
                <textarea 
                  value={expertBio}
                  onChange={(e) => setExpertBio(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">سعر الساعة (NEX)</label>
                <input 
                  type="number" 
                  value={expertRate}
                  onChange={(e) => setExpertRate(Number(e.target.value))}
                  min={10}
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Space_Grotesk']"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1 font-['Tajawal']">صورة الهوية</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                  required
                  className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal']"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" disabled={uploadingId} className="flex-1 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal'] disabled:opacity-50">
                  {uploadingId ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
                <button type="button" onClick={() => setIsApplyingExpert(false)} disabled={uploadingId} className="flex-1 py-2 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl hover:bg-outline-variant/10 transition-all font-['Tajawal'] disabled:opacity-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
