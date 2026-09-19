export const CATEGORIES = [
  "Музыка",
  "Игры",
  "Новости",
  "Спорт",
  "Технологии",
  "Кулинария",
  "Путешествия",
  "Образование",
  "Наука",
  "Развлечения",
  "Фильмы",
  "Стиль",
] as const;

export const VISIBILITIES = [
  { value: "public", label: "Публичное" },
  { value: "unlisted", label: "По ссылке" },
  { value: "private", label: "Приватное" },
] as const;
