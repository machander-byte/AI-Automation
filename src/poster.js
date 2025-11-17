import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage, registerFont } from 'canvas';
import config from './config.js';
import { sanitize } from './text.js';
import { getTemplate } from './templates.js';

const SIZES = {
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 627 },
};

const DEFAULT_COLORS = {
  background: '#0B1020',
  brand: '#9EA7C3',
  title: '#FFFFFF',
  body: '#DCE3FF',
  bulletPrefix: '#DCE3FF',
  meta: '#9EA7C3',
  hashtag: '#7482AD',
  accent: '#22263D',
};

const DEFAULT_LAYOUT = {
  padding: 64,
  footerHeight: 140,
  footerRuleHeight: 2,
  bulletSpacing: 12,
  bulletPrefixGap: 18,
};

const ensureFontsRegistered = (() => {
  let registered = false;
  return () => {
    if (registered) return;
    const fontDir = path.resolve(config.projectRoot, 'assets', 'fonts');
    const fonts = [
      { file: 'Poppins-SemiBold.ttf', family: 'PosterTitle', weight: '600' },
      { file: 'Inter-Regular.ttf', family: 'PosterBody', weight: '400' },
    ];
    for (const font of fonts) {
      const fontPath = path.join(fontDir, font.file);
      if (fs.existsSync(fontPath)) {
        try {
          registerFont(fontPath, { family: font.family, weight: font.weight });
        } catch (err) {
          console.warn('Failed to register font', fontPath, err.message);
        }
      }
    }
    registered = true;
  };
})();

function ensureOutputDir() {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

function resolveLogo() {
  try {
    const stat = fs.statSync(config.logoPath);
    if (stat.isFile()) {
      return config.logoPath;
    }
  } catch {
    // ignore missing logo
  }
  return null;
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = ctx.measureText(candidate).width;
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawTextBlock(ctx, text, font, color, x, y, maxWidth, lineHeightMultiplier = 1.2) {
  ctx.font = font;
  ctx.fillStyle = color;
  const metrics = ctx.measureText('M');
  const lineHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const lines = wrapText(ctx, text, maxWidth);

  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight * lineHeightMultiplier;
  }

  return y;
}

export async function renderPoster({ title, bullets = [], url }, index = 1, templateName = config.posterTemplate) {
  ensureFontsRegistered();
  ensureOutputDir();

  const { width, height } = SIZES[config.posterFormat] || SIZES.square;
  const template = getTemplate(templateName);
  const colors = { ...DEFAULT_COLORS, ...(template.colors || {}) };
  const layout = { ...DEFAULT_LAYOUT, ...(template.layout || {}) };
  const bulletPrefix = template.bulletPrefix || '\u2022';
  const metaSeparator = template.metaSeparator || '\u2022';
  const brandText = template.uppercaseBrand ? sanitize(config.brandName).toUpperCase() : sanitize(config.brandName);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (typeof template.backgroundArt === 'function') {
    template.backgroundArt(ctx, width, height, colors);
  } else {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
  }

  const padding = layout.padding;
  const contentWidth = width - padding * 2;

  const defaultTitleFont = width >= 1080 ? '56px PosterTitle, "Segoe UI", sans-serif' : '48px PosterTitle, "Segoe UI", sans-serif';
  const defaultBodyFont = width >= 1080 ? '34px PosterBody, "Segoe UI", sans-serif' : '30px PosterBody, "Segoe UI", sans-serif';
  const defaultMetaFont = '26px PosterBody, "Segoe UI", sans-serif';
  const templateFonts = template.fonts || {};
  const titleFont = templateFonts.title || defaultTitleFont;
  const bodyFont = templateFonts.body || defaultBodyFont;
  const metaFont = templateFonts.meta || defaultMetaFont;

  // Branding
  let y = padding + 40;
  ctx.font = metaFont;
  ctx.fillStyle = colors.brand;
  ctx.fillText(brandText, padding, y);

  const logoPath = resolveLogo();
  if (logoPath) {
    try {
      const logo = await loadImage(logoPath);
      const maxDim = 120;
      const ratio = Math.min(maxDim / logo.width, maxDim / logo.height);
      const logoWidth = Math.round(logo.width * ratio);
      const logoHeight = Math.round(logo.height * ratio);
      ctx.drawImage(logo, width - padding - logoWidth, padding, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Failed to draw logo', err.message);
    }
  }

  y += 40;
  y = drawTextBlock(ctx, sanitize(title), titleFont, colors.title, padding, y, contentWidth, 1.25);
  y += 24;

  for (const bullet of bullets) {
    const safeBullet = sanitize(bullet);
    ctx.font = bodyFont;
    ctx.fillStyle = colors.bulletPrefix;
    ctx.fillText(bulletPrefix, padding, y);
    const prefixWidth = ctx.measureText(bulletPrefix).width + layout.bulletPrefixGap;
    y = drawTextBlock(
      ctx,
      safeBullet,
      bodyFont,
      colors.body,
      padding + prefixWidth,
      y,
      contentWidth - prefixWidth,
      1.3
    );
    y += layout.bulletSpacing;
    if (y > height - layout.footerHeight - 40) break;
  }

  const footerTop = height - layout.footerHeight;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(padding, footerTop, contentWidth, layout.footerRuleHeight);

  ctx.font = metaFont;
  ctx.fillStyle = colors.meta;
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }
  const footer = `${config.footerText} ${metaSeparator} ${host}`;
  y = footerTop + 36;
  y = drawTextBlock(ctx, footer, metaFont, colors.meta, padding, y, contentWidth, 1.25);

  if (config.hashtags) {
    drawTextBlock(ctx, config.hashtags, metaFont, colors.hashtag, padding, y + 12, contentWidth, 1.2);
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const filename = `poster_${config.posterFormat}_${templateName}_${timestamp}_${String(index).padStart(2, '0')}.png`;
  const outputPath = path.join(config.outputDir, filename);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  return outputPath;
}
