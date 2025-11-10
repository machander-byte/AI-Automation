const replacements = new Map([
  ['\u2013', '-'],
  ['\u2014', '-'],
  ['\u2212', '-'],
  ['\u2018', "'"],
  ['\u2019', "'"],
  ['\u201C', '"'],
  ['\u201D', '"'],
  ['\u2026', '...'],
  ['\u00A0', ' '],
]);

export function sanitize(text) {
  if (!text) return '';
  let output = text;
  for (const [needle, replacement] of replacements.entries()) {
    output = output.split(needle).join(replacement);
  }
  return output.replace(/\s+/g, ' ').trim();
}

export function truncate(text, maxLen = 140) {
  const clean = sanitize(text);
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trim()}…`;
}

export function splitSentences(text) {
  if (!text) return [];
  const clean = sanitize(text);
  const matches = clean.match(/[^.!?\r\n]+[.!?]?/g);
  if (!matches) return [clean];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}
