"use client";

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-pink-500",
];

export function Avatar({
  src,
  name,
  size = 36,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full bg-chip object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const idx =
    (name || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    COLORS.length;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${COLORS[idx]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}
