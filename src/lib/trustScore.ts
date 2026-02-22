import type { TrustTier } from '../types';

/**
 * Domain tier scoring system.
 * High (80-100): peer-reviewed, government, major wire services
 * Mid  (50-79):  established journalism, major sports/news orgs
 * Low  (10-49):  blogs, unknown domains, social media
 */

const HIGH_TIER_DOMAINS = new Set([
  // Government & academic
  '.gov', '.edu', 'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com',
  'nature.com', 'science.org', 'thelancet.com', 'nejm.org',
  'jamanetwork.com', 'bmj.com', 'pnas.org', 'cdc.gov', 'who.int',
  'un.org', 'supremecourt.gov', 'congress.gov',
  // Wire services
  'apnews.com', 'reuters.com', 'afp.com',
  // Major nonpartisan fact-checkers
  'politifact.com', 'factcheck.org', 'snopes.com',
]);

const MID_TIER_DOMAINS = new Set([
  // General news
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com',
  'economist.com', 'theguardian.com', 'bbc.com', 'bbc.co.uk',
  'npr.org', 'pbs.org', 'cnn.com', 'nbcnews.com', 'abcnews.go.com',
  'cbsnews.com', 'time.com', 'theatlantic.com', 'axios.com',
  'politico.com', 'thehill.com',
  // Sports
  'espn.com', 'nfl.com', 'nba.com', 'mlb.com', 'nhl.com',
  'cbssports.com', 'si.com', 'theathletic.com', 'bleacherreport.com',
  'sportingnews.com',
]);

const LOW_TIER_SOCIAL = new Set([
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'reddit.com', 'threads.net', 'youtube.com',
  'linkedin.com', 'tumblr.com',
]);

export function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function scoreDomain(domain: string): { tier: TrustTier; score: number } {
  if (!domain) return { tier: 'low', score: 5 };

  // Check exact match first, then suffix match for .gov / .edu
  for (const high of HIGH_TIER_DOMAINS) {
    if (domain === high || domain.endsWith(high)) {
      return { tier: 'high', score: 90 };
    }
  }

  for (const mid of MID_TIER_DOMAINS) {
    if (domain === mid || domain.endsWith('.' + mid)) {
      return { tier: 'mid', score: 60 };
    }
  }

  if (LOW_TIER_SOCIAL.has(domain)) {
    return { tier: 'low', score: 10 };
  }

  // Unknown domain — slightly above floor
  return { tier: 'low', score: 25 };
}

export function calcAverageTrust(scores: number[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 100) / 100;
}

export function trustColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 45) return '#f59e0b'; // amber
  return '#ef4444';                  // red
}

export function trustLabel(score: number): string {
  if (score >= 70) return 'High Trust';
  if (score >= 45) return 'Mid Trust';
  if (score > 0)   return 'Low Trust';
  return 'No Sources';
}

export function tierColor(tier: TrustTier): string {
  if (tier === 'high') return '#22c55e';
  if (tier === 'mid')  return '#f59e0b';
  return '#ef4444';
}
