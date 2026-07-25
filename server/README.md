# Приём заявок

Маленький сервис на Node без зависимостей. Принимает форму с лендинга,
пишет заявку в журнал и дублирует в Telegram.

## Как устроено

```
браузер → nginx (/ai/api/lead) → 127.0.0.1:3001 → журнал + Telegram
```

Журнал пишется **первым** и не зависит от Telegram: если бот не настроен или
api.telegram.org недоступен, заявка всё равно сохранена, а клиент видит успех.

Форма работает и без JavaScript: обычный `<form method="post">` уходит на тот же
адрес, сервис отвечает `303` и уводит на `/ai/thanks.html`. С живым JS отправка
идёт через `fetch`, страница не перезагружается.

## Установка

```bash
# пользователь без прав и без домашней папки
useradd --system --no-create-home --shell /usr/sbin/nologin leadapi

install -d -o root -g root /opt/lead-api
install -o root -g root -m 644 lead-api.js /opt/lead-api/

install -d -o leadapi -g leadapi -m 750 /var/log/lead-api

install -d -o root -g leadapi -m 750 /etc/lead-api
install -o root -g leadapi -m 640 config.example.json /etc/lead-api/config.json
# заполнить botToken и chatId

install -m 644 lead-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lead-api
```

Кусок для nginx, внутрь `server {}` домена:

```nginx
location /ai/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 15s;
}
```

## Обслуживание

```bash
systemctl status lead-api
journalctl -u lead-api -f              # что происходит прямо сейчас
tail -f /var/log/lead-api/leads.jsonl  # сами заявки
curl localhost:3001/health             # жив ли и подключён ли Telegram

systemctl kill -s HUP lead-api         # перечитать config.json без перезапуска
```

## Откуда берётся источник заявки

utm-метки и `yclid` живут только в адресе страницы входа. Стоит посетителю
кликнуть «Кейсы» — query-строка теряется, и заявка со второй страницы пришла
бы без источника.

Поэтому скрипт при первом заходе кладёт адрес входа и внешний реферер
в `sessionStorage` и присылает их вместе с заявкой полем `landing`.
Метки сервис разбирает из него, а не из текущего адреса.

Если `sessionStorage` недоступен (приватный режим), поле не придёт — сервис
откатится на `url`, то есть на прежнее поведение.

## Защита от мусора

- **Honeypot** — скрытое поле `company_site`. Заполнено — заявка тихо отбрасывается,
  боту возвращается «успех», чтобы он не подбирал обход.
- **Ограничение частоты** — не больше 5 заявок с адреса за 10 минут.
- **Размер тела** — максимум 8 КБ.
- Пробельные символы в полях схлопываются: подделать многострочное уведомление
  в Telegram через поле «имя» нельзя.

Персональные данные лежат только в `/var/log/lead-api/leads.jsonl` (права 750)
и в вашем Telegram. Наружу ничего не уходит.
