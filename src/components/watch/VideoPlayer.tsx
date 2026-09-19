"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  RotateCcw,
  RotateCw,
  Loader2,
  Check,
} from "lucide-react";
import { formatDuration } from "@/lib/format";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({
  qualities,
  poster,
  autoPlay = true,
}: {
  qualities: { label: string; url: string }[];
  poster?: string | null;
  autoPlay?: boolean;
}) {
  const sources = qualities.length
    ? qualities
    : [{ label: "Авто", url: "" }];

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [srcIdx, setSrcIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [menu, setMenu] = useState<"none" | "root" | "speed" | "quality">("none");

  const savedTime = useRef(0);
  const savedPlaying = useRef(false);
  const pipSupported =
    typeof document !== "undefined" && "pictureInPictureEnabled" in document;

  // Автовоспроизведение
  useEffect(() => {
    if (!autoPlay) return;
    videoRef.current
      ?.play()
      .catch(() => setPlaying(false));
  }, [autoPlay, srcIdx]);

  // Восстановление позиции при смене качества
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      if (savedTime.current > 0) {
        v.currentTime = savedTime.current;
        savedTime.current = 0;
        if (savedPlaying.current) v.play().catch(() => {});
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [srcIdx]);

  // Полноэкранный режим
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const poke = useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) {
        setShowUI(false);
        setMenu("none");
      }
    }, 2600);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* noop */
    }
  }, []);

  const applyQuality = (idx: number) => {
    const v = videoRef.current;
    if (v) {
      savedTime.current = v.currentTime;
      savedPlaying.current = !v.paused;
    }
    setSrcIdx(idx);
    setMenu("none");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = [" ", "k", "f", "m", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    poke();
    const v = videoRef.current;
    if (e.key === " " || e.key.toLowerCase() === "k") togglePlay();
    else if (e.key === "ArrowLeft") seekBy(-10);
    else if (e.key === "ArrowRight") seekBy(10);
    else if (e.key.toLowerCase() === "f") toggleFullscreen();
    else if (e.key.toLowerCase() === "m") toggleMute();
    else if (e.key === "ArrowUp" && v)
      setVolume(() => {
        const nv = Math.min(1, v.volume + 0.1);
        v.volume = nv;
        v.muted = false;
        setMuted(false);
        return nv;
      });
    else if (e.key === "ArrowDown" && v)
      setVolume(() => {
        const nv = Math.max(0, v.volume - 0.1);
        v.volume = nv;
        return nv;
      });
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={poke}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v && !v.paused && menu === "none") setShowUI(false);
      }}
      className="group/player relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black outline-none"
    >
      <video
        ref={videoRef}
        src={sources[srcIdx]?.url}
        poster={poster || undefined}
        playsInline
        className="h-full w-full"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => {
          setPlaying(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setShowUI(true);
        }}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onEnded={() => setShowUI(true)}
      />

      {/* Спиннер буферизации */}
      {waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 size={48} className="animate-spin text-white/90" />
        </div>
      )}

      {/* Центральная кнопка воспроизведения */}
      {!playing && !waiting && (
        <button
          onClick={togglePlay}
          aria-label="Смотреть"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 transition-transform hover:scale-105">
            <Play size={30} className="ml-1 fill-white text-white" />
          </span>
        </button>
      )}

      {/* Панель управления */}
      <div
        className={`absolute inset-x-0 bottom-0 px-3 pb-2 pt-10 player-gradient transition-opacity duration-200 ${
          showUI ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => {
            const v = videoRef.current;
            if (v) v.currentTime = Number(e.target.value);
            setCurrent(Number(e.target.value));
          }}
          aria-label="Перемотка"
          className="slider seek block h-1 w-full"
          style={{ "--played": `${pct}%` } as CSSProperties}
        />
        <div className="mt-1 flex items-center gap-1 text-white sm:gap-2">
          <button
            onClick={() => seekBy(-10)}
            aria-label="Назад на 10 секунд"
            className="rounded-full p-1.5 hover:bg-white/15"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={togglePlay}
            aria-label={playing ? "Пауза" : "Смотреть"}
            className="rounded-full p-1.5 hover:bg-white/15"
          >
            {playing ? (
              <Pause size={22} className="fill-white" />
            ) : (
              <Play size={22} className="fill-white" />
            )}
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="Вперёд на 10 секунд"
            className="rounded-full p-1.5 hover:bg-white/15"
          >
            <RotateCw size={18} />
          </button>

          <div className="group/vol flex items-center">
            <button
              onClick={toggleMute}
              aria-label="Звук"
              className="rounded-full p-1.5 hover:bg-white/15"
            >
              {muted || volume === 0 ? (
                <VolumeX size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                const nv = Number(e.target.value);
                if (v) {
                  v.volume = nv;
                  v.muted = nv === 0;
                }
                setVolume(nv);
                setMuted(nv === 0);
              }}
              aria-label="Громкость"
              className="slider w-0 opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100"
              style={{
                background: `linear-gradient(to right, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(muted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>

          <span className="ml-1 whitespace-nowrap text-xs text-white/90">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setMenu(menu === "root" ? "none" : "root")}
              aria-label="Настройки"
              className="rounded-full p-1.5 hover:bg-white/15"
            >
              <Settings size={19} />
            </button>
            {menu !== "none" && (
              <div className="menu-pop absolute bottom-11 right-0 w-44 overflow-hidden rounded-xl bg-black/90 py-2 text-sm text-white backdrop-blur">
                {menu === "root" && (
                  <>
                    <button
                      onClick={() => setMenu("speed")}
                      className="flex w-full items-center justify-between px-4 py-2 hover:bg-white/10"
                    >
                      Скорость
                      <span className="text-white/60">
                        {speed === 1 ? "Обычная" : `${speed}×`}
                      </span>
                    </button>
                    <button
                      onClick={() => setMenu("quality")}
                      className="flex w-full items-center justify-between px-4 py-2 hover:bg-white/10"
                    >
                      Качество
                      <span className="text-white/60">
                        {sources[srcIdx]?.label}
                      </span>
                    </button>
                  </>
                )}
                {menu === "speed" && (
                  <>
                    <button
                      onClick={() => setMenu("root")}
                      className="w-full px-4 py-2 text-left text-white/60 hover:bg-white/10"
                    >
                      ← Скорость
                    </button>
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.playbackRate = s;
                          setSpeed(s);
                          setMenu("none");
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 hover:bg-white/10"
                      >
                        {s === 1 ? "Обычная" : `${s}×`}
                        {speed === s && <Check size={15} />}
                      </button>
                    ))}
                  </>
                )}
                {menu === "quality" && (
                  <>
                    <button
                      onClick={() => setMenu("root")}
                      className="w-full px-4 py-2 text-left text-white/60 hover:bg-white/10"
                    >
                      ← Качество
                    </button>
                    {sources.map((q, i) => (
                      <button
                        key={`${q.label}-${i}`}
                        onClick={() => applyQuality(i)}
                        className="flex w-full items-center justify-between px-4 py-2 hover:bg-white/10"
                      >
                        {q.label}
                        {srcIdx === i && <Check size={15} />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {pipSupported && (
            <button
              onClick={togglePip}
              aria-label="Картинка в картинке"
              className="rounded-full p-1.5 hover:bg-white/15"
            >
              <PictureInPicture2 size={19} />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            aria-label="Во весь экран"
            className="rounded-full p-1.5 hover:bg-white/15"
          >
            {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
          </button>
        </div>
      </div>
    </div>
  );
}
