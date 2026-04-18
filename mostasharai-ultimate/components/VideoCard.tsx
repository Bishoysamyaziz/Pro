'use client';

import { useRef, useState, useEffect, memo } from 'react';
import { useInView } from 'react-intersection-observer';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Video } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';

interface Props { video: Video; }

const VideoCard = memo(({ video }: Props) => {
  const { user, profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [viewed, setViewed] = useState(false);

  const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });

  const isLiked = user ? video.likes.includes(user.uid) : false;

  useEffect(() => {
    if (!videoRef.current) return;
    if (inView) {
      videoRef.current.play().then(() => { setPlaying(true); if (!viewed) { setViewed(true); updateDoc(doc(db, 'videos', video.id), { views: increment(1) }); } }).catch(() => {});
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [inView]);

  const handleLike = async () => {
    if (!user) return;
    const ref = doc(db, 'videos', video.id);
    if (isLiked) await updateDoc(ref, { likes: arrayRemove(user.uid) });
    else await updateDoc(ref, { likes: arrayUnion(user.uid) });
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  return (
    <div ref={inViewRef} className="relative bg-black rounded-2xl overflow-hidden group" style={{ aspectRatio: '9/16' }}>
      <video ref={videoRef} src={video.url} loop muted={muted} playsInline preload="metadata"
        className="w-full h-full object-cover" onClick={togglePlay} />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

      {/* Play/pause indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute button */}
      <button onClick={() => setMuted(!muted)}
        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white">
        {muted ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* Right actions */}
      <div className="absolute left-3 bottom-20 flex flex-col gap-4 items-center">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-[#00f2ff]/20' : 'bg-black/40 backdrop-blur'}`}>
            <svg className={`w-6 h-6 ${isLiked ? 'text-[#00f2ff]' : 'text-white'}`}
              fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white text-xs font-bold">{video.likes.length}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-bold">{video.commentsCount}</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-white text-xs">{video.views > 999 ? `${(video.views/1000).toFixed(1)}k` : video.views}</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 right-0 left-0 p-4">
        <div className="flex items-center gap-2 mb-2">
          {video.userPhotoURL ? (
            <Image src={video.userPhotoURL} alt={video.userDisplayName} width={36} height={36} className="rounded-full border-2 border-white/30" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#00f2ff]/20 border-2 border-white/30 flex items-center justify-center text-[#00f2ff] font-bold text-sm">
              {video.userDisplayName?.[0]}
            </div>
          )}
          <span className="text-white font-bold text-sm">{video.userDisplayName}</span>
        </div>
        <p className="text-gray-200 text-sm line-clamp-2">{video.title}</p>
      </div>

      {showComments && (
        <div className="absolute inset-0 z-10">
          {/* lazy import to avoid circular dependency */}
        </div>
      )}
    </div>
  );
});

VideoCard.displayName = 'VideoCard';
export default VideoCard;
