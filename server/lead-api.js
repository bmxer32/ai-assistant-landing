/*
 * Приём заявок с лендинга. Без зависимостей — только стандартная библиотека Node.
 *
 * Слушает 127.0.0.1, наружу его пускает nginx (location /ai/api/).
 * Что делает с заявкой:
 *   1) пишет строку в JSONL-журнал — это источник правды, он не зависит от Telegram;
 *   2) пробует отправить в Telegram, если в конфиге есть токен бота.
 * Если Telegram недоступен, заявка всё равно сохранена и клиент видит успех.
 *
 * Конфиг: /etc/lead-api/config.json — { "botToken": "...", "chatId": "..." }
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const CONFIG_PATH = process.env.CONFIG_PATH || '/etc/lead-api/config.json';
const LOG_PATH = process.env.LOG_PATH || '/var/log/lead-api/leads.jsonl';
const THANKS_URL = '/ai/thanks.html';

const MAX_BODY = 8 * 1024;          // заявка из двух полей столько не весит — всё сверху отбрасываем
const RATE_MAX = 5;                 // не больше 5 заявок
const RATE_WINDOW = 10 * 60 * 1000; // с одного адреса за 10 минут

let config = { botToken: '', chatId: '' };
function loadConfig() {
  try {
    config = Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
    console.log('конфиг загружен, telegram:', config.botToken ? 'настроен' : 'не настроен');
  } catch (e) {
    console.log('конфиг не прочитан (' + e.code + ') — заявки будут только в журнале');
  }
}
loadConfig();

fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

/* ---------- ограничение частоты ---------- */
const hits = new Map(); // ip -> [метки времени]
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}
// раз в полчаса выкидываем протухшие записи, чтобы Map не рос вечно
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const live = list.filter(t => now - t < RATE_WINDOW);
    if (live.length) hits.set(ip, live); else hits.delete(ip);
  }
}, 30 * 60 * 1000).unref();

/* ---------- Telegram ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sendToTelegram(lead) {
  return new Promise(resolve => {
    if (!config.botToken || !config.chatId) return resolve(false);

    const lines = [
      '🔔 <b>Заявка с лендинга AI-ассистента</b>',
      '',
      '👤 <b>Имя:</b> ' + esc(lead.name),
      '📞 <b>Контакт:</b> ' + esc(lead.contact),
      '📄 <b>Страница:</b> ' + esc(lead.page || '—'),
    ];
    if (lead.utm) lines.push('🎯 <b>Источник:</b> ' + esc(lead.utm));
    if (lead.referrer) lines.push('↩️ <b>Перешёл с:</b> ' + esc(lead.referrer));
    lines.push('🕒 ' + new Date(lead.ts).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК');

    const payload = JSON.stringify({
      chat_id: config.chatId,
      text: lines.join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + config.botToken + '/sendMessage',
      method: 'POST',
      timeout: 8000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        const ok = res.statusCode === 200;
        if (!ok) console.error('telegram ответил', res.statusCode, raw.slice(0, 300));
        resolve(ok);
      });
    });
    req.on('timeout', () => { req.destroy(); console.error('telegram: таймаут'); resolve(false); });
    req.on('error', e => { console.error('telegram:', e.message); resolve(false); });
    req.write(payload);
    req.end();
  });
}

/* ---------- разбор тела ---------- */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const type = req.headers['content-type'] || '';
      try {
        if (type.includes('application/json')) return resolve(JSON.parse(raw));
        const out = {};
        new URLSearchParams(raw).forEach((v, k) => { out[k] = v; });
        resolve(out);
      } catch (e) { reject(new Error('bad_body')); }
    });
    req.on('error', reject);
  });
}

// схлопываем любые пробельные символы, включая переводы строк: иначе в имя
// можно вписать вторую строку и подделать поле в телеграм-уведомлении
const clean = (v, max) =>
  String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

/* ---------- сервер ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const wantsJson = (req.headers.accept || '').includes('application/json');

  const reply = (code, obj) => {
    if (wantsJson) {
      const body = JSON.stringify(obj);
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    // без JS браузер отправил обычную форму — отвечаем редиректом
    if (obj.ok) {
      res.writeHead(303, { Location: THANKS_URL, 'Cache-Control': 'no-store' });
      return res.end();
    }
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><meta charset="utf-8"><title>Не отправилось</title>' +
      '<p style="font:16px/1.6 system-ui;max-width:34em;margin:12vh auto;padding:0 20px">' +
      'Заявка не отправилась: ' + esc(obj.error || 'ошибка') + '.<br>' +
      'Напишите, пожалуйста, в Telegram — <a href="https://t.me/webe9">@webe9</a>, ответим сразу.<br><br>' +
      '<a href="/ai/">← вернуться на страницу</a></p>');
  };

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok telegram=' + (config.botToken ? 'on' : 'off') + '\n');
  }

  if (url.pathname !== '/api/lead') return reply(404, { ok: false, error: 'not_found' });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'method_not_allowed' });

  // nginx кладёт настоящий адрес клиента сюда
  const ip = (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'слишком много попыток, попробуйте позже' });

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return reply(400, { ok: false, error: e.message === 'too_large' ? 'слишком длинно' : 'не разобрали форму' });
  }

  // ловушка для ботов: у живого человека это поле пустое
  if (clean(body.company_site, 80)) {
    console.log('отброшено как спам, ip=' + ip);
    return reply(200, { ok: true });   // боту сообщать о провале незачем
  }

  const name = clean(body.name, 80);
  const contact = clean(body.contact, 80);
  if (!name || !contact) return reply(400, { ok: false, error: 'заполните имя и контакт' });
  if (!body.consent) return reply(400, { ok: false, error: 'нужно согласие на обработку данных' });

  let utm = '';
  try {
    const q = new URL(clean(body.url, 500)).searchParams;
    utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid']
      .map(k => q.get(k) && k + '=' + q.get(k)).filter(Boolean).join(' · ');
  } catch (e) { /* url кривой или пустой — не беда */ }

  const lead = {
    ts: new Date().toISOString(),
    name, contact,
    page: clean(body.page, 40),
    url: clean(body.url, 500),
    referrer: clean(body.referrer, 300),
    utm,
    ip,
    ua: clean(req.headers['user-agent'], 300),
  };

  // журнал пишем первым: даже если Telegram лежит, заявка не потеряется
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(lead) + '\n');
  } catch (e) {
    console.error('не записали в журнал:', e.message);
    return reply(500, { ok: false, error: 'внутренняя ошибка' });
  }

  const sent = await sendToTelegram(lead);
  console.log('заявка от', name, '| telegram:', sent ? 'доставлено' : 'нет');
  reply(200, { ok: true });
});

server.listen(PORT, HOST, () => console.log('lead-api слушает http://' + HOST + ':' + PORT));

// перечитать конфиг без перезапуска: systemctl kill -s HUP lead-api
process.on('SIGHUP', loadConfig);
