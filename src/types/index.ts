export type Category = 'politics' | 'sports';
export type TrustTier = 'high' | 'mid' | 'low';
export type NotificationType = 'challenge' | 'like';

export interface Profile {
  id: string;
  username: string;
  bio: string;
  avg_trust_score: number;
  takes_count: number;
  created_at: string;
}

export interface Source {
  id: string;
  take_id: string;
  url: string;
  domain: string;
  trust_tier: TrustTier;
  score: number;
  created_at: string;
}

export interface ChallengeSource {
  id: string;
  challenge_id: string;
  url: string;
  domain: string;
  trust_tier: TrustTier;
  score: number;
  created_at: string;
}

export interface Take {
  id: string;
  user_id: string;
  category: Category;
  tags: string[];
  body: string;
  trust_score: number;
  likes_count: number;
  challenges_count: number;
  created_at: string;
  // joined
  profiles?: Profile;
  sources?: Source[];
  user_liked?: boolean;
}

export interface Challenge {
  id: string;
  take_id: string;
  user_id: string;
  body: string;
  trust_score: number;
  likes_count: number;
  created_at: string;
  // joined
  profiles?: Profile;
  challenge_sources?: ChallengeSource[];
  user_liked?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  take_id: string | null;
  challenge_id: string | null;
  actor_id: string;
  read: boolean;
  created_at: string;
  // joined
  actor?: Profile;
  take?: Pick<Take, 'id' | 'body' | 'category'>;
}

export type RootStackParamList = {
  Main: undefined;
  TakeDetail: { takeId: string };
  CreateTake: undefined;
  Profile: { userId: string };
};

export type TabParamList = {
  Feed: undefined;
  Notifications: undefined;
  MyProfile: undefined;
};
