import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import config from './config.js';
import { isSeen, markSeen } from './seenStore.js';
import { sanitize, splitSentences } from './text.js';

const parser = new Parser({
  headers: { 'User-Agent': 'tech-poster-node/0.1 (+https://github.com/machander-byte/AI-Automation)' },
});

const userAgent = 'tech-poster-node/0.1 (+https://github.com/machander-byte/AI-Automation)';

const DEFAULT_BULLET = 'Fresh insights coming soon.';
const TITLE_NORMALIZER = /[^a-z0-9]+/gi;

function parsePublished(dateLike) {
  if (!dateLike) return new Date();
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

async function fetchFeedEntries(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const source = sanitize(feed.title || '');
    return (feed.items || []).map((item) => ({
      title: sanitize(item.title || ''),
      url: item.link || item.guid || '',
      source,
      publishedAt: parsePublished(item.isoDate || item.pubDate || item.pubdate || item.date),
      snippet: sanitize(item.contentSnippet || item.content || ''),
    }));
  } catch (error) {
    console.warn('Failed to fetch feed', feedUrl, error.message);
    return [];
  }
}

async function fetchArticleText(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return sanitize(article?.textContent || '');
  } catch (error) {
    console.warn('Failed to fetch article text', url, error.message);
    return '';
  }
}

function buildBullets(text, fallback = DEFAULT_BULLET) {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return [fallback];
  }
  const bullets = [];
  for (const sentence of sentences) {
    if (!sentence) continue;
    bullets.push(sentence.length > 180 ? `${sentence.slice(0, 177).trim()}...` : sentence);
    if (bullets.length >= 4) break;
  }
  return bullets.length ? bullets : [fallback];
}

function normalizeTitleKey(title) {
  if (!title) return '';
  return title.trim().toLowerCase().replace(TITLE_NORMALIZER, ' ').replace(/\s+/g, ' ').trim();
}

function analyzeArticle({ text, bullets, publishedAt, duplicateOf }) {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const bulletCount = bullets.length;
  const hoursOld = Number(((Date.now() - publishedAt.getTime()) / 3600000).toFixed(1));
  const recencyScore = Math.max(0, Math.min(1, 1 - hoursOld / config.lookbackHours));
  const bulletScore = Math.min(1, bulletCount / 4);
  const coverageScore = Math.min(1, wordCount / 600);
  const duplicatePenalty = duplicateOf ? 0.2 : 0;
  const rawQuality = bulletScore * 0.4 + coverageScore * 0.3 + recencyScore * 0.3 - duplicatePenalty;
  const qualityScore = Number(Math.max(0, Math.min(1, rawQuality)).toFixed(2));
  return {
    wordCount,
    bulletCount,
    hoursOld,
    recencyScore: Number(recencyScore.toFixed(2)),
    coverageScore: Number(coverageScore.toFixed(2)),
    qualityScore,
  };
}

export async function fetchFreshNews(limit = config.maxPosts) {
  const cutoff = Date.now() - config.lookbackHours * 60 * 60 * 1000;

  const allEntries = (
    await Promise.all(config.rssFeeds.map((feed) => fetchFeedEntries(feed)))
  ).flat();

  const titleTracker = new Map();

  const deduped = new Map();
  for (const entry of allEntries) {
    if (!entry.url || !entry.title) continue;
    const titleKey = normalizeTitleKey(entry.title);
    if (titleKey && titleTracker.has(titleKey)) {
      entry.duplicateOf = titleTracker.get(titleKey);
    } else if (titleKey) {
      titleTracker.set(titleKey, entry.url);
    }
    const existing = deduped.get(entry.url);
    if (!existing || existing.publishedAt < entry.publishedAt) {
      deduped.set(entry.url, entry);
    }
  }

  const sorted = Array.from(deduped.values())
    .filter((entry) => entry.publishedAt.getTime() >= cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt);

  const picks = [];
  for (const entry of sorted) {
    if (picks.length >= limit) break;
    if (isSeen(entry.url)) continue;

    const articleText = await fetchArticleText(entry.url);
    const finalText = articleText || entry.snippet || entry.title;
    const bullets = buildBullets(finalText);
    const analysis = analyzeArticle({
      text: finalText,
      bullets,
      publishedAt: entry.publishedAt,
      duplicateOf: entry.duplicateOf,
    });
    const record = {
      ...entry,
      bullets,
      analysis,
    };
    picks.push(record);
    markSeen(entry.url);
  }

  return picks;
}
