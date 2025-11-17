import cron from 'node-cron';
import config from './config.js';
import { runPosterJob } from './job.js';
import { state, setResults, setRunning } from './state.js';
import { normalizeTemplateId } from './templates.js';
import { notifyRun } from './notifier.js';

let task = null;

async function executeJob(source = 'scheduler', options = {}) {
  if (state.running) {
    console.warn(`Job already running, skipped (${source})`);
    return { skipped: true };
  }
  setRunning(true);
  console.log(`[${new Date().toISOString()}] Poster job triggered via ${source}`);
  const templateId = normalizeTemplateId(options.template, config.posterTemplate);
  let payload = null;
  try {
    payload = await runPosterJob({
      templates: options.templates || templateId,
      maxPosts: options.maxPosts,
    });
    setResults(payload.results, {
      templates: payload.templates,
      maxPosts: payload.maxPosts,
      summary: payload.summary,
    });
    console.log(`Generated ${payload.results.length} poster(s) across ${payload.templates.length} template(s).`);
    await notifyRun(payload);
  } catch (error) {
    console.error('Poster job failed', error);
  } finally {
    setRunning(false);
  }
  return payload;
}

export function startScheduler() {
  if (!config.enableScheduler) {
    console.log('Scheduler disabled via configuration.');
    return;
  }
  try {
    task = cron.schedule(
      config.scheduleCron,
      () => executeJob('cron', { template: config.posterTemplate }),
      { timezone: config.timeZone }
    );
    console.log(`Scheduler started with cron "${config.scheduleCron}" (${config.timeZone}).`);
  } catch (error) {
    console.error('Failed to start scheduler', error);
  }
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
}

export function triggerManualRun(options = {}) {
  const normalizedTemplates = options.templates?.length
    ? options.templates
    : options.template;
  return executeJob('manual', {
    templates: normalizedTemplates,
    template: options.template,
    maxPosts: options.maxPosts,
  });
}
