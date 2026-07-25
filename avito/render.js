/*
 * Рендер обложек из covers.html в PNG 2400×1800.
 *
 * Каждая обложка свёрстана как блок 1200×900; deviceScaleFactor 2 даёт
 * на выходе ровно то соотношение 4:3, которое просит Avito.
 *
 *   node render.js
 *
 * Нужен puppeteer-core и установленный Chrome. Путь к браузеру можно
 * переопределить переменной окружения CHROME.
 */
'use strict';

const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const COVERS = [
  ['c1', '1-glavnaya',  'Отвечает клиентам за вас'],
  ['c2', '2-noch',      'Продаёт, пока вы спите'],
  ['c3', '3-skorost',   '3 секунды против 2 часов'],
  ['c4', '4-zapusk',    'Запуск за один день'],
  ['c5', '5-cena',      'Дешевле полставки администратора'],
  ['c6', '6-avito',     'Кто ответил сразу — тот и продал'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 1000, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.resolve(__dirname, 'covers.html').replace(/\\/g, '/'),
                  { waitUntil: 'networkidle0' });
  // ждём, пока подхватятся локальные шрифты — иначе снимок уйдёт с системными
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 400));

  for (const [id, file, title] of COVERS) {
    const el = await page.$('#' + id);
    const out = path.join(__dirname, `avito-${file}.png`);
    await el.screenshot({ path: out });
    console.log(`avito-${file}.png — ${title}`);
  }

  await browser.close();
})();
