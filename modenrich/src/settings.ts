/**
 * Flair Enforcer — Settings schema.
 *
 * Defines all configurable options exposed to moderators
 * through the Devvit settings UI.
 */

import { Devvit } from '@devvit/public-api';

/** App-wide settings (available in the subreddit install settings). */
export const appSettings = {
  /** Master toggle: enable or disable auto-flair. */
  autoFlairEnabled: {
    type: Devvit.Types.Boolean,
    name: 'Auto-Flair Enabled',
    description: 'Automatically assign flair to new posts based on content analysis.',
    defaultValue: true,
  },
  /** Minimum confidence threshold for auto-assignment. */
  minConfidence: {
    type: Devvit.Types.Number,
    name: 'Minimum Confidence',
    description: 'Minimum confidence score (0–1) required before auto-assigning flair. Lower = more aggressive classification.',
    defaultValue: 0.15,
  },
  /** Default flair to use when nothing matches. */
  defaultFlairId: {
    type: Devvit.Types.String,
    name: 'Default Flair ID',
    description: 'Flair template ID to assign when no classification matches. Leave empty to skip.',
    defaultValue: '',
  },
  /** Post types to ignore. */
  ignoreImagePosts: {
    type: Devvit.Types.Boolean,
    name: 'Ignore Image Posts',
    description: 'Skip auto-flair for image posts.',
    defaultValue: false,
  },
  ignoreVideoPosts: {
    type: Devvit.Types.Boolean,
    name: 'Ignore Video Posts',
    description: 'Skip auto-flair for video posts.',
    defaultValue: false,
  },
  ignoreLinkPosts: {
    type: Devvit.Types.Boolean,
    name: 'Ignore Link Posts',
    description: 'Skip auto-flair for link posts (only flair text/self posts).',
    defaultValue: false,
  },
  /** Log classifications to modlog. */
  logToModLog: {
    type: Devvit.Types.Boolean,
    name: 'Log to Modlog',
    description: 'Post classification details to the subreddit mod log.',
    defaultValue: true,
  },
  /** Enable learning from mod corrections. */
  enableLearning: {
    type: Devvit.Types.Boolean,
    name: 'Enable Learning',
    description: 'When mods manually change an auto-assigned flair, learn from the correction to improve future classifications.',
    defaultValue: true,
  },
} as const;
