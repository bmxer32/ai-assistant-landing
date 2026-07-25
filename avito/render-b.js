/*
 * Рендер обложек из covers-b.html в PNG 2400×1800.
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
  ['b1', '1-otvet',   'Клиент написал — ответ уже есть'],
  ['b2', '2-vsegda',  'Праздники, отпуск, ночь — неважно'],
  ['b3', '3-umeet',   'Не просто отвечает — доводит до заказа'],
  ['b4', '4-tochno',  'Не выдумывает цен и сроков'],
  ['b5', '5-otchet',  'Утром вам — только итоги'],
  ['b6', '6-chelovek','Сложное отдаёт вам'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 1000, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.resolve(__dirname, 'covers-b.html').replace(/\\/g, '/'),
                  { waitUntil: 'networkidle0' });
  // ждём, пока подхватятся локальные шрифты — иначе снимок уйдёт с системными
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 400));

  for (const [id, file, title] of COVERS) {
    const el = await page.$('#' + id);
    const out = path.join(__dirname, `avito-b-${file}.png`);
    await el.screenshot({ path: out });
    console.log(`avito-b-${file}.png — ${title}`);
  }

  await browser.close();
})();
