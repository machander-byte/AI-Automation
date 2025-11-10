import cron from 'node-cron';
import config from './config.js';
import { runPosterJob } from './job.js';
import { state, setResults, setRunning } from './state.js';

let task = null;

async function executeJob(source = 'scheduler') {
  if (state.running) {
    console.warn(`Job already running, skipped (${source})`);
    return;
  }
  setRunning(true);
  console.log(`[${new Date().toISOString()}] Poster job triggered via ${source}`);
  try {
    const results = await runPosterJob();
    setResults(results);
    console.log(`Generated ${results.length} poster(s).`);
  } catch (error) {
    console.error('Poster job failed', error);
  } finally {
    setRunning(false);
  }
}

export function startScheduler() {
  if (!config.enableScheduler) {
    console.log('Scheduler disabled via configuration.');
    return;
  }
  try {
    task = cron.schedule(
      config.scheduleCron,
      () => executeJob('cron'),
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

export function triggerManualRun() {
  return executeJob('manual');
}
