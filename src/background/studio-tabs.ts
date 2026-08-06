/** Паттерны chrome.tabs.query для вкладки студии. */

export function studioTabUrlPatterns(
  origin: string,
  studioWebUrl: string,
): string[] {
  const patterns = [`${origin}/*`];
  if (!studioWebUrl.startsWith(origin)) {
    patterns.push(`${studioWebUrl}*`);
  }
  return patterns;
}
