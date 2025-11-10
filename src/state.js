export const state = {
  lastRunAt: null,
  lastResults: [],
  running: false,
};

export function setRunning(flag) {
  state.running = flag;
}

export function setResults(results) {
  state.lastResults = results;
  state.lastRunAt = new Date();
}
