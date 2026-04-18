'use client';

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

const SESSION_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('tel_sid') || (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem('tel_sid', id); return id;
    })())
  : 'ssr';

interface TelemetryContextType {
  track: (event: string, data?: Record<string, any>) => void;
}

const TelemetryContext = createContext<TelemetryContextType>({ track: () => {} });

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const queue = useRef<any[]>([]);
  const flushing = useRef(false);

  const flush = async () => {
    if (flushing.current || queue.current.length === 0) return;
    flushing.current = true;
    const batch = queue.current.splice(0, 5);
    try {
      await Promise.all(batch.map(e => addDoc(collection(db, 'telemetry_events'), e)));
    } catch { queue.current.unshift(...batch); }
    flushing.current = false;
  };

  const track = (event: string, data?: Record<string, any>) => {
    queue.current.push({
      userId: user?.uid || null,
      event, page: pathname,
      data: data || {}, sessionId: SESSION_ID,
      timestamp: serverTimestamp()
    });
    setTimeout(flush, 1000);
  };

  // Track page views
  useEffect(() => { track('page_view'); }, [pathname]);

  return (
    <TelemetryContext.Provider value={{ track }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export const useTelemetry = () => useContext(TelemetryContext);
