import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseBool = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const parseNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const parseList = (value, fallback = []) => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const config = {
  projectRoot,
  port: parseNumber(process.env.PORT, 8080),
  brandName: process.env.BRAND_NAME || 'Tech Daily',
  logoPath: path.resolve(projectRoot, process.env.LOGO_PATH || 'assets/logo.png'),
  footerText: process.env.FOOTER_TEXT || 'Fresh tech highlights for you',
  hashtags: process.env.HASHTAGS || '#AI #Cloud #Security #Dev #TechNews',
  posterFormat: (process.env.POSTER_FORMAT || 'square').toLowerCase(),
  maxPosts: clamp(parseNumber(process.env.MAX_POSTS, 2), 1, 5),
  lookbackHours: clamp(parseNumber(process.env.LOOKBACK_HOURS, 24), 1, 168),
  outputDir: path.resolve(projectRoot, process.env.OUTPUT_DIR || 'out'),
  dataDir: path.resolve(projectRoot, process.env.DATA_DIR || 'data'),
  enableScheduler: parseBool(process.env.ENABLE_SCHEDULER, true),
  scheduleCron: process.env.SCHEDULE_CRON || '0 30 8 * * *',
  timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
  rssFeeds: parseList(process.env.RSS_FEEDS, [
    'https://www.theverge.com/rss/index.xml',
    'http://feeds.arstechnica.com/arstechnica/index/',
    'https://www.wired.com/feed/rss',
  ]),
};

export default config;
