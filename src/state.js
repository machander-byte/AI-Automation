const HISTORY_LIMIT = 6;

export const state = {
  lastRunAt: null,
  lastResults: [],
  running: false,
  lastTemplates: [],
  lastMaxPosts: null,
  history: [],
};

export function setRunning(flag) {
  state.running = flag;
}

export function setResults(results, metadata = {}) {
  state.lastResults = results;
  state.lastRunAt = new Date();
  const templatesUsed = metadata.templates && metadata.templates.length ? metadata.templates : state.lastTemplates;
  if (templatesUsed && templatesUsed.length) {
    state.lastTemplates = templatesUsed;
  }
  if (metadata.maxPosts) {
    state.lastMaxPosts = metadata.maxPosts;
  }
  state.history.unshift({
    id: metadata.summary?.runId || `run_${Date.now()}`,
    completedAt: state.lastRunAt,
    templates: templatesUsed || [],
    maxPosts: metadata.maxPosts || state.lastMaxPosts || null,
    count: results.length,
    averageQuality: metadata.summary?.averageQuality ?? null,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);
}
