/**
 * Seed-скрипт: наполняет БД реальными тестовыми данными.
 * Запуск: npx tsx src/db/seed.ts
 *
 * Создаёт РЕАЛЬНЫЕ учётные записи с захешированными паролями (bcryptjs):
 *  - user@streamly.com  / user123   — обычный пользователь (подписки, история, плейлисты)
 *  - admin@streamly.com / admin123  — администратор (role: admin)
 *  - 6 контент-каналов / password123, 15 видео, комментарии и т.д.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  users,
  videos,
  comments,
  likes,
  subscriptions,
  watchHistory,
  playlists,
  playlistVideos,
  notifications,
} from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const GTV = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";
const avatar = (seed: string, bg = "b6e3f4") =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const qualities = (url: string) => [
  { label: "1080p", url },
  { label: "720p", url },
  { label: "360p", url },
];

async function main() {
  console.log("Очистка таблиц...");
  // await db.delete(schema.notifications);
  // await db.delete(likes);
  // await db.delete(watchHistory);
  // await db.delete(playlistVideos);
  // await db.delete(playlists);
  // await db.delete(comments);
  // await db.delete(subscriptions);
  // await db.delete(videos);
  // await db.delete(users);

  console.log("Создание пользователей (bcrypt-хеширование паролей)...");
  const userHash = await bcrypt.hash("user123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const channelHash = await bcrypt.hash("password123", 10);

  const [user, admin, techorbit, kuhnia, svysoty, gamezone, nauka, soundwave] =
    await db
      .insert(users)
      .values([
        {
          email: "user@streamly.com",
          handle: "user",
          name: "Иван Петров",
          password: userHash,
          role: "user" as const,
          avatarUrl: avatar("ИванПетров", "ffdfbf"),
          description:
            "Обычный пользователь Streamly: смотрю техно-обзоры, готовлю и путешествую.",
          subscribersCount: 128,
          createdAt: daysAgo(400),
        },
        {
          email: "admin@streamly.com",
          handle: "admin",
          name: "Администратор Streamly",
          password: adminHash,
          role: "admin" as const,
          isVerified: true,
          avatarUrl: avatar("AdminStreamly", "ffd5dc"),
          description:
            "Официальная учётная запись администрации платформы Streamly.",
          subscribersCount: 0,
          createdAt: daysAgo(500),
        },
        {
          email: "tech@streamly.app",
          handle: "techorbit",
          name: "TechOrbit",
          password: channelHash,
          isVerified: true,
          avatarUrl: avatar("TechOrbit", "c0aede"),
          description:
            "Обзоры техники, гаджетов и нейросетей. Новые видео каждую неделю.",
          subscribersCount: 1_240_000,
          createdAt: daysAgo(1200),
        },
        {
          email: "food@streamly.app",
          handle: "prostaya.kuhnia",
          name: "Простая кухня",
          password: channelHash,
          isVerified: true,
          avatarUrl: avatar("Кухня", "ffd5dc"),
          description:
            "Простые рецепты из доступных продуктов. Готовим вкусно и быстро!",
          subscribersCount: 2_830_000,
          createdAt: daysAgo(1600),
        },
        {
          email: "travel@streamly.app",
          handle: "mirs.vysoty",
          name: "Мир с высоты",
          password: channelHash,
          isVerified: true,
          avatarUrl: avatar("Высота", "d1d4f9"),
          description:
            "Путешествия и аэросъёмка 4K со всего мира. Подпишитесь — будет красиво.",
          subscribersCount: 4_120_000,
          createdAt: daysAgo(2100),
        },
        {
          email: "games@streamly.app",
          handle: "gamezone",
          name: "GameZone",
          password: channelHash,
          avatarUrl: avatar("GameZone", "c0aede"),
          description: "Игры, железо и киберспорт. Стримы по выходным.",
          subscribersCount: 986_000,
          createdAt: daysAgo(900),
        },
        {
          email: "science@streamly.app",
          handle: "nauka20",
          name: "Наука 2.0",
          password: channelHash,
          avatarUrl: avatar("Наука", "b6e3f4"),
          description: "Научпоп: космос, физика, биология — просто о сложном.",
          subscribersCount: 1_760_000,
          createdAt: daysAgo(1400),
        },
        {
          email: "music@streamly.app",
          handle: "soundwave",
          name: "SoundWave",
          password: channelHash,
          avatarUrl: avatar("SoundWave", "ffd5dc"),
          description: "Музыка, концерты, закулисье шоу-бизнеса.",
          subscribersCount: 654_000,
          createdAt: daysAgo(700),
        },
      ])
      .returning();

  console.log("Создание видео...");
  type V = typeof videos.$inferInsert;
  const videoData: V[] = [
    {
      authorId: techorbit.id, title: "iPhone 17 через месяц: честный обзор без цензуры",
      description: "Месяц использования нового iPhone: батарея, камеры, Apple Intelligence и стоит ли обновляться с 15 Pro.\n\nТаймкоды:\n00:00 — Вступление\n03:20 — Камеры\n08:45 — Автономность\n\n#iphone #обзор #apple",
      category: "Технологии", tags: ["iphone", "обзор", "apple", "смартфон", "технологии"],
      thumbnailUrl: px(16313506), videoUrl: `${GTV}/VolkswagenGTIReview.mp4`,
      durationSeconds: 634, views: 1_450_320, likesCount: 58_200, dislikesCount: 1_940,
      createdAt: daysAgo(18), qualities: qualities(`${GTV}/VolkswagenGTIReview.mp4`),
    },
    {
      authorId: techorbit.id, title: "Нейросети 2026: что они уже умеют (вы удивитесь)",
      description: "Собрал 10 нейросетей, которые реально экономят время: от генерации видео до написания кода.",
      category: "Технологии", tags: ["нейросети", "ai", "технологии", "будущее"],
      thumbnailUrl: px(16313530), videoUrl: `${GTV}/ForBiggerFun.mp4`,
      durationSeconds: 60, views: 980_500, likesCount: 44_100, dislikesCount: 1_200,
      createdAt: daysAgo(5), qualities: qualities(`${GTV}/ForBiggerFun.mp4`),
    },
    {
      authorId: kuhnia.id, title: "Паста карбонара за 15 минут — классический итальянский рецепт",
      description: "Настоящая карбонара без сливок: гуанчиале, пекорино, желтки и никакого лука!\n\nИнгредиенты в закреплённом комментарии.",
      category: "Кулинария", tags: ["рецепт", "паста", "карбонара", "итальянская кухня", "готовим дома"],
      thumbnailUrl: px(8629103), videoUrl: `${GTV}/BigBuckBunny.mp4`,
      durationSeconds: 596, views: 2_310_800, likesCount: 96_400, dislikesCount: 2_800,
      createdAt: daysAgo(62), qualities: qualities(`${GTV}/BigBuckBunny.mp4`),
    },
    {
      authorId: kuhnia.id, title: "5 завтраков, которые спасут ваше утро",
      description: "Быстрые, полезные и очень вкусные завтраки на каждый день недели.",
      category: "Кулинария", tags: ["завтрак", "рецепты", "пп", "быстро"],
      thumbnailUrl: px(15671380), videoUrl: `${GTV}/ForBiggerEscapes.mp4`,
      durationSeconds: 15, views: 742_100, likesCount: 31_500, dislikesCount: 640,
      createdAt: daysAgo(21), qualities: qualities(`${GTV}/ForBiggerEscapes.mp4`),
    },
    {
      authorId: kuhnia.id, title: "Идеальный стейк: секреты шеф-повара ресторана",
      description: "Как выбрать мясо, какая сковорода нужна и почему стейк надо «отдыхать». Все ошибки новичков.",
      category: "Кулинария", tags: ["стейк", "мясо", "шеф", "рецепт"],
      thumbnailUrl: px(37923425), videoUrl: `${GTV}/WeAreGoingOnBullrun.mp4`,
      durationSeconds: 47, views: 1_104_300, likesCount: 52_700, dislikesCount: 1_100,
      createdAt: daysAgo(33), qualities: qualities(`${GTV}/WeAreGoingOnBullrun.mp4`),
    },
    {
      authorId: svysoty.id, title: "Норвегия с дрона: фьорды, от которых мурашки | 4K",
      description: "Две недели в Норвегии с дроном: Гейрангер, Тролльтунга, Лофотены. Лучшее — в этом фильме.",
      category: "Путешествия", tags: ["норвегия", "дрон", "фьорды", "4k", "путешествия", "природа"],
      thumbnailUrl: px(4581166), videoUrl: `${GTV}/Sintel.mp4`,
      durationSeconds: 888, views: 3_405_700, likesCount: 148_900, dislikesCount: 2_300,
      createdAt: daysAgo(124), qualities: qualities(`${GTV}/Sintel.mp4`),
    },
    {
      authorId: svysoty.id, title: "Швейцарские Альпы: самый красивый маршрут года",
      description: "Пятивадольная тропа и озеро Оешинен — маршрут, который стоит каждого километра.",
      category: "Путешествия", tags: ["альпы", "швейцария", "горы", "треккинг"],
      thumbnailUrl: px(28811828), videoUrl: `${GTV}/ElephantsDream.mp4`,
      durationSeconds: 653, views: 563_200, likesCount: 24_800, dislikesCount: 410,
      createdAt: daysAgo(14), qualities: qualities(`${GTV}/ElephantsDream.mp4`),
    },
    {
      authorId: svysoty.id, title: "Забытые деревни Грузии: как живут в горах на высоте 2200",
      description: "Ушгули — самое высокогорное село Европы. Люди, башни Сванетии и дорога, которую не забудешь.",
      category: "Путешествия", tags: ["грузия", "кавказ", "горы", "путешествия"],
      thumbnailUrl: px(14024132), videoUrl: `${GTV}/SubaruOutbackOnStreetAndDirt.mp4`,
      durationSeconds: 594, views: 891_400, likesCount: 41_200, dislikesCount: 780,
      createdAt: daysAgo(6), qualities: qualities(`${GTV}/SubaruOutbackOnStreetAndDirt.mp4`),
    },
    {
      authorId: gamezone.id, title: "Собрал игровой ПК мечты в 2026 году — за вменяемые деньги",
      description: "RTX нового поколения, RGB и ни одного провода на виду. Гайд по комплектующим внутри.",
      category: "Игры", tags: ["пк", "сборка", "игры", "железо", "rtx"],
      thumbnailUrl: px(7858742), videoUrl: `${GTV}/TearsOfSteel.mp4`,
      durationSeconds: 734, views: 1_802_600, likesCount: 71_300, dislikesCount: 1_650,
      createdAt: daysAgo(30), qualities: qualities(`${GTV}/TearsOfSteel.mp4`),
    },
    {
      authorId: gamezone.id, title: "Киберспорт-2026: как попасть в про-сцену с нуля",
      description: "Интервью с тренером мейджор-команды: сколько тренироваться, какие турниры и где искать стак.",
      category: "Игры", tags: ["киберспорт", "cs2", "турниры", "гайд"],
      thumbnailUrl: px(9072216), videoUrl: `${GTV}/ForBiggerJoyrides.mp4`,
      durationSeconds: 15, views: 421_700, likesCount: 18_900, dislikesCount: 520,
      createdAt: daysAgo(10), qualities: qualities(`${GTV}/ForBiggerJoyrides.mp4`),
    },
    {
      authorId: nauka.id, title: "Куда смотрит «Джеймс Уэбб»: самые странные туманности",
      description: "Новые снимки телескопа JWST: туманность Кольцо, Столпы Творения и галактика-ульяна.",
      category: "Наука", tags: ["космос", "туманность", "джеймс уэбб", "астрономия", "наука"],
      thumbnailUrl: px(6074272), videoUrl: `${GTV}/ForBiggerMeltdowns.mp4`,
      durationSeconds: 15, views: 2_105_900, likesCount: 112_400, dislikesCount: 1_800,
      createdAt: daysAgo(23), qualities: qualities(`${GTV}/ForBiggerMeltdowns.mp4`),
    },
    {
      authorId: soundwave.id, title: "Лучшие живые выступления 2026 года — подборка",
      description: "12 концертов, после которых хочется аплодировать стоя. Кто в топе — решайте в комментариях.",
      category: "Музыка", tags: ["музыка", "концерт", "live", "подборка"],
      thumbnailUrl: px(36675302), videoUrl: `${GTV}/WhatCarCanYouGetForAGrand.mp4`,
      durationSeconds: 90, views: 672_800, likesCount: 29_600, dislikesCount: 890,
      createdAt: daysAgo(16), qualities: qualities(`${GTV}/WhatCarCanYouGetForAGrand.mp4`),
    },
    {
      authorId: soundwave.id, title: "Как снимают концерты: закулисье большого шоу",
      description: "120 камер, тонны света и команда из 300 человек. Репортаж со стройки стадиона.",
      category: "Музыка", tags: ["концерт", "закулисье", "шоу", "съёмка"],
      thumbnailUrl: px(30215324), videoUrl: `${GTV}/ForBiggerBlazes.mp4`,
      durationSeconds: 15, views: 343_500, likesCount: 14_200, dislikesCount: 240,
      createdAt: daysAgo(4), qualities: qualities(`${GTV}/ForBiggerBlazes.mp4`),
    },
    {
      authorId: user.id, title: "Мой первый влог: как я собираю этот сайт",
      description: "Рассказываю, как делаю свою видеоплатформу на Next.js: авторизация, плеер, комментарии.",
      category: "Образование", tags: ["влог", "программирование", "nextjs", "веб"],
      thumbnailUrl: px(16313532), videoUrl: `${GTV}/ForBiggerFun.mp4`,
      durationSeconds: 60, views: 12_400, likesCount: 890, dislikesCount: 12,
      createdAt: daysAgo(2), qualities: qualities(`${GTV}/ForBiggerFun.mp4`),
    },
    {
      authorId: user.id, title: "Черновик: тест загрузки видео",
      description: "Приватное тестовое видео.",
      category: "Развлечения", tags: ["тест"],
      thumbnailUrl: null, videoUrl: `${GTV}/ForBiggerEscapes.mp4`,
      durationSeconds: 15, views: 12, likesCount: 1, dislikesCount: 0,
      visibility: "private", createdAt: daysAgo(1),
      qualities: qualities(`${GTV}/ForBiggerEscapes.mp4`),
    },
  ];
  const inserted = await db.insert(videos).values(videoData).returning();
  const byTitle = (t: string) => inserted.find((v) => v.title.startsWith(t))!;

  console.log("Создание комментариев...");
  const v1 = byTitle("iPhone 17");
  const v3 = byTitle("Паста карбонара");
  const v6 = byTitle("Норвегия");
  const v11 = byTitle("Куда смотрит");

  const cRows = await db
    .insert(comments)
    .values([
      { videoId: v1.id, authorId: gamezone.id, content: "Спасибо за честный обзор! Камеры реально тянут на апгрейд?", likesCount: 342, createdAt: daysAgo(17) },
      { videoId: v1.id, authorId: nauka.id, content: "Автономность впечатляет. Жду сравнение с Pixel.", likesCount: 128, createdAt: daysAgo(16) },
      { videoId: v3.id, authorId: user.id, content: "Сделал по рецепту — жена в восторге! Только гуанчиале заменил беконом.", likesCount: 817, createdAt: daysAgo(60) },
      { videoId: v3.id, authorId: techorbit.id, content: "Шеф, а сливки правда преступление? 😄", likesCount: 534, createdAt: daysAgo(58) },
      { videoId: v3.id, authorId: svysoty.id, content: "Ингредиенты: спагетти 400 г, гуанчиале 150 г, пекорино 50 г, 3 желтка, чёрный перец. Готовьте на здоровье!", likesCount: 2100, createdAt: daysAgo(61) },
      { videoId: v6.id, authorId: user.id, content: "Смотрел на проекторе — как будто побывал там сам. Какой дрон?", likesCount: 96, createdAt: daysAgo(120) },
      { videoId: v6.id, authorId: kuhnia.id, content: "Невероятная красота. Норвегия теперь №1 в моём списке.", likesCount: 210, createdAt: daysAgo(118) },
      { videoId: v11.id, authorId: gamezone.id, content: "Столпы Творения в таком качестве — просто нет слов.", likesCount: 445, createdAt: daysAgo(22) },
    ])
    .returning();

  const c1 = cRows[0];
  const c3 = cRows[2];
  const c6 = cRows[5];
  await db.insert(comments).values([
    { videoId: v1.id, authorId: techorbit.id, parentId: c1.id, content: "Да! Особенно телевик. Полное сравнение в следующем видео 😉", likesCount: 89, createdAt: daysAgo(17) },
    { videoId: v3.id, authorId: kuhnia.id, parentId: c3.id, content: "Главное — что понравилось! Бекон тоже рабочий вариант.", likesCount: 156, createdAt: daysAgo(59) },
    { videoId: v6.id, authorId: svysoty.id, parentId: c6.id, content: "DJI Mavic 4 Pro. Весь маршрут опишу в следующем ролике!", likesCount: 74, createdAt: daysAgo(119) },
  ]);

  await db.update(videos).set({ commentsCount: 3 }).where(sql`${videos.id} = ${v1.id}`);
  await db.update(videos).set({ commentsCount: 4 }).where(sql`${videos.id} = ${v3.id}`);
  await db.update(videos).set({ commentsCount: 3 }).where(sql`${videos.id} = ${v6.id}`);
  await db.update(videos).set({ commentsCount: 1 }).where(sql`${videos.id} = ${v11.id}`);

  console.log("Подписки, лайки, история...");
  await db.insert(subscriptions).values([
    { subscriberId: user.id, channelId: techorbit.id, createdAt: daysAgo(90) },
    { subscriberId: user.id, channelId: svysoty.id, createdAt: daysAgo(70) },
    { subscriberId: user.id, channelId: kuhnia.id, createdAt: daysAgo(50) },
    { subscriberId: techorbit.id, channelId: nauka.id, createdAt: daysAgo(200) },
    { subscriberId: gamezone.id, channelId: techorbit.id, createdAt: daysAgo(150) },
    { subscriberId: kuhnia.id, channelId: svysoty.id, createdAt: daysAgo(80) },
    { subscriberId: nauka.id, channelId: svysoty.id, createdAt: daysAgo(300) },
    { subscriberId: soundwave.id, channelId: gamezone.id, createdAt: daysAgo(40) },
  ]);
  for (const [chan, bump] of [
    [techorbit, 2], [svysoty, 3], [kuhnia, 1], [nauka, 1], [gamezone, 1],
  ] as const) {
    await db
      .update(users)
      .set({ subscribersCount: sql`${users.subscribersCount} + ${bump}` })
      .where(sql`${users.id} = ${chan.id}`);
  }

  await db.insert(likes).values([
    { userId: user.id, videoId: v1.id, value: 1, createdAt: daysAgo(17) },
    { userId: user.id, videoId: v6.id, value: 1, createdAt: daysAgo(100) },
    { userId: user.id, videoId: byTitle("Забытые деревни").id, value: 1, createdAt: daysAgo(5) },
    { userId: user.id, commentId: cRows[4].id, value: 1, createdAt: daysAgo(60) },
    { userId: gamezone.id, commentId: cRows[4].id, value: 1, createdAt: daysAgo(60) },
    { userId: nauka.id, videoId: v6.id, value: 1, createdAt: daysAgo(110) },
  ]);

  await db.insert(watchHistory).values([
    { userId: user.id, videoId: v3.id, watchedAt: daysAgo(0.1) },
    { userId: user.id, videoId: v6.id, watchedAt: daysAgo(0.4) },
    { userId: user.id, videoId: v11.id, watchedAt: daysAgo(1) },
    { userId: user.id, videoId: v1.id, watchedAt: daysAgo(2) },
    { userId: user.id, videoId: byTitle("Собрал игровой").id, watchedAt: daysAgo(4) },
  ]);

  console.log("Плейлисты...");
  const [watchLater, favFood, techReviews] = await db
    .insert(playlists)
    .values([
      { ownerId: user.id, title: "Смотреть позже", description: "Отложенные видео", visibility: "private", createdAt: daysAgo(40) },
      { ownerId: user.id, title: "Кулинарные находки", description: "Рецепты, которые хочу повторить", visibility: "public", createdAt: daysAgo(35) },
      { ownerId: techorbit.id, title: "Обзоры техники", description: "Все обзоры канала", visibility: "public", createdAt: daysAgo(300) },
    ])
    .returning();

  await db.insert(playlistVideos).values([
    { playlistId: watchLater.id, videoId: byTitle("Швейцарские Альпы").id, position: 0 },
    { playlistId: watchLater.id, videoId: byTitle("Киберспорт-2026").id, position: 1 },
    { playlistId: watchLater.id, videoId: byTitle("Лучшие живые").id, position: 2 },
    { playlistId: favFood.id, videoId: v3.id, position: 0 },
    { playlistId: favFood.id, videoId: byTitle("5 завтраков").id, position: 1 },
    { playlistId: favFood.id, videoId: byTitle("Идеальный стейк").id, position: 2 },
    { playlistId: techReviews.id, videoId: v1.id, position: 0 },
    { playlistId: techReviews.id, videoId: byTitle("Нейросети 2026").id, position: 1 },
  ]);

  console.log("Уведомления для пользователя...");
  await db.insert(notifications).values([
    { userId: user.id, text: "TechOrbit опубликовал(а) новое видео: «Нейросети 2026: что они уже умеют»", link: `/watch/${byTitle("Нейросети 2026").id}`, avatarUrl: techorbit.avatarUrl, thumbnailUrl: byTitle("Нейросети 2026").thumbnailUrl, read: false, createdAt: daysAgo(5) },
    { userId: user.id, text: "Мир с высоты опубликовал(а) новое видео: «Забытые деревни Грузии»", link: `/watch/${byTitle("Забытые деревни").id}`, avatarUrl: svysoty.avatarUrl, thumbnailUrl: byTitle("Забытые деревни").thumbnailUrl, read: false, createdAt: daysAgo(6) },
    { userId: user.id, text: "Простая кухня ответил(а) на ваш комментарий к «Паста карбонара за 15 минут»", link: `/watch/${v3.id}`, avatarUrl: kuhnia.avatarUrl, thumbnailUrl: v3.thumbnailUrl, read: false, createdAt: daysAgo(9) },
    { userId: user.id, text: "Добро пожаловать в Streamly! Загрузите первое видео и найдите свою аудиторию.", link: "/upload", avatarUrl: null, thumbnailUrl: null, read: true, createdAt: daysAgo(400) },
  ]);

  const [vCount] = await db.select({ n: sql<number>`count(*)` }).from(videos);
  const [uCount] = await db.select({ n: sql<number>`count(*)` }).from(users);
  console.log(`Готово! Пользователей: ${uCount.n}, видео: ${vCount.n}`);
  console.log("");
  console.log("Учётные записи (пароли захешированы bcryptjs):");
  console.log("  Пользователь:  user@streamly.com  / user123");
  console.log("  Администратор: admin@streamly.com / admin123  (/admin)");
  console.log("  Каналы:        *@streamly.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
