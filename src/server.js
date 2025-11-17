import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import archiver from 'archiver';
import config from './config.js';
import { triggerManualRun, startScheduler } from './scheduler.js';
import { renderPoster } from './poster.js';
import {
  state,
  getLinkedInAuth,
  setLinkedInAuth,
  clearLinkedInAuth,
  isLinkedInConnected,
} from './state.js';
import {
  getTemplatePreviewContent,
  isValidTemplateId,
  listTemplateOptions,
  normalizeTemplateId,
} from './templates.js';
import {
  buildAuthUrl,
  createStateToken,
  exchangeCodeForToken,
  fetchProfile as fetchLinkedInProfile,
  sharePosterToFeed,
} from './linkedin.js';

const fsPromises = fs.promises;

const app = express();
let pendingLinkedInState = null;

app.set('view engine', 'ejs');
app.set('views', path.resolve(config.projectRoot, 'views'));

app.use('/generated', express.static(config.outputDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const formatDateTime = (date) => {
  if (!date) return 'No runs yet';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function parseTemplateSelection(input) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  const normalized = values
    .map((value) => normalizeTemplateId(value, config.posterTemplate))
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : [config.posterTemplate];
}

function parseMaxPosts(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

app.get('/', (req, res) => {
  const templateOptions = listTemplateOptions();
  const templateMap = new Map(templateOptions.map((option) => [option.id, option]));
  const linkedinAuth = getLinkedInAuth();
  const linkedinConnected = isLinkedInConnected();
  const selectedTemplates =
    state.lastTemplates && state.lastTemplates.length
      ? state.lastTemplates
      : [config.posterTemplate];
  const validSelectedTemplates = selectedTemplates.filter((id) => templateMap.has(id));
  const activeTemplates = validSelectedTemplates.length ? validSelectedTemplates : [config.posterTemplate];
  const selectedTemplateLabels = activeTemplates.map((id) => templateMap.get(id)?.label || id);
  const previewVersion = Date.now();
  res.render('index', {
    brandName: config.brandName,
    running: state.running,
    lastRunAt: formatDateTime(state.lastRunAt),
    lastResults: state.lastResults.map((item) => ({
      ...item,
      generatedAtDisplay: formatDateTime(item.generatedAt),
      filename: item.imagePath ? path.basename(item.imagePath) : null,
      imageHref: `/generated/${path.basename(item.imagePath)}`,
    })),
    templateOptions,
    selectedTemplates: activeTemplates,
    selectedTemplateLabels,
    previewVersion,
    maxPostsLimit: config.maxPosts,
    lastMaxPosts: state.lastMaxPosts || config.maxPosts,
    hasResults: state.lastResults.length > 0,
    runHistory: state.history.map((run) => ({
      ...run,
      completedAtDisplay: formatDateTime(run.completedAt),
    })),
    linkedinConnected,
    linkedinProfile,
  });
});

app.post('/run', async (req, res, next) => {
  try {
    const selectedTemplates = parseTemplateSelection(req.body.templates);
    const maxPosts = parseMaxPosts(req.body.maxPosts);
    await triggerManualRun({ templates: selectedTemplates, maxPosts });
    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

app.get('/demo/:templateId', async (req, res, next) => {
  const { templateId } = req.params;
  if (!isValidTemplateId(templateId)) {
    res.status(404).send('Unknown template');
    return;
  }
  const resolvedTemplate = normalizeTemplateId(templateId, config.posterTemplate);
  try {
    const previewContent = getTemplatePreviewContent(resolvedTemplate);
    const imagePath = await renderPoster(
      {
        title: previewContent.title,
        bullets: previewContent.bullets,
        url: previewContent.url,
      },
      99,
      resolvedTemplate
    );
    res.type('image/png');
    res.set('Cache-Control', 'no-store');
    res.sendFile(imagePath, async (err) => {
      try {
        await fsPromises.unlink(imagePath);
      } catch {
        // ignore cleanup error
      }
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/bundle/latest.zip', (req, res, next) => {
  if (!state.lastResults.length) {
    res.status(404).send('No posters available yet.');
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="tech-posters-${timestamp}.zip"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', next);
  archive.pipe(res);
  for (const poster of state.lastResults) {
    if (poster.imagePath && fs.existsSync(poster.imagePath)) {
      archive.file(poster.imagePath, { name: path.basename(poster.imagePath) });
    }
  }
  archive.append(
    JSON.stringify(
      {
        generatedAt: state.lastRunAt,
        templates: state.lastTemplates,
        count: state.lastResults.length,
      },
      null,
      2
    ),
    { name: 'summary.json' }
  );
  archive.finalize();
});

app.get('/api/posters', (req, res) => {
  res.json({
    running: state.running,
    lastRunAt: state.lastRunAt,
    templates: state.lastTemplates,
    maxPosts: state.lastMaxPosts || config.maxPosts,
    count: state.lastResults.length,
    results: state.lastResults.map((item) => ({
      ...item,
      imageHref: `/generated/${path.basename(item.imagePath)}`,
    })),
    history: state.history.map((run) => ({
      ...run,
      completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    })),
  });
});

app.post('/api/run', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const templates = parseTemplateSelection(payload.templates);
    const maxPosts = parseMaxPosts(payload.maxPosts);
    const result = await triggerManualRun({ templates, maxPosts });
    if (result?.skipped) {
      res.status(409).json({ message: 'A run is already in progress.' });
      return;
    }
    res.status(200).json({
      message: 'Run completed',
      running: state.running,
      templates: result?.templates || templates,
      maxPosts: result?.maxPosts || maxPosts || config.maxPosts,
      count: result?.results?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/auth/linkedin', (req, res) => {
  try {
    const stateToken = createStateToken();
    pendingLinkedInState = stateToken;
    const url = buildAuthUrl(stateToken);
    res.redirect(url);
  } catch (error) {
    console.error('Failed to start LinkedIn auth', error);
    res.status(400).send(error.message || 'LinkedIn auth not configured.');
  }
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state: stateParam, error, error_description: errorDescription } = req.query;
  if (error) {
    res.status(400).send(`LinkedIn auth error: ${errorDescription || error}`);
    return;
  }
  if (!code || !stateParam || stateParam !== pendingLinkedInState) {
    res.status(400).send('Invalid LinkedIn auth state.');
    return;
  }
  pendingLinkedInState = null;
  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchLinkedInProfile(token.accessToken);
    setLinkedInAuth({
      accessToken: token.accessToken,
      expiresAt: Date.now() + (token.expiresIn || 0) * 1000,
      profile,
      owner: profile?.id ? `urn:li:person:${profile.id}` : null,
    });
    res.redirect('/');
  } catch (err) {
    console.error('LinkedIn callback failed', err);
    res.status(500).send('Failed to complete LinkedIn login.');
  }
});

app.post('/api/upload', async (req, res) => {
  if (!isLinkedInConnected()) {
    res.status(401).json({ message: 'Connect LinkedIn first.' });
    return;
  }
  const linkedinAuth = getLinkedInAuth();
  const filename = (req.body?.filename || '').trim();
  if (!filename) {
    res.status(400).json({ message: 'Missing filename.' });
    return;
  }
  const poster = state.lastResults.find((item) => item.imagePath && path.basename(item.imagePath) === filename);
  if (!poster) {
    res.status(404).json({ message: 'Poster not found.' });
    return;
  }
  if (!fs.existsSync(poster.imagePath)) {
    res.status(410).json({ message: 'Poster file is missing on disk.' });
    return;
  }
  try {
    const shareText = `${poster.title} — via ${config.brandName}`;
    const response = await sharePosterToFeed({
      accessToken: linkedinAuth.accessToken,
      owner: linkedinAuth.owner,
      filePath: poster.imagePath,
      text: shareText,
    });
    res.status(200).json({ ok: true, asset: response.asset, share: response.share });
  } catch (error) {
    console.error('LinkedIn upload failed', error);
    if (error.status === 401 || error.status === 403) {
      clearLinkedInAuth();
      res.status(401).json({ message: 'LinkedIn token expired. Please reconnect.' });
      return;
    }
    res.status(500).json({ message: 'Upload failed', details: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Unexpected error occurred.');
});

app.listen(config.port, () => {
  console.log(`Tech Poster server running at http://localhost:${config.port}`);
  startScheduler();
});
