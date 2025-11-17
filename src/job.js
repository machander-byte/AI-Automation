import config from './config.js';
import { fetchFreshNews } from './news.js';
import { renderPoster } from './poster.js';
import { getTemplate, normalizeTemplateId } from './templates.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function normalizeTemplateList(templates, fallback) {
  const items = Array.isArray(templates) ? templates : [templates].filter(Boolean);
  const normalized = items
    .map((item) => normalizeTemplateId(item, fallback))
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : [fallback];
}

export async function runPosterJob({ templates, maxPosts } = {}) {
  const templateIds = normalizeTemplateList(templates, config.posterTemplate);
  const posterLimit = clamp(
    Number.isFinite(maxPosts) ? maxPosts : config.maxPosts,
    1,
    config.maxPosts
  );
  const newsItems = await fetchFreshNews(posterLimit);
  const allResults = [];
  const runId = `run_${Date.now()}`;

  for (const templateId of templateIds) {
    const templateMeta = getTemplate(templateId);
    let index = 1;
    for (const item of newsItems) {
      try {
        const imagePath = await renderPoster(item, index, templateId);
        allResults.push({
          ...item,
          imagePath,
          generatedAt: new Date(),
          template: templateId,
          templateLabel: templateMeta.label,
        });
        index += 1;
      } catch (error) {
        console.error('Failed to render poster', item.title, error);
      }
    }
  }

  const qualityScores = allResults
    .map((item) => item.analysis?.qualityScore)
    .filter((score) => typeof score === 'number');
  const averageQuality = qualityScores.length
    ? Number((qualityScores.reduce((acc, score) => acc + score, 0) / qualityScores.length).toFixed(2))
    : null;
  const summary = {
    runId,
    generatedAt: new Date().toISOString(),
    templates: templateIds,
    maxPosts: posterLimit,
    totalPosters: allResults.length,
    averageQuality,
    duplicateCount: allResults.filter((item) => item.duplicateOf).length,
    topSources: Array.from(new Set(allResults.map((item) => item.source).filter(Boolean))).slice(0, 5),
    topHeadlines: allResults.slice(0, 3).map((item) => ({
      title: item.title,
      source: item.source,
      template: item.templateLabel,
    })),
  };

  return {
    results: allResults,
    templates: templateIds,
    maxPosts: posterLimit,
    summary,
  };
}
