# Streamly — видеоплатформа (аналог YouTube)

Полнофункциональная видеоплатформа: просмотр и загрузка видео, каналы, подписки,
лайки, комментарии с ответами, плейлисты, поиск с автодополнением, уведомления,
история просмотров и рекомендации.

## Стек

| Слой        | Технологии                                                    |
| ----------- | ------------------------------------------------------------- |
| Фронтенд    | Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide     |
| Бэкенд      | REST API на Next.js Route Handlers (сигнатуры — как в ТЗ)     |
| База данных | PostgreSQL / Neon + Drizzle ORM                               |
| Аутентификация | JWT (jose) в httpOnly-cookie + bcrypt, Google OAuth (демо) |
| Хранилище   | **Cloudinary** (видео + превью, CDN); локальный резерв без ключей |

## Cloudinary: подключение

Добавьте в `.env` три переменные (Dashboard → Account Details на
[console.cloudinary.com](https://console.cloudinary.com/)):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=streamly          # необязательно
```

Альтернатива — одна строка: `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`.

Как это работает:

- `POST /api/videos/upload` принимает файл, отправляет его в Cloudinary
  (`upload_stream`, для файлов > 90 МБ — чанками `upload_large_stream`)
  и сохраняет в БД **прямую CDN-ссылку** `secure_url` + `public_id`.
- Качества плеера — реальные рендиции Cloudinary:
  `/video/upload/c_scale,h_720,q_auto/<id>.mp4` (360p / 720p / 1080p + «Авто»).
- Если превью не загружено, постер берётся кадром из видео:
  `so_auto` → `.jpg`.
- Удаление видео (владельцем или админом) чистит ассеты в облаке через
  `uploader.destroy(public_id)`.
- **Без ключей** проект не падает: включается резервный локальный драйвер
  (`public/uploads`), так что демо работает «из коробки».

> Изначальный бриф описывал связку Express + MongoDB. Проект реализован на
> Next.js fullstack + PostgreSQL: API-маршруты повторяют REST-контракт из ТЗ,
> а монолитная поставка упрощает запуск одной командой.

## Быстрый старт

```bash
npm install
cp .env.example .env          # укажите DATABASE_URL и AUTH_SECRET
npx drizzle-kit push          # создать таблицы
npx tsx src/db/seed.ts        # тестовые данные (7 каналов, 15 видео)
npm run dev                   # http://localhost:3000
```

**Демо-аккаунт:** `demo@streamly.app` / `demo1234` (подписки, история,
уведомления и собственные видео уже наполнены).

## Docker

```bash
docker compose up --build     # app на :3000 + PostgreSQL на :5433
```

После запуска примените схему и сиды (один раз):

```bash
docker compose exec app npx drizzle-kit push
docker compose exec app npx tsx src/db/seed.ts
```

## Возможности

- **Главная** — бесконечная лента со скелетонами, чипы-фильтры (Тренды,
  Популярное, Новое, категории, Подписки), сворачиваемый сайдбар
- **Просмотр** — кастомный плеер: play/pause, перемотка ±10с, громкость,
  скорость 0.25–2×, выбор качества, полный экран, Picture-in-Picture,
  горячие клавиши (space/k, ←→, ↑↓, f, m); лайки/дизлайки, подписка,
  «Поделиться», «Сохранить в плейлист», разворачиваемое описание,
  комментарии с ответами/лайками/сортировкой, рекомендации по тегам и категории
- **Канал** — баннер, аватар, счётчики, вкладки Видео/Плейлисты/О канале/
  Сообщество, сортировка по дате и популярности
- **Загрузка** — drag&drop, прогресс-бар, автопревью из кадра видео,
  теги, категория, приватность (публичное/по ссылке/приватное)
- **Поиск** — автодополнение, фильтры (тип, дата, длительность, сортировка),
  результаты по видео, каналам и плейлистам
- **Профиль** — редактирование (аватар/имя/описание), настройки уведомлений,
  история, понравившиеся, подписки, управление своими видео и плейлистами
- **Авторизация** — регистрация/вход, восстановление пароля (демо),
  Google OAuth 2.0 (демо-эмуляция, в проде — обмен кода через env-ключи)
- Тёмная/светлая тема, уведомления с непрочитанным счётчиком,
  адаптивная вёрстка (мобайл/планшет/десктоп), SEO: Open Graph + JSON-LD
  VideoObject, rate limiting на API

## API (основные маршруты)

```
POST   /api/auth/register | /login | /logout | /google | /forgot
GET    /api/auth/me
GET    /api/videos?page&limit&category&sort=new|popular|trending&channelId&mine&subs
POST   /api/videos                      # создать видео (после POST /api/upload)
GET    /api/videos/:id                  PUT /api/videos/:id   DELETE /api/videos/:id
POST   /api/videos/:id/like | /dislike  PUT /api/videos/:id/view
GET    /api/videos/:id/related          GET|POST /api/videos/:id/comments
PUT    /api/comments/:id   DELETE /api/comments/:id
POST   /api/comments/:id/like | /reply
GET    /api/users/:id        PUT /api/users/:id
POST   /api/users/:id/subscribe          GET /api/users/:id/subscriptions
GET|POST /api/playlists                  GET|PUT|DELETE /api/playlists/:id
POST|DELETE /api/playlists/:id/videos
GET    /api/search?q&type&sort&duration&period   GET /api/search?mode=suggest&q=
GET    /api/notifications (POST readAll)         GET|DELETE /api/history
GET    /api/liked                      POST /api/upload (multipart)
```

## Структура

```
src/
├── app/                    # страницы: /, /watch/[id], /channel/[id],
│   └── api/                #   /upload, /search, /profile, /auth, /playlist/[id]
├── components/             # TopBar, Sidebar, VideoCard, HomeFeed,
│   └── watch/              # VideoPlayer, Comments, WatchView…
├── db/                     # schema.ts (Drizzle), seed.ts, client
└── lib/                    # auth (JWT), reactions, rate-limit, helpers
```

## Продакшен-заметки

- **S3/Cloudinary**: замените тело `POST /api/upload` на загрузку в бакет
  (переменные `S3_*` / `CLOUDINARY_*` в `.env.example`).
- **Транскодирование**: после загрузки ставьте задачу в очередь (ffmpeg:
  360p/720p/1080p → HLS), результат записывайте в `qualities`.
- **Redis**: `src/lib/rate-limit.ts` и кэш ленты легко переносятся на
  Upstash/Redis.
- **Google OAuth**: задайте `GOOGLE_CLIENT_ID/SECRET` и замените демо-обмен
  в `/api/auth/google` на верификацию токена Google.
