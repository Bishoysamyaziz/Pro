import { auth, db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, where, updateDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getUserProfile = async (uid: string) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

export const createUserProfile = async (uid: string, data: any) => {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    balanceNEX: 0,
    followersCount: 0,
    postsCount: 0,
    createdAt: new Date().toISOString()
  });
};

export const updateUserProfile = async (uid: string, data: any) => {
  await updateDoc(doc(db, 'users', uid), data);
};

export const createPost = async (userId: string, content: string, mediaURL?: string, authorName?: string, authorPhoto?: string) => {
  await addDoc(collection(db, 'posts'), {
    userId,
    authorName: authorName || 'مستخدم',
    authorPhoto: authorPhoto || '',
    content,
    mediaURL: mediaURL || null,
    mediaType: mediaURL ? 'image' : 'text',
    createdAt: new Date().toISOString(),
    likes: [],
    commentsCount: 0
  });
};

export const subscribeToPosts = (sortBy: 'latest' | 'trending', callback: (posts: any[]) => void) => {
  let q;
  if (sortBy === 'trending') {
    // Note: Firestore doesn't support ordering by array length directly.
    // We would need a separate 'likesCount' field. Since we don't have it,
    // we'll fetch latest and sort client-side, or we can just order by createdAt for now
    // and sort client side for trending.
    q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (snapshot) => {
    let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (sortBy === 'trending') {
      posts = posts.sort((a: any, b: any) => (b.likes?.length || 0) - (a.likes?.length || 0));
    }
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'posts');
  });
};

export const subscribeToUserPosts = (uid: string, callback: (posts: any[]) => void) => {
  const q = query(collection(db, 'posts'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `posts (user: ${uid})`);
  });
};

export const applyToBeExpert = async (uid: string, data: any) => {
  await addDoc(collection(db, 'experts'), {
    uid,
    ...data,
    isApproved: false,
    rating: 0,
    reviewsCount: 0,
    createdAt: new Date().toISOString()
  });
};

export const subscribeToTopExperts = (callback: (experts: any[]) => void) => {
  const q = query(collection(db, 'experts'), where('isApproved', '==', true), orderBy('rating', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const experts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(experts.slice(0, 5));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'experts (top)');
  });
};

export const uploadVideo = async (userId: string, videoURL: string, caption: string) => {
  await addDoc(collection(db, 'videos'), {
    userId,
    videoURL,
    caption,
    createdAt: new Date().toISOString(),
    likes: [],
    commentsCount: 0
  });
};

export const followUser = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  await setDoc(doc(db, 'followers', followId), {
    followerId,
    followingId,
    createdAt: new Date().toISOString()
  });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  // In a real app, we'd delete the doc. For simplicity here:
  await setDoc(doc(db, 'followers', followId), { deleted: true });
};

export const checkIsFollowing = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  const docSnap = await getDoc(doc(db, 'followers', followId));
  return docSnap.exists() && !docSnap.data()?.deleted;
};
