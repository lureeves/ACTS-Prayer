export interface PrayerCard {
  text: string;
  ordering: number;
  createdDate: string; // ISO 8601
  stackGroup?: string; // Grouping updates for a single request
  threadId?: string; // Chronological thread
  archived: boolean;
  archivedDate?: string;
  userArchived?: boolean; // Explicitly archived by user action
  originalCategory?: string; // Category it was archived from (e.g. Supplication)
  originalSubject?: string; // Subject it was archived from (e.g. Wife's Family)
  originalTopic?: string; // Topic/root card title it was part of (e.g. Family Request)
  stackOrder?: number;
  eventReminder?: boolean;
  lastPrayed?: string;
  seenCount: number;
  isMarkdown?: boolean;
}

export type ScheduleCadenceType = 'daysOfWeek' | 'everyNWeeks' | 'daysOfMonth';
export type TopicPriority = 'low' | 'medium' | 'high';

export interface EveryNWeeksSchedule {
  interval: number; // e.g. 2 for every 2 weeks
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startDate?: string; // Anchor date
}

export interface PrayerSubject {
  name: string;
  ordering: number;
  createdDate: string;
  lastPrayed?: string;
  schedulingTimestamp?: string;
  priority?: TopicPriority; // 'low' | 'medium' | 'high'
  priorityLevel?: number; // legacy compatibility (e.g. 1=low, 2=medium, 3=high)
  dayOfTheWeekMask?: number; // Bitwise: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
  schedulingMode?: number; // 0 = standard/least-recently-prayed, 1 = scheduled
  scheduleType?: ScheduleCadenceType;
  everyNWeeks?: EveryNWeeksSchedule;
  daysOfMonth?: number[]; // e.g. [1, 15]
  sessionCardLimit?: number; // Only surface N cards/people per prayer session
  cardSelectionMode?: 'sequential' | 'random'; // Sequential rotation (next set each time) or random
  cardRotationOffset?: number; // Tracks current offset for sequential rotation across sessions
  seenCount?: number;
  isInbox?: boolean;
  cards: PrayerCard[];
}

export interface PrayerCategory {
  name: string;
  ordering: number;
  createdDate: string;
  manualSessionLimit?: number; // Capping number of cards shown per category in ACTS flow
  visible?: boolean;
  pendingApproval?: boolean;
  subjects: PrayerSubject[];
}

export interface AppSettings {
  sessionDurationMinutes: number; // default 15
  autoStartTimer: boolean;
  filePath: string;
  soundEnabled: boolean;
  supplicationTopicsLimit: number; // default 3, editable in settings
  theme?: 'dark' | 'light' | 'sepia';
}

export interface DailyRotationState {
  lastRotationDate: string; // "YYYY-MM-DD" in local time
  offsets: {
    Adoration: number;
    Confession: number;
    Thanksgiving: number;
    Supplication: number;
  };
}

export interface PrayerMetadata {
  created_at: string;
  list_count?: number;
  subject_count?: number;
  card_count?: number;
  user_account?: string;
  settings?: AppSettings;
  dailyRotation?: DailyRotationState;
  [key: string]: unknown;
}

export interface PrayerData {
  Categories: PrayerCategory[];
  Feeds?: unknown[];
  Metadata: PrayerMetadata;
}

export type ACTSStage = 'Adoration' | 'Confession' | 'Thanksgiving' | 'Supplication';

export const ACTS_STAGES: ACTSStage[] = [
  'Adoration',
  'Confession',
  'Thanksgiving',
  'Supplication'
];

export interface ScheduledPrayerItem {
  card: PrayerCard;
  categoryName: string;
  subjectName: string;
  subjectPriority: number;
  schedulingScore: number;
}
