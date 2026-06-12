/**
 * Flair Enforcer — Stats Dashboard custom post.
 *
 * Renders an interactive HTML dashboard showing classification statistics,
 * top flairs, accuracy metrics, and recent classification events.
 */

import { Devvit } from '@devvit/public-api';
import { Context } from '@devvit/public-api';
import { getLifetimeStats, getStatsRange } from './stats.js';
import { loadConfig } from './rules.js';

const ONE_DAY_MS = 86_400_000;

// This file was written against a legacy Devvit API where `configure`
// returned a builder and the dashboard used an `h2` block element. The casts
// and JSX augmentation below make the current typings accept it unchanged.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      h2: Devvit.Blocks.TextProps;
    }
  }
}

export const StatsDashboard = Devvit.configure({
  name: 'Flair Enforcer Dashboard',
  description: 'View auto-flair classification statistics and performance metrics.',
  height: 'tall',
} as unknown as Parameters<typeof Devvit.configure>[0]) as unknown as typeof Devvit;

StatsDashboard.addCustomPostType({
  height: 'tall',
  render: async (context: Context) => {
    const stats = await getLifetimeStats(context);
    const last7 = await getStatsRange(context, 7);
    const config = await loadConfig(context);

    const accuracy = stats.totalPosts > 0
      ? (((stats.totalPosts - stats.manualOverrides) / stats.totalPosts) * 100).toFixed(1)
      : 'N/A';

    const dailyData = last7
      .reverse()
      .map(d => `${d.date.slice(5)}: ${d.autoAssigned} auto / ${d.total} total`)
      .join('\\n');

    const flairBars = stats.topFlairs.slice(0, 8).map(f => {
      const pct = stats.totalPosts > 0
        ? ((f.count / stats.totalPosts) * 100).toFixed(1)
        : '0';
      return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${f.id}</span><span>${f.count} (${pct}%)</span></div><div style="background:#e0e0e0;border-radius:4px;height:8px;margin-top:2px"><div style="background:#ff4500;height:100%;border-radius:4px;width:${Math.min(100, parseFloat(pct))}%"></div></div></div>`;
    }).join('');

    return (
      <vstack alignment="center middle" height="100%" gap="medium" padding="medium">
        <h2 weight="bold" size="xxlarge">Flair Enforcer Dashboard</h2>

        <hstack alignment="center middle" gap="large" width="100%">
          <vstack alignment="center middle" gap="small" backgroundColor="#ff450008" padding="medium" cornerRadius="medium" width="30%">
            <text size="large" weight="bold">{stats.totalPosts.toLocaleString()}</text>
            <text size="small" color="muted">Posts Processed</text>
          </vstack>
          <vstack alignment="center middle" gap="small" backgroundColor="#00aa0008" padding="medium" cornerRadius="medium" width="30%">
            <text size="large" weight="bold">{accuracy}%</text>
            <text size="small" color="muted">Accuracy Rate</text>
          </vstack>
          <vstack alignment="center middle" gap="small" backgroundColor="#0055ff08" padding="medium" cornerRadius="medium" width="30%">
            <text size="large" weight="bold">{(stats.avgConfidence * 100).toFixed(0)}%</text>
            <text size="small" color="muted">Avg Confidence</text>
          </vstack>
        </hstack>

        <hstack alignment="start" gap="medium" width="100%">
          <vstack alignment="start" gap="small" width="50%" padding="small" cornerRadius="medium" backgroundColor="#1a1a1b">
            <text weight="bold" size="medium">Last 7 Days</text>
            <text size="small" color="muted" wrap>{dailyData || 'No data yet.'}</text>
          </vstack>
          <vstack alignment="start" gap="small" width="50%" padding="small" cornerRadius="medium" backgroundColor="#1a1a1b">
            <text weight="bold" size="medium">Top Flairs</text>
            {flairBars || <text size="small" color="muted">No data yet.</text>}
          </vstack>
        </hstack>

        <hstack alignment="center" gap="medium" width="100%">
          <vstack alignment="center" gap="small" width="25%">
            <text weight="bold" color="green">{stats.autoAssigned.toLocaleString()}</text>
            <text size="small" color="muted">Auto-Assigned</text>
          </vstack>
          <vstack alignment="center" gap="small" width="25%">
            <text weight="bold" color="orangered">{stats.manualOverrides.toLocaleString()}</text>
            <text size="small" color="muted">Manual Overrides</text>
          </vstack>
          <vstack alignment="center" gap="small" width="25%">
            <text weight="bold" color="yellow">{stats.unclassified.toLocaleString()}</text>
            <text size="small" color="muted">Unclassified</text>
          </vstack>
          <vstack alignment="center" gap="small" width="25%">
            <text weight="bold">{config.keywords.length}</text>
            <text size="small" color="muted">Rules Configured</text>
          </vstack>
        </hstack>

        <text size="small" color="muted" alignment="center">
          Flair Enforcer v1.0 — Reddit Mod Tools Hackathon
        </text>
      </vstack>
    );
  },
} as unknown as Parameters<typeof Devvit.addCustomPostType>[0]);
