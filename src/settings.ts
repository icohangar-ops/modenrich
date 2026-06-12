/**
 * Flair Enforcer — Settings schema.
 *
 * Defines all configurable options exposed to moderators
 * through the Devvit settings UI.
 */

import { Devvit } from '@devvit/public-api';

/**
 * `Devvit.Types` comes from the legacy settings API this app was written
 * against and is absent from the current `@devvit/public-api` typings.
 * Cast once here so the schema below type-checks without runtime changes.
 */
const Types = (Devvit as unknown as {
  Types: { Boolean: unknown; Number: unknown; String: unknown };
}).Types;

/** App-wide settings (available in the subreddit install settings). */
export const appSettings = {
  /** Master toggle: enable or disable auto-flair. */
  autoFlairEnabled: {
    type: Types.Boolean,
    name: 'Auto-Flair Enabled',
    description: 'Automatically assign flair to new posts based on content analysis.',
    defaultValue: true,
  },
  /** Minimum confidence threshold for auto-assignment. */
  minConfidence: {
    type: Types.Number,
    name: 'Minimum Confidence',
    description: 'Minimum confidence score (0–1) required before auto-assigning flair. Lower = more aggressive classification.',
    defaultValue: 0.15,
  },
  /** Default flair to use when nothing matches. */
  defaultFlairId: {
    type: Types.String,
    name: 'Default Flair ID',
    description: 'Flair template ID to assign when no classification matches. Leave empty to skip.',
    defaultValue: '',
  },
  /** Post types to ignore. */
  ignoreImagePosts: {
    type: Types.Boolean,
    name: 'Ignore Image Posts',
    description: 'Skip auto-flair for image posts.',
    defaultValue: false,
  },
  ignoreVideoPosts: {
    type: Types.Boolean,
    name: 'Ignore Video Posts',
    description: 'Skip auto-flair for video posts.',
    defaultValue: false,
  },
  ignoreLinkPosts: {
    type: Types.Boolean,
    name: 'Ignore Link Posts',
    description: 'Skip auto-flair for link posts (only flair text/self posts).',
    defaultValue: false,
  },
  /** Log classifications to modlog. */
  logToModLog: {
    type: Types.Boolean,
    name: 'Log to Modlog',
    description: 'Post classification details to the subreddit mod log.',
    defaultValue: true,
  },
  /** Enable learning from mod corrections. */
  enableLearning: {
    type: Types.Boolean,
    name: 'Enable Learning',
    description: 'When mods manually change an auto-assigned flair, learn from the correction to improve future classifications.',
    defaultValue: true,
  },
} as const;
