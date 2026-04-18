'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, onSnapshot,
  addDoc, serverTimestamp, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useInView } from 'react-intersection-observer';
import PostCard from '@/components/PostCard';
import VideoCard from '@/components/VideoCard';
import Link from 'next/link';
import Image from 'next/image';
import { FaPlus, FaImage, FaTimes, FaFire, FaClock, FaUsers,
  FaPlay, FaLightbulb, FaSpinner, FaVideo } from 'react-icons/fa';

const PAGE_SIZE = 8;

export default function HomePage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'feed' | 'reels'>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');

  // Post creation
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });

  // Initial posts load
  useEffect(() => {
    setLoadingPosts(true);
    setPosts([]);
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingPosts(false);
    });
    return unsub;
  }, [sortBy]);

  // Load more on scroll
  useEffect(() => {
    if (!inView || !hasMore || loadingMore || !lastDoc) return;
    const loadMore = async () => {
      setLoadingMore(true);
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      setPosts(p => [...p, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    };
    loadMore();
  }, [inView, hasMore, lastDoc, loadingMore]);

  // Videos
  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(12));
    return onSnapshot(q, snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // Top experts
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(5));
    getDocs(q).then(snap => {
      setExperts(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter((u: any) => u.role === 'expert'));
    });
  }, []);

  const handlePost = async () => {
    if (!postText.trim() || !user || !profile || posting) return;
    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${postImage.name}`);
        const task = uploadBytesResumable(storageRef, postImage);
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed',
            s => setUploadProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
            reject,
            async () => { imageUrl = await getDownloadURL(task.snapshot.ref); resolve(); }
          );
        });
      }
      await addDoc(collection(db, 'posts'), {
        userId: user.uid, userDisplayName: profile.displayName,
        userPhotoURL: profile.photoURL || '',
        content: postText.trim(), imageUrl,
        likes: [], commentsCount: 0, createdAt: serverTimestamp()
      });
      setPostText(''); setPostImage(null); setPostPreview('');
      setShowCreate(false); setUploadProgress(0);
    } catch (e) { console.error(e); }
    finally { setPosting(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPostImage(f); setPostPreview(URL.createObjectURL(f)); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero — only for non-logged-in */}
      {!user && (
        <div className="relative rounded-3xl overflow-hidden mb-8 p-8 sm:p-12"
          style={{ background: 'linear-gradient(135deg, #050505 0%, #0a1628 50%, #050505 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #00f2ff 0%, transparent 60%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(0,242,255,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(0,242,255,0.2)' }}>
              <FaLightbulb className="w-3 h-3" /> منصة الاستشارات العربية الأولى
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight" style={{ color: 'var(--color-text)' }}>
              حيث تتحول<br />
              <span className="text-glow" style={{ color: 'var(--color-accent)' }}>المعرفة إلى قيمة</span>
            </h1>
            <p className="text-base sm:text-lg mb-6" style={{ color: 'var(--color-text-2)' }}>
              تواصل مع أفضل الخبراء العرب في القانون، المال، الأعمال، والتقنية
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/experts" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black"
                style={{ background: 'var(--color-accent)' }}>
                <FaUsers className="w-4 h-4" /> تصفّح الخبراء
              </Link>
              <Link href="/register" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                ابدأ مجاناً + 50 NEX
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              {[
                { id: 'feed', label: 'المنشورات', labelEn: 'Feed', icon: FaFire },
                { id: 'reels', label: 'ريلز', labelEn: 'Reels', icon: FaPlay },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all"
                  style={tab === t.id
                    ? { background: 'var(--color-accent)', color: '#000' }
                    : { color: 'var(--color-text-2)', background: 'var(--color-surface)' }}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
            {tab === 'feed' && (
              <div className="flex gap-2 mr-auto">
                {[
                  { val: 'latest', icon: FaClock, label: 'الأحدث' },
                  { val: 'trending', icon: FaFire, label: 'الأكثر تفاعلاً' },
                ].map(s => (
                  <button key={s.val} onClick={() => setSortBy(s.val as any)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={sortBy === s.val
                      ? { background: 'var(--color-accent-glow)', color: 'var(--color-accent)', border: '1px solid rgba(0,242,255,0.3)' }
                      : { color: 'var(--color-text-3)' }}>
                    <s.icon className="w-3 h-3" /> {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create post */}
          {user && tab === 'feed' && (
            <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {!showCreate ? (
                <button onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-right transition-all"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px dashed var(--color-border-2)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-xs"
                    style={{ background: 'var(--color-accent)' }}>
                    {profile?.displayName?.[0]}
                  </div>
                  ماذا يدور في ذهنك؟ Share your thoughts...
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea value={postText} onChange={e => setPostText(e.target.value)}
                    placeholder="ماذا يدور في ذهنك؟ / What's on your mind?" rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none transition-colors"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  {postPreview && (
                    <div className="relative rounded-xl overflow-hidden">
                      <Image src={postPreview} alt="preview" width={600} height={300} className="w-full object-cover max-h-48" />
                      <button onClick={() => { setPostImage(null); setPostPreview(''); }}
                        className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90">
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {posting && uploadProgress > 0 && (
                    <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-border)' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'var(--color-accent)' }} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all"
                      style={{ color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
                      <FaImage className="w-4 h-4" /> صورة
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <div className="flex gap-2 mr-auto">
                      <button onClick={() => { setShowCreate(false); setPostText(''); setPostImage(null); setPostPreview(''); }}
                        className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--color-text-2)' }}>إلغاء</button>
                      <button onClick={handlePost} disabled={!postText.trim() || posting}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                        style={{ background: 'var(--color-accent)' }}>
                        {posting ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaPlus className="w-3 h-3" />}
                        نشر
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feed or Reels */}
          {tab === 'feed' ? (
            <div className="space-y-4">
              {loadingPosts ? (
                [...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <FaFire className="w-10 h-10" style={{ color: 'var(--color-text-3)' }} />
                  <p style={{ color: 'var(--color-text-2)' }}>لا توجد منشورات بعد. كن أول من ينشر!</p>
                  {user && <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-black" style={{ background: 'var(--color-accent)' }}>إنشاء منشور</button>}
                </div>
              ) : (
                <>
                  {posts.map(p => <PostCard key={p.id} post={p} />)}
                  <div ref={loadMoreRef} className="h-4" />
                  {loadingMore && <div className="flex justify-center py-4"><FaSpinner className="animate-spin w-5 h-5" style={{ color: 'var(--color-accent)' }} /></div>}
                  {!hasMore && posts.length > 0 && (
                    <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-3)' }}>— لقد وصلت للنهاية —</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {videos.map(v => (
                <div key={v.id} style={{ aspectRatio: '9/16' }}>
                  <VideoCard video={v} />
                </div>
              ))}
              {videos.length === 0 && (
                <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-4">
                  <FaVideo className="w-10 h-10" style={{ color: 'var(--color-text-3)' }} />
                  <p style={{ color: 'var(--color-text-2)' }}>لا توجد ريلز بعد</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar – Top experts */}
        <div className="hidden lg:block space-y-4">
          <div className="rounded-2xl border p-4 sticky top-24"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>خبراء مميزون</h3>
              <Link href="/experts" className="text-xs" style={{ color: 'var(--color-accent)' }}>عرض الكل</Link>
            </div>
            <div className="space-y-3">
              {experts.slice(0, 5).map((e: any) => (
                <Link key={e.uid} href={`/expert/${e.uid}`}
                  className="flex items-center gap-3 p-2 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black text-sm"
                    style={{ background: 'var(--color-accent)' }}>
                    {e.displayName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{e.displayName}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-2)' }}>
                      {e.specialties?.[0] || 'خبير'}
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                    {e.hourlyRate || 80} NEX
                  </span>
                </Link>
              ))}
              {experts.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-3)' }}>لا يوجد خبراء بعد</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
