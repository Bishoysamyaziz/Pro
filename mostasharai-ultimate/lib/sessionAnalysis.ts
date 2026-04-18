import { db } from './firebase';
import { doc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export async function analyzeAndSaveSession(sessionId: string, expertName: string, clientName: string): Promise<string> {
  try {
    // Fetch all messages
    const messagesRef = collection(db, 'consultations', sessionId, 'chatMessages');
    const snap = await getDocs(query(messagesRef, orderBy('createdAt', 'asc')));
    const messages = snap.docs.map(d => ({
      senderName: d.data().senderName || 'مجهول',
      content: d.data().content || '',
    }));

    if (messages.length === 0) {
      const summary = 'لم تتضمن هذه الجلسة رسائل نصية لتحليلها.';
      await updateDoc(doc(db, 'consultations', sessionId), { summary, analyzedAt: new Date() });
      return summary;
    }

    // Call our API route
    const res = await fetch('/api/analyze-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, expertName, clientName, sessionId }),
    });

    const { summary } = await res.json();
    await updateDoc(doc(db, 'consultations', sessionId), { summary, analyzedAt: new Date() });
    return summary;
  } catch (err) {
    console.error('Analysis error:', err);
    return 'تعذّر إنشاء ملخص الجلسة.';
  }
}
