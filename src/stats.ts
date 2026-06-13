/**
 * Flair Enforcer — Statistics tracking and reporting.
 *
 * All stats are stored in Devvit KV store with daily granularity.
 * Provides methods to increment counters, query history, and
 * produce summary data for the dashboard.
 */

import { TriggerContext } from '@devvit/public-api';
import {
  DailyStats,
  ClassificationEvent,
  KV_KEYS,
  PrefixedKVStore,
} from './types.js';

/** Get today's date string in YYYY-MM-DD format. */
function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Increment daily stats counters after a classification event.
 */
export async function recordClassification(
  ctx: TriggerContext,
  event: ClassificationEvent,
): Promise<void> {
  const dayKey = KV_KEYS.statsPrefix + todayKey();

  // Load existing daily stats
  const raw = await ctx.kvStore.get<string>(dayKey);
  const stats: DailyStats = raw
    ? JSON.parse(raw)
    : {
        date: todayKey(),
        total: 0,
        autoAssigned: 0,
        manualOverride: 0,
        unclassified: 0,
        byStage: {},
        byFlair: {},
        avgConfidence: 0,
      };

  // Update counters
  stats.total += 1;
  stats.byStage[event.stage] = (stats.byStage[event.stage] || 0) + 1;
  stats.byFlair[event.classifiedFlairId] = (stats.byFlair[event.classifiedFlairId] || 0) + 1;

  // Running average confidence
  const n = stats.total;
  stats.avgConfidence = ((stats.avgConfidence * (n - 1)) + event.confidence) / n;

  if (event.classifiedFlairId && event.stage !== 'none') {
    stats.autoAssigned += 1;
  } else {
    stats.unclassified += 1;
  }

  // Atomicity note: Devvit KV has no multi-key transaction, so these two writes
  // cannot be made truly atomic. We instead write the durable event record
  // FIRST (it is the source of truth used by history + the cleanup job), then
  // the derived daily counter. That ordering ensures that if the second write
  // fails, the worst case is an under-counted stat for an event that still
  // exists and is recoverable — rather than a counted stat with no event record
  // (an orphaned increment the cleanup job can never reconcile).
  const eventKey = KV_KEYS.eventsPrefix + event.id;
  await ctx.kvStore.put(eventKey, JSON.stringify(event));

  await ctx.kvStore.put(dayKey, JSON.stringify(stats));
}

/**
 * Record that a mod manually overrode an auto-flair classification.
 */
export async function recordOverride(
  ctx: TriggerContext,
  postId: string,
  overrideFlairId: string,
): Promise<void> {
  const dayKey = KV_KEYS.statsPrefix + todayKey();
  const raw = await ctx.kvStore.get<string>(dayKey);
  if (raw) {
    const stats: DailyStats = JSON.parse(raw);
    stats.manualOverride += 1;
    await ctx.kvStore.put(dayKey, JSON.stringify(stats));
  }

  // Update the original event
  // We don't know the event ID from postId directly, so we use a lookup key
  const lookupKey = `fe:post:${postId}`;
  const eventId = await ctx.kvStore.get<string>(lookupKey);
  if (eventId) {
    const eventRaw = await ctx.kvStore.get<string>(KV_KEYS.eventsPrefix + eventId);
    if (eventRaw) {
      const event: ClassificationEvent = JSON.parse(eventRaw);
      event.overridden = true;
      event.overrideFlairId = overrideFlairId;
      await ctx.kvStore.put(KV_KEYS.eventsPrefix + eventId, JSON.stringify(event));
    }
  }
}

/**
 * Retrieve stats for a given day (or today).
 */
export async function getDailyStats(
  ctx: TriggerContext,
  date?: string,
): Promise<DailyStats | null> {
  const key = KV_KEYS.statsPrefix + (date || todayKey());
  const raw = await ctx.kvStore.get<string>(key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Retrieve stats for the last N days.
 */
export async function getStatsRange(
  ctx: TriggerContext,
  days: number,
): Promise<DailyStats[]> {
  const results: DailyStats[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = KV_KEYS.statsPrefix + d.toISOString().split('T')[0];
    const raw = await ctx.kvStore.get<string>(key);
    if (raw) results.push(JSON.parse(raw));
  }
  return results;
}

/**
 * Get total lifetime stats by summing all daily entries.
 */
export async function getLifetimeStats(ctx: TriggerContext): Promise<{
  totalPosts: number;
  autoAssigned: number;
  unclassified: number;
  manualOverrides: number;
  avgConfidence: number;
  topFlairs: { id: string; count: number }[];
}> {
  const allDays = await (ctx.kvStore as unknown as PrefixedKVStore).getByPrefix(KV_KEYS.statsPrefix);
  let totalPosts = 0;
  let autoAssigned = 0;
  let unclassified = 0;
  let manualOverrides = 0;
  let confidenceSum = 0;
  let confidenceN = 0;
  const flairTotals = new Map<string, number>();

  for (const { value } of allDays) {
    const s: DailyStats = JSON.parse(value);
    totalPosts += s.total;
    autoAssigned += s.autoAssigned;
    unclassified += s.unclassified;
    manualOverrides += s.manualOverride;
    if (s.avgConfidence > 0) {
      confidenceSum += s.avgConfidence;
      confidenceN += 1;
    }
    for (const [fid, count] of Object.entries(s.byFlair)) {
      flairTotals.set(fid, (flairTotals.get(fid) || 0) + (count as number));
    }
  }

  const topFlairs = [...flairTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  return {
    totalPosts,
    autoAssigned,
    unclassified,
    manualOverrides,
    avgConfidence: confidenceN > 0 ? confidenceSum / confidenceN : 0,
    topFlairs,
  };
}
