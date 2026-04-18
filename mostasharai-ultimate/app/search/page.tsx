'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'experts' | 'users' | 'posts'>('all');
  const [results, setResults] = useState({ experts: [], users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const expertsSnapshot = await getDocs(collection(db, 'experts'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const postsSnapshot = await getDocs(collection(db, 'posts'));

      const expertsData = expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const queryLower = searchQuery.toLowerCase();

      const matchedExperts = expertsData.filter((exp: any) => 
        exp.title?.toLowerCase().includes(queryLower) || 
        exp.bio?.toLowerCase().includes(queryLower) ||
        exp.categories?.some((cat: string) => cat.toLowerCase().includes(queryLower))
      );

      const matchedUsers = usersData.filter((u: any) => 
        u.displayName?.toLowerCase().includes(queryLower) || 
        u.email?.toLowerCase().includes(queryLower)
      );

      const matchedPosts = postsData.filter((p: any) => 
        p.content?.toLowerCase().includes(queryLower)
      );

      // Map user data to experts
      const mappedExperts = matchedExperts.map((exp: any) => {
        const userData = usersData.find((u: any) => u.uid === exp.uid);
        return { ...exp, user: userData };
      });

      setResults({
        experts: mappedExperts as any,
        users: matchedUsers as any,
        posts: matchedPosts as any
      });
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-6 font-['Space_Grotesk']">البحث الشامل</h1>
        <form onSubmit={handleSearch} className="relative">
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="ابحث عن خبراء، مستخدمين، أو منشورات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-2xl pr-12 pl-4 py-4 text-lg text-on-surface focus:outline-none focus:border-primary-container/50 font-['Tajawal'] shadow-lg"
          />
          <button 
            type="submit"
            className="absolute left-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_15px_#00f2ff] transition-all font-['Tajawal']"
          >
            بحث
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar border-b border-outline-variant/10">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'all' 
              ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : 'bg-surface-container-highest text-on-surface-variant hover:text-primary'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setActiveTab('experts')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'experts' 
              ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : 'bg-surface-container-highest text-on-surface-variant hover:text-primary'
          }`}
        >
          الخبراء ({results.experts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'users' 
              ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : 'bg-surface-container-highest text-on-surface-variant hover:text-primary'
          }`}
        >
          المستخدمين ({results.users.length})
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'posts' 
              ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : 'bg-surface-container-highest text-on-surface-variant hover:text-primary'
          }`}
        >
          المنشورات ({results.posts.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>
      ) : (
        <div className="space-y-8">
          {/* Experts Results */}
          {(activeTab === 'all' || activeTab === 'experts') && results.experts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-primary mb-4 font-['Tajawal'] flex items-center gap-2">
                <span className="material-symbols-outlined">workspace_premium</span>
                الخبراء
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.experts.map((expert: any) => (
                  <Link href="/experts" key={expert.id}>
                    <div className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4 hover:border-primary-container/50 transition-colors glass-obsidian">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest flex-shrink-0">
                        {expert.user?.photoURL ? (
                          <Image fill alt={expert.user?.displayName || 'Expert'} src={expert.user.photoURL} className="object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-bold">
                            {expert.user?.displayName?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-on-surface font-['Tajawal']">{expert.user?.displayName || 'مستخدم'}</h3>
                        <p className="text-sm text-primary-container font-['Tajawal']">{expert.title}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-primary mb-4 font-['Tajawal'] flex items-center gap-2">
                <span className="material-symbols-outlined">group</span>
                المستخدمين
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users.map((u: any) => (
                  <div key={u.id} className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4 glass-obsidian">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest flex-shrink-0">
                      {u.photoURL ? (
                        <Image fill alt={u.displayName || 'User'} src={u.photoURL} className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-bold">
                          {u.displayName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface font-['Tajawal']">{u.displayName || 'مستخدم'}</h3>
                      <p className="text-sm text-on-surface-variant font-['Tajawal']">{u.role === 'expert' ? 'خبير' : u.role === 'admin' ? 'مشرف' : 'مستخدم'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Results */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-primary mb-4 font-['Tajawal'] flex items-center gap-2">
                <span className="material-symbols-outlined">article</span>
                المنشورات
              </h2>
              <div className="space-y-4">
                {results.posts.map((post: any) => (
                  <div key={post.id} className="bg-surface-container/40 border border-outline-variant/10 rounded-2xl p-6 glass-obsidian">
                    <p className="text-on-surface font-['Tajawal'] line-clamp-3">{post.content}</p>
                    <span className="text-xs text-on-surface-variant mt-4 block font-['Space_Grotesk']">
                      {new Date(post.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && results.experts.length === 0 && results.users.length === 0 && results.posts.length === 0 && (
            <div className="text-center py-20 bg-surface-container/40 border border-outline-variant/10 rounded-2xl glass-obsidian">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant mx-auto mb-4">search_off</span>
              <h3 className="text-xl font-medium text-on-surface mb-2 font-['Tajawal']">لا توجد نتائج</h3>
              <p className="text-on-surface-variant font-['Tajawal']">لم نتمكن من العثور على أي نتائج تطابق &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
