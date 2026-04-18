'use client';

import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, query, orderBy, limit, updateDoc, increment } from 'firebase/firestore';
import { getUserProfile } from '@/lib/database.adapter';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: broadcasterId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [broadcaster, setBroadcaster] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reactions, setReactions] = useState<{ id: number, emoji: string, left: number }[]>([]);

  const triggerLocalReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 80 + 10; // 10% to 90%
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchBroadcaster = async () => {
      const profile = await getUserProfile(broadcasterId);
      setBroadcaster(profile);
      setIsLive(profile?.isLive || false);
      setLoading(false);
    };

    fetchBroadcaster();

    // Subscribe to live status and viewer count
    const unsubProfile = onSnapshot(doc(db, 'users', broadcasterId), (doc) => {
      const data = doc.data();
      setIsLive(data?.isLive || false);
      setViewers(data?.liveViewers || 0);
    });

    // Subscribe to live chat
    const q = query(
      collection(db, `lives/${broadcasterId}/chat`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubChat = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    });

    // Subscribe to reactions
    const qReactions = query(
      collection(db, `lives/${broadcasterId}/reactions`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    let initialLoad = true;
    const unsubReactions = onSnapshot(qReactions, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          triggerLocalReaction(data.emoji);
        }
      });
    });

    // Increment viewer count if not the broadcaster
    if (user && user.uid !== broadcasterId) {
       updateDoc(doc(db, 'users', broadcasterId), {
         liveViewers: increment(1)
       });
    }

    return () => {
      unsubscribeAuth();
      unsubProfile();
      unsubChat();
      unsubReactions();
      if (user && user.uid !== broadcasterId) {
        updateDoc(doc(db, 'users', broadcasterId), {
          liveViewers: increment(-1)
        });
      }
    };
  }, [broadcasterId, user]);

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    triggerLocalReaction(emoji);
    try {
      await addDoc(collection(db, `lives/${broadcasterId}/reactions`), {
        emoji,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, `lives/${broadcasterId}/chat`), {
        senderId: user.uid,
        senderName: user.displayName || 'مستخدم',
        text: newMessage.trim(),
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending live message:", error);
    }
  };

  const handleSendGift = async (amount: number) => {
    if (!user || user.uid === broadcasterId) return;
    
    // Check balance
    const userProfile = await getUserProfile(user.uid);
    if ((userProfile?.balanceNEX || 0) < amount) {
      alert('رصيدك غير كافٍ لإرسال هذه الهدية.');
      return;
    }

    try {
      // Deduct from user
      await updateDoc(doc(db, 'users', user.uid), { balanceNEX: increment(-amount) });
      // Add to broadcaster
      await updateDoc(doc(db, 'users', broadcasterId), { balanceNEX: increment(amount) });
      
      // Record transaction for user
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'gift',
        amountNEX: amount,
        description: `إرسال هدية لـ ${broadcaster?.displayName}`,
        createdAt: new Date().toISOString()
      });

      // Record transaction for broadcaster
      await addDoc(collection(db, 'transactions'), {
        userId: broadcasterId,
        type: 'earning',
        amountNEX: amount,
        description: `هدية من ${user.displayName}`,
        createdAt: new Date().toISOString()
      });

      // Send special message to chat
      await addDoc(collection(db, `lives/${broadcasterId}/chat`), {
        senderId: 'system',
        text: `أرسل ${user.displayName} هدية بقيمة ${amount} NEX! 🎁`,
        createdAt: new Date().toISOString(),
        isGift: true
      });

    } catch (error) {
      console.error("Error sending gift:", error);
    }
  };

  const toggleLive = async () => {
    if (user?.uid !== broadcasterId) return;
    try {
      await updateDoc(doc(db, 'users', broadcasterId), {
        isLive: !isLive,
        liveViewers: !isLive ? 0 : 0
      });
      setIsLive(!isLive);
    } catch (error) {
      console.error("Error toggling live:", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full bg-primary-container animate-bounce" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 h-[calc(100vh-5rem)] flex flex-col md:flex-row gap-4">
      
      {/* Video Stream Area */}
      <div className="flex-1 bg-black rounded-3xl overflow-hidden relative flex flex-col border border-outline-variant/10 shadow-2xl">
        {isLive ? (
          <div className="w-full h-full relative">
            {/* Mock Video Stream */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10"></div>
            <Image 
              fill 
              src={`https://picsum.photos/seed/${broadcasterId}/1280/720`} 
              alt="Live Stream" 
              className="object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            
            {/* Overlay Info */}
            <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  LIVE
                </div>
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs flex items-center gap-2 border border-white/10">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  {viewers}
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                <div className="w-10 h-10 rounded-full border border-primary-container/30 overflow-hidden">
                   <Image fill src={broadcaster?.photoURL || 'https://picsum.photos/seed/user/100/100'} alt={broadcaster?.displayName} className="object-cover" />
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold font-['Tajawal']">{broadcaster?.displayName}</p>
                  <p className="text-white/60 text-[10px] font-['Tajawal']">مستشار معتمد</p>
                </div>
              </div>
            </div>

            {/* Gifts Animation Area (Placeholder) */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              {reactions.map(reaction => (
                <div
                  key={reaction.id}
                  className="absolute bottom-20 text-3xl animate-float-up opacity-0"
                  style={{ left: `${reaction.left}%` }}
                >
                  {reaction.emoji}
                </div>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-center">
              <div className="flex gap-2">
                {user?.uid !== broadcasterId && (
                  <>
                    <button onClick={() => handleReaction('❤️')} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center group">
                      <span className="text-xl group-hover:scale-125 transition-transform">❤️</span>
                    </button>
                    <button onClick={() => handleReaction('🔥')} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center group">
                      <span className="text-xl group-hover:scale-125 transition-transform">🔥</span>
                    </button>
                    <button onClick={() => handleReaction('👏')} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center group">
                      <span className="text-xl group-hover:scale-125 transition-transform">👏</span>
                    </button>
                    <div className="w-px h-8 bg-white/20 self-center mx-2"></div>
                    <button onClick={() => handleSendGift(10)} className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center group">
                      <span className="material-symbols-outlined group-hover:scale-125 transition-transform">card_giftcard</span>
                    </button>
                    <button onClick={() => handleSendGift(50)} className="w-12 h-12 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 hover:bg-primary-container hover:text-black transition-all flex items-center justify-center group">
                      <span className="material-symbols-outlined group-hover:scale-125 transition-transform">diamond</span>
                    </button>
                  </>
                )}
              </div>
              
              {user?.uid === broadcasterId && (
                <button onClick={toggleLive} className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors font-['Tajawal']">
                  إنهاء البث
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-lowest text-on-surface-variant gap-4">
            <span className="material-symbols-outlined text-8xl opacity-20">videocam_off</span>
            <p className="text-xl font-bold font-['Tajawal']">البث متوقف حالياً</p>
            {user?.uid === broadcasterId && (
              <button onClick={toggleLive} className="px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">
                بدء البث الآن
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Chat Area */}
      <div className="w-full md:w-80 bg-surface-container/40 border border-outline-variant/10 rounded-3xl flex flex-col overflow-hidden h-[40vh] md:h-auto glass-obsidian">
        <div className="p-4 border-b border-outline-variant/20 bg-surface-container-highest flex items-center justify-between">
          <h3 className="font-bold text-on-surface font-['Tajawal']">الدردشة المباشرة</h3>
          <span className="text-[10px] text-primary-container font-bold animate-pulse">LIVE</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              {msg.senderId === 'system' ? (
                <div className="bg-yellow-500/10 text-yellow-500 text-[10px] py-1 px-3 rounded-full self-center border border-yellow-500/20 font-['Tajawal']">
                  {msg.text}
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-primary-container font-['Tajawal'] whitespace-nowrap">{msg.senderName}:</span>
                  <span className="text-xs text-on-surface font-['Tajawal'] leading-relaxed">{msg.text}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="قل شيئاً..."
              className="flex-1 bg-surface-container-highest border border-outline-variant/30 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary-container/50 text-on-surface font-['Tajawal']"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !user}
              className="p-2 rounded-xl bg-primary-container/10 text-primary-container hover:bg-primary-container/20 disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
