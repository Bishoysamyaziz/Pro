import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

export const requestDeposit = async (userId: string, amountNEX: number, proofURL: string) => {
  await addDoc(collection(db, 'depositRequests'), {
    userId,
    amountNEX,
    proofURL,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};

export const processConsultationPayment = async (clientId: string, expertId: string, amountNEX: number) => {
  // Deduct from client
  const clientRef = doc(db, 'users', clientId);
  await updateDoc(clientRef, {
    balanceNEX: increment(-amountNEX)
  });

  // Add to expert
  const expertRef = doc(db, 'users', expertId);
  await updateDoc(expertRef, {
    balanceNEX: increment(amountNEX)
  });

  // Record transactions
  await addDoc(collection(db, 'transactions'), {
    userId: clientId,
    type: 'spent',
    amountNEX,
    description: 'دفع استشارة',
    createdAt: new Date().toISOString()
  });

  await addDoc(collection(db, 'transactions'), {
    userId: expertId,
    type: 'earning',
    amountNEX,
    description: 'أرباح استشارة',
    createdAt: new Date().toISOString()
  });
};

export const requestWithdrawal = async (userId: string, amountNEX: number, paymentDetails: string) => {
  await addDoc(collection(db, 'withdrawRequests'), {
    userId,
    amountNEX,
    paymentDetails,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};
