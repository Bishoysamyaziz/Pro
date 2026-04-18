'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaSpinner, FaExclamationTriangle, FaExpand } from 'react-icons/fa';

interface Props {
  sessionId: string;
  userId: string;
  displayName: string;
  onLeave: () => void;
}

interface Participant {
  userId: string;
  displayName: string;
  stream?: MediaStream;
  isSelf: boolean;
}

export default function VideoCallRoom({ sessionId, userId, displayName, onLeave }: Props) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [streamClient, setStreamClient] = useState<any>(null);
  const [call, setCall] = useState<any>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<any[]>([]);
  const [localVideoRef, setLocalVideoRef] = useState<HTMLVideoElement | null>(null);
  const [useStreamSDK, setUseStreamSDK] = useState(false);

  // Try Stream SDK first, fallback to local camera
  useEffect(() => {
    initVideo();
    return () => { cleanup(); };
  }, []);

  const initVideo = async () => {
    try {
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      // Try to init Stream SDK
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (apiKey && apiKey !== 'your_stream_api_key') {
        await initStreamSDK(stream);
      } else {
        setStatus('connected');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('يُرجى السماح بالوصول للكاميرا والميكروفون');
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على كاميرا أو ميكروفون');
      } else {
        setError(err.message);
      }
      setStatus('error');
    }
  };

  const initStreamSDK = async (stream: MediaStream) => {
    try {
      const tokenRes = await fetch('/api/stream-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName }),
      });
      const { token, apiKey } = await tokenRes.json();

      if (token === 'demo_token_configure_stream_secret') {
        setStatus('connected');
        return;
      }

      const { StreamVideoClient } = await import('@stream-io/video-react-sdk');
      const client = new StreamVideoClient({ apiKey, user: { id: userId, name: displayName }, token });
      const callObj = client.call('default', sessionId);
      await callObj.join({ create: true });
      setStreamClient(client);
      setCall(callObj);
      setUseStreamSDK(true);
      setStatus('connected');
    } catch {
      // Fallback to basic camera mode
      setStatus('connected');
    }
  };

  const cleanup = () => {
    localStream?.getTracks().forEach(t => t.stop());
    if (call) call.leave().catch(() => {});
    if (streamClient) streamClient.disconnectUser().catch(() => {});
  };

  useEffect(() => {
    if (localVideoRef && localStream) {
      localVideoRef.srcObject = localStream;
    }
  }, [localVideoRef, localStream]);

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(p => !p);
    if (call) { micOn ? call.microphone.disable() : call.microphone.enable(); }
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(p => !p);
    if (call) { camOn ? call.camera.disable() : call.camera.enable(); }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (call) await call.screenShare.enable();
      if (localVideoRef) localVideoRef.srcObject = screenStream;
      screenStream.getVideoTracks()[0].onended = () => {
        if (localVideoRef && localStream) localVideoRef.srcObject = localStream;
        if (call) call.screenShare.disable();
      };
    } catch {}
  };

  const handleLeave = async () => {
    cleanup();
    onLeave();
  };

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <FaExclamationTriangle className="w-12 h-12 text-yellow-400" />
        <p className="text-center font-bold" style={{ color: 'var(--color-text)' }}>تعذّر الاتصال بالكاميرا</p>
        <p className="text-sm text-center" style={{ color: 'var(--color-text-2)' }}>{error}</p>
        <button onClick={initVideo} className="px-6 py-2.5 rounded-xl font-bold text-sm text-black"
          style={{ background: 'var(--color-accent)' }}>إعادة المحاولة</button>
        <button onClick={onLeave} className="text-sm" style={{ color: 'var(--color-text-2)' }}>مغادرة الجلسة</button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <FaSpinner className="w-10 h-10 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p style={{ color: 'var(--color-text-2)' }}>جاري الاتصال...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#000' }}>
      {/* Video area */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {/* Remote placeholder when alone */}
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mb-4"
            style={{ background: 'var(--color-accent)', color: '#000' }}>
            {displayName?.[0] || '?'}
          </div>
          <p className="text-white font-bold text-lg">{displayName}</p>
          <p className="text-gray-400 text-sm mt-1">
            {useStreamSDK ? 'متصل عبر Stream Video' : 'في انتظار الطرف الآخر...'}
          </p>

          {/* Stream SDK participants */}
          {useStreamSDK && call && (
            <div className="mt-4 text-xs text-gray-500">
              جلسة مباشرة نشطة ✓
            </div>
          )}
        </div>

        {/* Local camera (pip) */}
        <div className="absolute bottom-4 left-4 w-36 sm:w-44 rounded-2xl overflow-hidden border-2 shadow-xl z-10"
          style={{ borderColor: 'var(--color-accent)', aspectRatio: '16/9' }}>
          {camOn ? (
            <video ref={el => setLocalVideoRef(el)} autoPlay muted playsInline
              className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'var(--color-surface)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'var(--color-accent)', color: '#000' }}>
                {displayName?.[0]}
              </div>
            </div>
          )}
          <div className="absolute bottom-1 right-2 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded-md">
            أنت
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 bg-[#0a0a0a]">
        <button onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a]' : 'bg-red-500 hover:bg-red-600'}`}>
          {micOn ? <FaMicrophone className="w-5 h-5 text-white" /> : <FaMicrophoneSlash className="w-5 h-5 text-white" />}
        </button>

        <button onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a]' : 'bg-red-500 hover:bg-red-600'}`}>
          {camOn ? <FaVideo className="w-5 h-5 text-white" /> : <FaVideoSlash className="w-5 h-5 text-white" />}
        </button>

        <button onClick={shareScreen}
          className="w-12 h-12 rounded-full bg-[#1a1a1a] hover:bg-[#2a2a2a] flex items-center justify-center transition-all">
          <FaDesktop className="w-5 h-5 text-white" />
        </button>

        <button onClick={handleLeave}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/30">
          <FaPhoneSlash className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
