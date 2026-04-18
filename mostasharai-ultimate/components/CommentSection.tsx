'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Comment } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';

interface Props { postId: string; onClose: () => void; authorId: string; }

export default function CommentSection({ postId, onClose, authorId }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', postId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [postId]);

  const handleSend = async () => {
    if (!text.trim() || !user || !profile || sending) return;
    setSending(true);
    await addDoc(collection(db, 'comments'), {
      postId, userId: user.uid,
      userDisplayName: profile.displayName,
      userPhotoURL: profile.photoURL,
      content: text.trim(), createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    if (authorId !== user.uid) {
      await addDoc(collection(db, 'notifications'), {
        userId: authorId,
        message: `علّق ${profile.displayName} على منشورك: "${text.slice(0, 30)}..."`,
        read: false, type: 'comment', relatedId: postId, createdAt: serverTimestamp()
      });
    }
    setText(''); setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
          <h3 className="text-white font-bold">التعليقات ({comments.length})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-gray-500 text-center py-8 text-sm">لا توجد تعليقات بعد. كن أول من يعلّق!</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="flex-shrink-0">
                {c.userPhotoURL ? (
                  <Image src={c.userPhotoURL} alt={c.userDisplayName} width={36} height={36} className="rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#00f2ff] font-bold text-sm">
                    {c.userDisplayName?.[0] || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-[#1a1a1a] rounded-2xl rounded-tr-sm px-4 py-2">
                  <p className="text-white font-semibold text-xs mb-1">{c.userDisplayName}</p>
                  <p className="text-gray-300 text-sm">{c.content}</p>
                </div>
                <p className="text-gray-600 text-xs mt-1 mr-2">
                  {c.createdAt?.toDate ? formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {user ? (
          <div className="p-4 border-t border-[#1e1e1e]">
            <div className="flex gap-3 items-end">
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="اكتب تعليقاً..." maxLength={500}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-[#00f2ff]/40 transition-colors" />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                className="bg-[#00f2ff] hover:bg-[#00d4e0] disabled:opacity-40 text-black font-bold px-4 py-3 rounded-xl transition-all">
                {sending ? '...' : 'إرسال'}
              </button>
            </div>
          </div>
        ) : (
          <p className="p-4 text-center text-gray-500 text-sm border-t border-[#1e1e1e]">
            <a href="/login" className="text-[#00f2ff]">سجّل دخولك</a> للتعليق
          </p>
        )}
      </div>
    </div>
  );
}
