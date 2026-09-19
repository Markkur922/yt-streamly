"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Flame,
  Users,
  History,
  ThumbsUp,
  ListVideo,
  Settings,
  Music,
  Gamepad2,
  Newspaper,
  Trophy,
  Cpu,
  ChefHat,
  Plane,
  GraduationCap,
  FlaskConical,
  Clapperboard,
  Laugh,
  CircleUserRound,
  ShieldCheck,
  Clapperboard as MyVideosIcon,
} from "lucide-react";
import { useAuth, useSidebar } from "./Providers";
import { Avatar } from "./Avatar";

const CATEGORY_ICONS: [string, ReactNode][] = [
  ["Музыка", <Music key="m" size={19} />],
  ["Игры", <Gamepad2 key="g" size={19} />],
  ["Новости", <Newspaper key="n" size={19} />],
  ["Спорт", <Trophy key="s" size={19} />],
  ["Технологии", <Cpu key="t" size={19} />],
  ["Кулинария", <ChefHat key="c" size={19} />],
  ["Путешествия", <Plane key="p" size={19} />],
  ["Образование", <GraduationCap key="o" size={19} />],
  ["Наука", <FlaskConical key="f" size={19} />],
  ["Развлечения", <Laugh key="r" size={19} />],
  ["Фильмы", <Clapperboard key="k" size={19} />],
];

interface SubChannel {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
}

function Item({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-5 rounded-lg px-3 py-2 text-sm hoverable ${
        active ? "bg-chip font-medium" : ""
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [subs, setSubs] = useState<SubChannel[]>([]);

  useEffect(() => {
    if (!user) {
      setSubs([]);
      return;
    }
    fetch(`/api/users/${user.id}/subscriptions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSubs(d.items ?? []))
      .catch(() => {});
  }, [user]);

  return (
    <div className="flex flex-col gap-0.5 px-3 py-3">
      <Item
        href="/"
        icon={<Home size={20} />}
        label="Главная"
        active={pathname === "/"}
        onClick={onNavigate}
      />
      <Item
        href="/?sort=trending"
        icon={<Flame size={20} />}
        label="Тренды"
        onClick={onNavigate}
      />
      <Item
        href={user ? "/?subs=1" : "/auth"}
        icon={<Users size={20} />}
        label="Подписки"
        onClick={onNavigate}
      />

      <div className="my-2 border-t border-var" />

      {user ? (
        <>
          <Item
            href="/profile?tab=history"
            icon={<History size={20} />}
            label="История"
            onClick={onNavigate}
          />
          <Item
            href="/profile?tab=liked"
            icon={<ThumbsUp size={20} />}
            label="Понравившиеся"
            onClick={onNavigate}
          />
          <Item
            href="/profile?tab=videos"
            icon={<MyVideosIcon size={20} />}
            label="Мои видео"
            onClick={onNavigate}
          />
          <Item
            href="/profile?tab=playlists"
            icon={<ListVideo size={20} />}
            label="Плейлисты"
            onClick={onNavigate}
          />
          <Item
            href="/profile"
            icon={<Settings size={20} />}
            label="Настройки"
            onClick={onNavigate}
          />
          {user.role === "admin" && (
            <Item
              href="/admin"
              icon={<ShieldCheck size={20} />}
              label="Админ-панель"
              active={pathname === "/admin"}
              onClick={onNavigate}
            />
          )}
        </>
      ) : (
        <div className="px-3 py-2">
          <p className="mb-3 text-sm leading-snug text-2">
            Войдите, чтобы смотреть историю, ставить лайки и подписываться
          </p>
          <Link
            href="/auth"
            onClick={onNavigate}
            className="flex w-fit items-center gap-2 rounded-full border border-var px-3.5 py-1.5 text-sm font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/10"
          >
            <CircleUserRound size={18} /> Войти
          </Link>
        </div>
      )}

      {user && subs.length > 0 && (
        <>
          <div className="my-2 border-t border-var" />
          <p className="px-3 py-1.5 text-sm font-medium">Подписки</p>
          {subs.slice(0, 8).map((s) => (
            <Link
              key={s.id}
              href={`/channel/${s.handle}`}
              onClick={onNavigate}
              className="flex items-center gap-5 rounded-lg px-3 py-2 text-sm hoverable"
            >
              <Avatar src={s.avatarUrl} name={s.name} size={24} />
              <span className="truncate">{s.name}</span>
            </Link>
          ))}
        </>
      )}

      <div className="my-2 border-t border-var" />
      <p className="px-3 py-1.5 text-sm font-medium">Категории</p>
      {CATEGORY_ICONS.map(([name, icon]) => (
        <Item
          key={name}
          href={`/?category=${encodeURIComponent(name)}`}
          icon={icon}
          label={name}
          onClick={onNavigate}
        />
      ))}

      <p className="mt-4 px-3 text-xs leading-relaxed text-2">
        Streamly · демо-проект
        <br />
        видеоплатформа
      </p>
    </div>
  );
}

function MiniSidebar() {
  const items = [
    { href: "/", icon: <Home size={20} />, label: "Главная" },
    { href: "/?sort=trending", icon: <Flame size={20} />, label: "Тренды" },
    { href: "/?subs=1", icon: <Users size={20} />, label: "Подписки" },
    { href: "/profile", icon: <CircleUserRound size={20} />, label: "Вы" },
  ];
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          className="flex w-16 flex-col items-center gap-1.5 rounded-lg py-3 hoverable"
        >
          {i.icon}
          <span className="text-[10px]">{i.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function Sidebar() {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Десктоп */}
      <aside className="bg-base fixed bottom-0 left-0 top-14 z-40 hidden overflow-y-auto lg:block"
        style={{ width: collapsed ? 72 : 240 }}
      >
        {collapsed ? <MiniSidebar /> : <SidebarContent />}
      </aside>

      {/* Мобильный drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
          <aside className="bg-base fixed bottom-0 left-0 top-0 z-[70] w-[240px] overflow-y-auto lg:hidden">
            <div className="flex h-14 items-center gap-1 px-3">
              <Link
                href="/"
                onClick={closeMobile}
                className="flex items-center gap-1.5 px-1"
              >
                <span className="grid h-7 w-9 place-items-center rounded-lg bg-[#ff0000]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="text-lg font-bold tracking-tight">Streamly</span>
              </Link>
            </div>
            <SidebarContent onNavigate={closeMobile} />
          </aside>
        </>
      )}
    </>
  );
}
