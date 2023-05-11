const express = require('express');
const critical = require('critical');
const puppeteer = require('puppeteer');
const fs = require('fs');
const tmp = require('tmp');
const app = express();
app.use(express.json({limit: '10mb'}));

app.get('/', (req, res) => {
  res.send('This is a server that generates critical CSS');
});

app.post('/', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: {
      width: 1300,
      height: 900
    }
  });
  const cssFile = tmp.tmpNameSync();
  const dimensions = [
    {
      height: 640,
      width: 360,
    },
    {
      height: 1300,
      width: 900,
    },
  ];
  try {
    // Pre-process CSS: Replace each \ with \\
    const processedCss = req.body.css.replace(/\\/g, '\\\\');
    await fs.promises.appendFile(cssFile, processedCss);
    const { css, html, uncritical } = await critical.generate({
      concurrency: 1,
      css: cssFile,
      html: req.body.html,
      inline: false,
      penthouse: {
        puppeteer: {
          getBrowser: () => browser,
        }
      }
    });
    await fs.promises.unlink(cssFile);
    // Post-process CSS: Replace each \\ with \
    const fixedCss = css.replace(/\\\\/g, '\\');
    res.send({
      css: fixedCss,
    });
  } catch( err ) {
    res.status(400).send(err.message);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`tinybit-critical-css-server: listening on port ${port}`);
});
