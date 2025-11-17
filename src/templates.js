const DEFAULT_TEMPLATE_ID = 'midnight';

const DEFAULT_PREVIEW_CONTENT = {
  title: 'AI Pulse: Generative breakthroughs you should know',
  bullets: [
    'Chipmakers unveil low-power NPUs for edge laptops.',
    'Open-source models close the gap with flagship labs.',
    'Design leaders debate how much AI belongs in the UI.',
  ],
  url: 'https://demo.techposter.local/sample',
};

const POSTER_TEMPLATES = {
  midnight: {
    label: 'Midnight Neon',
    description: 'Deep navy base with subtle glow and a crisp divider bar.',
    colors: {
      background: '#0B1020',
      brand: '#9EA7C3',
      title: '#FFFFFF',
      body: '#DCE3FF',
      bulletPrefix: '#5B8DF1',
      meta: '#9EA7C3',
      hashtag: '#7482AD',
      accent: '#22263D',
    },
    fonts: {
      title: '58px PosterTitle, "Segoe UI Semibold", sans-serif',
      body: '34px PosterBody, "Segoe UI", sans-serif',
      meta: '26px PosterBody, "Segoe UI", sans-serif',
    },
    bulletPrefix: '\u2022',
    preview: {
      title: 'Midnight Headlines: AI and Security',
    },
    backgroundArt(ctx, width, height, colors) {
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(
        width * 0.75,
        height * 0.2,
        width * 0.1,
        width * 0.75,
        height * 0.2,
        width * 0.6
      );
      glow.addColorStop(0, 'rgba(65, 105, 225, 0.35)');
      glow.addColorStop(1, 'rgba(11, 16, 32, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    },
  },
  aurora: {
    label: 'Aurora Glow',
    description: 'Vibrant purple/teal gradient with soft wave overlays.',
    colors: {
      background: '#070815',
      brand: '#C8E7FF',
      title: '#F8FAFC',
      body: '#E0EAFF',
      bulletPrefix: '#F0ABFC',
      meta: '#D0D8FF',
      hashtag: '#A5F3FC',
      accent: '#F0ABFC',
    },
    layout: {
      padding: 68,
      footerRuleHeight: 3,
    },
    fonts: {
      title: '60px "Segoe UI Semibold", "Helvetica Neue", sans-serif',
      body: '32px "Segoe UI", "Helvetica Neue", sans-serif',
      meta: '26px "Segoe UI", sans-serif',
    },
    bulletPrefix: '\u25CF',
    preview: {
      title: 'Aurora Briefing: Climate tech momentum',
      bullets: [
        'Wind + solar pairing beats previous efficiency records.',
        'Battery recyclers pull in new mega-rounds.',
        'EV makers ship OTA updates with energy scores.',
      ],
    },
    backgroundArt(ctx, width, height) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0F172A');
      gradient.addColorStop(0.5, '#312E81');
      gradient.addColorStop(1, '#0F766E');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#22D3EE';
      const wave = ctx.createRadialGradient(width * 0.3, height * 0.1, width * 0.1, width * 0.5, height * 0.2, width * 0.7);
      wave.addColorStop(0, 'rgba(14, 165, 233, 0.9)');
      wave.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = wave;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      drawGrid(ctx, width, height, 80, 'rgba(255,255,255,0.08)');
    },
  },
  slate: {
    label: 'Slate Minimal',
    description: 'Bright, editorial layout with a bold accent block.',
    colors: {
      background: '#F8FAFC',
      brand: '#475569',
      title: '#0F172A',
      body: '#1E293B',
      bulletPrefix: '#BE123C',
      meta: '#475569',
      hashtag: '#0F172A',
      accent: '#BE123C',
    },
    layout: {
      padding: 72,
      footerHeight: 130,
      footerRuleHeight: 4,
    },
    fonts: {
      title: '60px "Georgia", "Times New Roman", serif',
      body: '32px "Georgia", serif',
      meta: '26px "Georgia", serif',
    },
    bulletPrefix: '\u2014',
    metaSeparator: '//',
    uppercaseBrand: true,
    preview: {
      title: 'Slate Edition: Developer productivity pulse',
      bullets: [
        'Framework authors ship DX-focused releases.',
        'Serverless runtimes add GPU-backed tiers.',
        'New CLI copilots land for popular stacks.',
      ],
    },
    backgroundArt(ctx, width, height, colors) {
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.04)';
      ctx.fillRect(width * 0.6, 0, width * 0.4, height);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(0, 0, width, 20);
    },
  },
  sunrise: {
    label: 'Sunrise Pulse',
    description: 'Warm coral-to-peach gradient with translucent cards.',
    colors: {
      background: '#14051E',
      brand: '#FED7AA',
      title: '#FFFBF5',
      body: '#FFE7DC',
      bulletPrefix: '#FDBA74',
      meta: '#FED7AA',
      hashtag: '#FED7AA',
      accent: '#F97316',
    },
    layout: {
      padding: 70,
      footerHeight: 150,
      footerRuleHeight: 3,
      bulletSpacing: 18,
    },
    fonts: {
      title: '64px "Segoe UI Semibold", "Poppins", sans-serif',
      body: '34px "Segoe UI", "Poppins", sans-serif',
      meta: '26px "Segoe UI", sans-serif',
    },
    bulletPrefix: '\u25B8',
    preview: {
      title: 'Sunrise Signal: Consumer gadgets heat up',
      bullets: [
        'Foldable phones trend toward lighter hinges.',
        'Earbuds add real-time translation & health sensors.',
        'Smart home hubs gain energy dashboards.',
      ],
    },
    backgroundArt(ctx, width, height) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#5B21B6');
      gradient.addColorStop(0.5, '#D946EF');
      gradient.addColorStop(1, '#FDBA74');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(width * 0.3, height * 0.1, width * 0.35, height * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },
  matrix: {
    label: 'Synthwave Matrix',
    description: 'Black glass canvas with neon grid and holo bullets.',
    colors: {
      background: '#020617',
      brand: '#5DE7F0',
      title: '#F8FAFC',
      body: '#CFFAFE',
      bulletPrefix: '#F472B6',
      meta: '#A5F3FC',
      hashtag: '#38BDF8',
      accent: '#0F172A',
    },
    layout: {
      padding: 58,
      footerHeight: 150,
      footerRuleHeight: 3,
      bulletSpacing: 14,
    },
    fonts: {
      title: '58px "Consolas", "Fira Code", monospace',
      body: '30px "Consolas", monospace',
      meta: '24px "Consolas", monospace',
    },
    bulletPrefix: '\u258B',
    preview: {
      title: 'Synthwave Monitor: Infra & security updates',
      bullets: [
        'Edge AI gateways adopt Rust-first firmware.',
        'CISOs push passwordless auth to all regions.',
        'GPU clusters add auto-scaling observability.',
      ],
    },
    backgroundArt(ctx, width, height) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);
      drawGrid(ctx, width, height, 60, 'rgba(94, 234, 212, 0.25)');
      ctx.save();
      ctx.globalAlpha = 0.35;
      const sweep = ctx.createLinearGradient(0, 0, width, height);
      sweep.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
      sweep.addColorStop(1, 'rgba(236, 72, 153, 0.35)');
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
  },
  paper: {
    label: 'Newsprint Retro',
    description: 'Cream paper texture with serif headlines and accent bar.',
    colors: {
      background: '#FFFBF5',
      brand: '#9A3412',
      title: '#1C1917',
      body: '#3E2723',
      bulletPrefix: '#B45309',
      meta: '#7C2D12',
      hashtag: '#7C2D12',
      accent: '#FDBA74',
    },
    layout: {
      padding: 76,
      footerHeight: 140,
      footerRuleHeight: 5,
      bulletSpacing: 16,
    },
    fonts: {
      title: '58px "Cormorant Garamond", "Georgia", serif',
      body: '30px "Cormorant Garamond", "Georgia", serif',
      meta: '24px "Georgia", serif',
    },
    bulletPrefix: '\u2023',
    metaSeparator: '\u2022',
    preview: {
      title: 'Newsprint Digest: Policy & regulation',
      bullets: [
        'EU finalises AI compliance timelines for SMBs.',
        'U.S. FCC proposes new open-access fiber incentives.',
        'India drafts carbon reporting rules for datacenters.',
      ],
    },
    backgroundArt(ctx, width, height, colors) {
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(250, 204, 170, 0.25)';
      ctx.fillRect(0, height * 0.08, width, height * 0.84);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(0, 0, width, 16);
    },
  },
};

function drawGrid(ctx, width, height, spacing, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function resolveTemplateKey(value) {
  return value ? String(value).trim().toLowerCase() : '';
}

function normalizeTemplateId(value, fallback = DEFAULT_TEMPLATE_ID) {
  const key = resolveTemplateKey(value);
  if (POSTER_TEMPLATES[key]) return key;
  return fallback;
}

function getTemplate(templateId) {
  const key = normalizeTemplateId(templateId);
  return POSTER_TEMPLATES[key];
}

function isValidTemplateId(value) {
  const key = resolveTemplateKey(value);
  return Boolean(key && POSTER_TEMPLATES[key]);
}

function listTemplateOptions() {
  return Object.entries(POSTER_TEMPLATES).map(([id, template]) => ({
    id,
    label: template.label,
    description: template.description,
    colors: template.colors,
    fonts: template.fonts,
    bulletPrefix: template.bulletPrefix,
  }));
}

function getTemplatePreviewContent(templateId) {
  const template = getTemplate(templateId);
  return {
    title: template.preview?.title || DEFAULT_PREVIEW_CONTENT.title,
    bullets: template.preview?.bullets || DEFAULT_PREVIEW_CONTENT.bullets,
    url: template.preview?.url || DEFAULT_PREVIEW_CONTENT.url,
  };
}

export {
  DEFAULT_TEMPLATE_ID,
  POSTER_TEMPLATES,
  getTemplate,
  getTemplatePreviewContent,
  isValidTemplateId,
  listTemplateOptions,
  normalizeTemplateId,
};
