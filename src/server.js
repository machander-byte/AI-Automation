import express from 'express';
import path from 'node:path';
import config from './config.js';
import { triggerManualRun, startScheduler } from './scheduler.js';
import { state } from './state.js';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.resolve(config.projectRoot, 'views'));

app.use('/generated', express.static(config.outputDir));
app.use(express.urlencoded({ extended: false }));

const formatDateTime = (date) => {
  if (!date) return 'No runs yet';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

app.get('/', (req, res) => {
  res.render('index', {
    brandName: config.brandName,
    running: state.running,
    lastRunAt: formatDateTime(state.lastRunAt),
    lastResults: state.lastResults.map((item) => ({
      ...item,
      generatedAtDisplay: formatDateTime(item.generatedAt),
      imageHref: `/generated/${path.basename(item.imagePath)}`,
    })),
  });
});

app.post('/run', async (req, res, next) => {
  try {
    await triggerManualRun();
    res.redirect('/');
  } catch (error) {
    next(error);
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
