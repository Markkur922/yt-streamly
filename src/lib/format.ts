/** Чистые форматтеры, безопасные для клиента и сервера */

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)} млрд`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)} млн`;
  if (n >= 10_000) return `${Math.floor(n / 1000)} тыс.`;
  if (n >= 1_000) return `${trim(n / 1000)} тыс.`;
  return String(n);
}

function trim(v: number) {
  return (Math.floor(v * 10) / 10).toString().replace(".", ",");
}

export function formatViews(n: number): string {
  const base = formatCount(n);
  if (n < 1000) return `${n} ${plural(n, "просмотр", "просмотра", "просмотров")}`;
  return `${base} просмотров`;
}

export function formatSubs(n: number): string {
  if (n < 1000) return `${n} ${plural(n, "подписчик", "подписчика", "подписчиков")}`;
  return `${formatCount(n)} подписчиков`;
}

export function timeAgo(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const steps: [number, string, string, string][] = [
    [60, "секунду", "секунды", "секунд"],
    [3600, "минуту", "минуты", "минут"],
    [86400, "час", "часа", "часов"],
    [604800, "день", "дня", "дней"],
    [2592000, "неделю", "недели", "недель"],
    [31536000, "месяц", "месяца", "месяцев"],
    [Infinity, "год", "года", "лет"],
  ];
  let prev = 1;
  for (const [limit, one, few, many] of steps) {
    if (seconds < limit) {
      const v = Math.floor(seconds / prev);
      return `${v} ${plural(v, one, few, many)} назад`;
    }
    prev = limit;
  }
  return "давно";
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDateRu(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
