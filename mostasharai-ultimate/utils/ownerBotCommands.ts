import { db } from '@/lib/firebase';
import {
  doc, updateDoc, deleteDoc, collection,
  query, where, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';

export interface CommandResult {
  success: boolean;
  message: string;
}

export async function executeCommand(cmd: string, executorId: string): Promise<CommandResult> {
  const parts = cmd.trim().split(' ');
  const action = parts[0]?.toLowerCase();

  try {
    // حظر @username
    if (action === 'حظر' && parts[1]?.startsWith('@')) {
      const username = parts[1].slice(1);
      const q = query(collection(db, 'users'), where('displayName', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, message: `❌ المستخدم @${username} غير موجود` };
      await updateDoc(snap.docs[0].ref, { isBanned: true });
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم حظر @${username}` };
    }

    // رفع حظر @username
    if ((action === 'رفع' || action === 'فك') && parts[1]?.startsWith('@')) {
      const username = parts[2]?.startsWith('@') ? parts[2].slice(1) : parts[1].slice(1);
      const q = query(collection(db, 'users'), where('displayName', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, message: `❌ المستخدم غير موجود` };
      await updateDoc(snap.docs[0].ref, { isBanned: false });
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم رفع الحظر عن @${username}` };
    }

    // ترقية @username إلى خبير
    if (action === 'ترقية' && parts[1]?.startsWith('@')) {
      const username = parts[1].slice(1);
      const q = query(collection(db, 'users'), where('displayName', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, message: `❌ المستخدم @${username} غير موجود` };
      await updateDoc(snap.docs[0].ref, { role: 'expert', hourlyRate: 80 });
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم ترقية @${username} إلى خبير` };
    }

    // حذف منشور postID
    if (action === 'حذف' && parts[1] === 'منشور' && parts[2]) {
      await deleteDoc(doc(db, 'posts', parts[2]));
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم حذف المنشور ${parts[2]}` };
    }

    // موافقة إيداع requestID
    if (action === 'موافقة' && parts[1] === 'إيداع' && parts[2]) {
      const reqRef = doc(db, 'depositRequests', parts[2]);
      const reqSnap = await getDocs(query(collection(db, 'depositRequests'), where('__name__', '==', parts[2])));
      if (reqSnap.empty) return { success: false, message: `❌ الطلب غير موجود` };
      const reqData = reqSnap.docs[0].data();
      await updateDoc(reqRef, { status: 'approved' });
      await updateDoc(doc(db, 'users', reqData.userId), {
        balanceNEX: (reqData.currentBalance || 0) + reqData.amount
      });
      await addDoc(collection(db, 'transactions'), {
        userId: reqData.userId, type: 'deposit',
        amount: reqData.amount, description: `إيداع NEX معتمد`,
        createdAt: serverTimestamp()
      });
      await sendNotification(reqData.userId, `✅ تمت الموافقة على طلب إيداعك بقيمة ${reqData.amount} NEX`);
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تمت الموافقة على الإيداع ${parts[2]}` };
    }

    // إرسال إشعار عام "النص"
    if (action === 'إشعار') {
      const msg = parts.slice(1).join(' ').replace(/^"|"$/g, '');
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = usersSnap.docs.map(u =>
        addDoc(collection(db, 'notifications'), {
          userId: u.id, message: msg, read: false,
          type: 'system', createdAt: serverTimestamp()
        })
      );
      await Promise.all(batch);
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم إرسال الإشعار لـ ${usersSnap.size} مستخدم` };
    }

    // منح رصيد @username المبلغ
    if (action === 'رصيد' && parts[1]?.startsWith('@') && parts[2]) {
      const username = parts[1].slice(1);
      const amount = parseInt(parts[2]);
      const q = query(collection(db, 'users'), where('displayName', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, message: `❌ المستخدم غير موجود` };
      const current = snap.docs[0].data().balanceNEX || 0;
      await updateDoc(snap.docs[0].ref, { balanceNEX: current + amount });
      await logCommand(executorId, cmd, true);
      return { success: true, message: `✅ تم إضافة ${amount} NEX لـ @${username}` };
    }

    return { success: false, message: `❓ أمر غير معروف. الأوامر المتاحة: حظر، رفع حظر، ترقية، حذف منشور، موافقة إيداع، إشعار، رصيد` };
  } catch (err: any) {
    await logCommand(executorId, cmd, false);
    return { success: false, message: `❌ خطأ: ${err.message}` };
  }
}

async function logCommand(userId: string, command: string, success: boolean) {
  await addDoc(collection(db, 'owner_commands'), {
    userId, command, success, timestamp: serverTimestamp()
  });
}

async function sendNotification(userId: string, message: string) {
  await addDoc(collection(db, 'notifications'), {
    userId, message, read: false, type: 'system', createdAt: serverTimestamp()
  });
}
