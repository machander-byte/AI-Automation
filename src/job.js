import config from './config.js';
import { fetchFreshNews } from './news.js';
import { renderPoster } from './poster.js';

export async function runPosterJob() {
  const newsItems = await fetchFreshNews(config.maxPosts);
  const results = [];
  let index = 1;

  for (const item of newsItems) {
    try {
      const imagePath = await renderPoster(item, index);
      results.push({
        ...item,
        imagePath,
        generatedAt: new Date(),
      });
      index += 1;
    } catch (error) {
      console.error('Failed to render poster', item.title, error);
    }
  }

  return results;
}
