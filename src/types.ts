/**
 * Flair Enforcer — Type definitions for the auto-flair system.
 */

/** A single keyword rule mapping to one or more flairs. */
export interface KeywordRule {
  /** The keyword or phrase (case-insensitive). */
  keyword: string;
  /** Flair template ID(s) to assign when matched. First match wins. */
  flairIds: string[];
  /** Weight for TF scoring (higher = stronger signal). Default 1. */
  weight: number;
}

/** A regex-based classification rule. */
export interface RegexRule {
  /** A JS-compatible regex pattern string. */
  pattern: string;
  /** Flair template ID to assign when matched. */
  flairId: string;
  /** Human-readable description for the settings UI. */
  description: string;
}

/** The full classification chain configuration stored in KV. */
export interface ClassificationConfig {
  /** Ordered keyword rules. */
  keywords: KeywordRule[];
  /** Ordered regex rules. */
  regexRules: RegexRule[];
  /** Flair template ID used as last-resort fallback. */
  defaultFlairId: string;
  /** Minimum confidence score (0–1) required before assigning flair. */
  minConfidence: number;
  /** If true, automatically assign flair on post creation. */
  autoAssign: boolean;
  /** Subreddit-specific post types to ignore (link, self, image, video, poll). */
  ignorePostTypes: string[];
  /** Subreddit names to exclude from auto-flair. */
  excludeSubreddits: string[];
}

/** Classification result produced by the classifier. */
export interface ClassificationResult {
  /** The flair template ID chosen (or empty if no match). */
  flairId: string;
  /** Human-readable flair text. */
  flairText: string;
  /** Confidence score 0–1. */
  confidence: number;
  /** Which stage produced this result. */
  stage: 'ml' | 'keyword' | 'regex' | 'default' | 'none';
  /** The top scores breakdown for debugging. */
  scores: FlairScore[];
}

/** Score for a single flair candidate. */
export interface FlairScore {
  flairId: string;
  flairText: string;
  score: number;
}

/** Stats tracked per day. */
export interface DailyStats {
  date: string;           // YYYY-MM-DD
  total: number;          // Posts processed
  autoAssigned: number;   // Auto-flaired
  manualOverride: number; // Mod changed the flair after auto
  unclassified: number;   // No match found
  byStage: Record<string, number>;  // stage → count
  byFlair: Record<string, number>;  // flairId → count
  avgConfidence: number;  // Running average confidence
}

/** A single classification event stored for history. */
export interface ClassificationEvent {
  id: string;
  postId: string;
  postTitle: string;
  subreddit: string;
  author: string;
  classifiedFlairId: string;
  classifiedFlairText: string;
  confidence: number;
  stage: string;
  timestamp: number;
  overridden: boolean;
  overrideFlairId?: string;
}

/** Default config values. */
export const DEFAULT_CONFIG: ClassificationConfig = {
  keywords: [],
  regexRules: [],
  defaultFlairId: '',
  minConfidence: 0.15,
  autoAssign: true,
  ignorePostTypes: [],
  excludeSubreddits: [],
};

/**
 * Shape of the prefix-scan KV API this app was written against, which is not
 * part of the published `@devvit/public-api` typings. Used only for casts so
 * the code type-checks; runtime behavior is unchanged.
 */
export interface PrefixedKVStore {
  getByPrefix(prefix: string): Promise<Array<{ key: string; value: string }>>;
}

/** Key prefixes for KV storage. */
export const KV_KEYS = {
  config: 'fe:config',
  statsPrefix: 'fe:stats:',
  eventsPrefix: 'fe:event:',
  trainedPrefix: 'fe:trained:',
  counter: 'fe:counter',
} as const;
