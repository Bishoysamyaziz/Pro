export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'expert' | 'admin_owner';
  balanceNEX: number;
  isBanned: boolean;
  bio: string;
  specialties: string[];
  hourlyRate?: number;
  rating?: number;
  reviewCount?: number;
  isOnline?: boolean;
  createdAt: any;
}

export interface Post {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  commentsCount: number;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  content: string;
  createdAt: any;
}

export interface Video {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  likes: string[];
  commentsCount: number;
  views: number;
  createdAt: any;
}

export interface Session {
  id: string;
  expertId: string;
  expertName: string;
  clientId: string;
  clientName: string;
  scheduledAt: any;
  duration: number;
  cost: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  type: 'text' | 'video' | 'audio';
  review?: string;
  rating?: number;
  notes?: string;
  createdAt: any;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  amount: number;
  proofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'session_payment' | 'session_earning' | 'refund';
  amount: number;
  description: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  type: 'like' | 'comment' | 'session' | 'deposit' | 'system' | 'follow';
  relatedId?: string;
  createdAt: any;
}

export interface TelemetryEvent {
  userId?: string;
  event: string;
  page: string;
  data?: Record<string, any>;
  timestamp: any;
  sessionId: string;
}
