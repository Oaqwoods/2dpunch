/**
 * Fetches the headline/title of a URL from its HTML metadata.
 * Tries og:title first (most descriptive), then falls back to <title>.
 * Times out after 5s to avoid blocking the UI.
 */
export async function fetchUrlTitle(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Accept: 'text/html',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return '';
    const html = await res.text();
    return extractTitle(html);
  } catch {
    return '';
  }
}

function extractTitle(html: string): string {
  const patterns = [
    // og:title — content before property attr
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i,
    // og:title — content after property attr
    /<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i,
    // Standard <title> tag
    /<title[^>]*>([^<]{1,200})<\/title>/i,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return '';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
