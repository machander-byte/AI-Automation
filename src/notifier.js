import config from './config.js';

function buildSummaryPayload(payload) {
  const avgQuality = payload.summary?.averageQuality ?? null;
  const topTitles = payload.summary?.topHeadlines || [];
  const templates = payload.templates.join(', ');
  const textLines = [
    `✅ Poster batch completed`,
    `• Posters: ${payload.results.length}`,
    `• Templates: ${templates}`,
    `• Avg quality: ${avgQuality ?? 'n/a'}`,
  ];
  if (topTitles.length) {
    textLines.push(
      `• Top headlines: ${topTitles
        .map((item) => `${item.title}${item.source ? ` (${item.source})` : ''}`)
        .join(' | ')}`
    );
  }
  return {
    text: textLines.join('\n'),
    data: {
      templates: payload.templates,
      maxPosts: payload.maxPosts,
      totalPosters: payload.results.length,
      summary: payload.summary,
    },
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Webhook request failed (${response.status})`);
  }
}

async function sendSlack(payload) {
  if (!config.slackWebhookUrl) return;
  const slackBody = {
    text: payload.text,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: payload.text },
      },
    ],
  };
  await postJson(config.slackWebhookUrl, slackBody);
}

async function sendGeneric(payload) {
  if (!config.webhookUrl) return;
  await postJson(config.webhookUrl, payload);
}

export async function notifyRun(payload) {
  if (!payload || (!config.slackWebhookUrl && !config.webhookUrl)) return;
  const message = buildSummaryPayload(payload);
  await Promise.allSettled([
    sendSlack(message),
    sendGeneric(message),
  ]);
}
