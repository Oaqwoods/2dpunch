import type { TrustTier } from '../types';

/**
 * Domain tier scoring system.
 * High (80-100): peer-reviewed, government, major wire services
 * Mid  (50-79):  established journalism, major sports/news orgs
 * Low  (10-49):  blogs, unknown domains, social media
 */

const HIGH_TIER_DOMAINS = new Set([
  // Government & academic suffixes
  '.gov', '.edu',
  // Scientific journals & databases
  'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com',
  'nature.com', 'science.org', 'thelancet.com', 'nejm.org',
  'jamanetwork.com', 'bmj.com', 'pnas.org', 'cell.com',
  'jstor.org', 'ssrn.com', 'arxiv.org',
  // Health & public health authorities
  'cdc.gov', 'who.int', 'nih.gov',
  // Intergovernmental & legal
  'un.org', 'supremecourt.gov', 'congress.gov',
  'europa.eu', 'parliament.uk', 'icrc.org',
  // International financial institutions
  'imf.org', 'worldbank.org',
  // Data & research orgs
  'ourworldindata.org', 'transparency.org',
  // Wire services (primary sourcing)
  'apnews.com', 'reuters.com', 'afp.com',
  // Major nonpartisan fact-checkers
  'politifact.com', 'factcheck.org', 'snopes.com', 'fullfact.org',
]);

const MID_TIER_DOMAINS = new Set([
  // US general news
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com',
  'economist.com', 'theguardian.com', 'bbc.com', 'bbc.co.uk',
  'npr.org', 'pbs.org', 'cnn.com', 'nbcnews.com', 'abcnews.go.com',
  'cbsnews.com', 'time.com', 'theatlantic.com', 'axios.com',
  'politico.com', 'thehill.com', 'usatoday.com', 'latimes.com',
  'nypost.com', 'newsweek.com', 'forbes.com', 'businessinsider.com',
  'motherjones.com', 'thedailybeast.com', 'vox.com', 'slate.com',
  // Investigative / long-form
  'propublica.org', 'theintercept.com',
  // Business & finance
  'bloomberg.com', 'marketwatch.com', 'cnbc.com', 'barrons.com',
  // Tech journalism
  'techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com',
  'zdnet.com', 'cnet.com', 'engadget.com',
  // Culture & entertainment
  'rollingstone.com', 'variety.com', 'hollywoodreporter.com',
  // Foreign policy & analysis
  'foreignpolicy.com', 'foreignaffairs.com', 'cfr.org',
  // Research & data journalism
  'statista.com', 'pewresearch.org', 'fivethirtyeight.com',
  // UK news
  'independent.co.uk', 'telegraph.co.uk', 'thetimes.co.uk',
  'thesun.co.uk', 'dailymail.co.uk', 'mirror.co.uk', 'express.co.uk',
  'eveningstandard.co.uk', 'inews.co.uk',
  // Irish news
  'irishtimes.com', 'irishexaminer.com', 'rte.ie',
  // Australian news
  'abc.net.au', 'smh.com.au', 'theage.com.au', 'news.com.au',
  // Canadian news
  'cbc.ca', 'globeandmail.com', 'torontostar.com', 'nationalpost.com',
  // European news (EN + native)
  'lemonde.fr', 'lefigaro.fr', 'dw.com', 'spiegel.de',
  'elpais.com', 'corriere.it', 'ansa.it', 'euractiv.com',
  'theguardian.com', 'politico.eu',
  // Middle East & Africa
  'aljazeera.com', 'skynews.com', 'sky.com',
  'arabnews.com', 'middleeasteye.net',
  'africanews.com', 'mg.co.za', 'dailymaverick.co.za',
  // Israel
  'haaretz.com', 'timesofisrael.com', 'jpost.com',
  // Eastern Europe
  'kyivindependent.com', 'meduza.io',
  // Asia-Pacific
  'scmp.com', 'straitstimes.com', 'japantimes.co.jp',
  'hindustantimes.com', 'thehindu.com', 'ndtv.com', 'timesofindia.com',
  'nzherald.co.nz',
  // ── SPORTS ──────────────────────────────────────────────────────────────────
  // US sports media
  'espn.com', 'cbssports.com', 'si.com', 'theathletic.com',
  'bleacherreport.com', 'sportingnews.com', 'nbcsports.com',
  'foxsports.com', 'deadspin.com',
  // US league official sites
  'nfl.com', 'nba.com', 'mlb.com', 'nhl.com', 'mls.soccer.com',
  'wnba.com', 'nwsl.com', 'pgatour.com', 'usopen.org',
  // UK/EU football
  'skysports.com', 'btsport.com', 'goal.com', '90min.com',
  'premierleague.com', 'football365.com', 'givemesport.com',
  'talksport.com', 'sportbible.com',
  // Football stats & transfers
  'transfermarkt.com', 'whoscored.com', 'fbref.com', 'understat.com',
  // Global governing bodies
  'fifa.com', 'uefa.com', 'olympics.com', 'worldathletics.org',
  'worldrugby.org', 'fiba.basketball', 'icc-cricket.com',
  'atptour.com', 'wtatour.com', 'formula1.com', 'ufc.com',
  // Cricket
  'espncricinfo.com', 'cricbuzz.com',
  // Reference / stats
  'basketball-reference.com', 'baseball-reference.com',
  'pro-football-reference.com', 'hockey-reference.com',
  'statmuse.com',
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
