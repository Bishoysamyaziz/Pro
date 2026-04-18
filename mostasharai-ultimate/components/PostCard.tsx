'use client';

import { useState, memo } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Post } from '@/types';
import { useAuth } from '@/context/AuthContext';
import CommentSection from './CommentSection';
import Image from 'next/image';

interface PostCardProps { post: Post; }

const PostCard = memo(({ post }: PostCardProps) => {
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLiked = user ? post.likes.includes(user.uid) : false;
  const isOwner = user?.uid === post.userId;
  const isAdmin = profile?.role === 'admin_owner';

  const handleLike = async () => {
    if (!user) return;
    const ref = doc(db, 'posts', post.id);
    if (isLiked) await updateDoc(ref, { likes: arrayRemove(user.uid) });
    else {
      await updateDoc(ref, { likes: arrayUnion(user.uid) });
      if (post.userId !== user.uid) {
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId, message: `أعجب ${profile?.displayName} بمنشورك`,
          read: false, type: 'like', relatedId: post.id, createdAt: serverTimestamp()
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    await deleteDoc(doc(db, 'posts', post.id));
    if (post.imageUrl) {
      try {
        const { getStorage, ref: storageRef, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        await deleteObject(storageRef(storage, post.imageUrl));
      } catch {}
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeAgo = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ar })
    : 'الآن';

  return (
    <article className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {post.userPhotoURL ? (
              <Image src={post.userPhotoURL} alt={post.userDisplayName} width={44} height={44}
                className="rounded-full object-cover ring-2 ring-[#1e1e1e]" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00f2ff]/30 to-[#00f2ff]/10 flex items-center justify-center text-[#00f2ff] font-bold text-lg ring-2 ring-[#1e1e1e]">
                {post.userDisplayName?.[0] || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{post.userDisplayName}</p>
            <p className="text-gray-500 text-xs">{timeAgo}</p>
          </div>
        </div>
        {(isOwner || isAdmin) && (
          <button onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-2 rounded-lg hover:bg-red-400/10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-200 leading-relaxed text-sm whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <Image src={post.imageUrl} alt="صورة المنشور" fill className="object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 py-3 border-t border-[#1a1a1a]">
        <button onClick={handleLike} disabled={!user}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            isLiked ? 'text-[#00f2ff] bg-[#00f2ff]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}>
          <svg className={`w-5 h-5 transition-transform ${isLiked ? 'scale-110' : ''}`}
            fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{post.likes.length > 0 ? post.likes.length : ''}</span>
        </button>

        <button onClick={() => setShowComments(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.commentsCount > 0 ? post.commentsCount : ''}</span>
        </button>

        <button onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all ml-auto">
          {copied ? (
            <span className="text-[#00f2ff] text-xs">تم النسخ ✓</span>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} onClose={() => setShowComments(false)} authorId={post.userId} />}
    </article>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
