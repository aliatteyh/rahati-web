/** Remote image with a branded gradient placeholder fallback (no next/image host config needed). */
export function Thumb({
  src,
  alt,
  className = "",
  rounded = "rounded-2xl",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover ${rounded} ${className}`}
      />
    );
  }
  const initial = alt.trim().charAt(0).toUpperCase() || "R";
  return (
    <div
      className={`grid h-full w-full place-items-center bg-gradient-to-br from-primary-light to-primary/20 ${rounded} ${className}`}
      aria-hidden
    >
      <span className="text-2xl font-bold text-primary-dark">{initial}</span>
    </div>
  );
}
