import Link from "next/link";
import { Play } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-20 place-items-center rounded-2xl bg-[#ff0000]">
          <Play size={30} className="fill-white text-white" />
        </div>
        <h1 className="mt-6 text-6xl font-extrabold tracking-tight">404</h1>
        <p className="mt-2 text-lg font-medium">Страница не найдена</p>
        <p className="mt-1 text-sm text-2">
          Возможно, видео удалено или ссылка устарела
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[#ff0000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
