import Image from "next/image";

/* The Mytheus mark — cropped/matted to a transparent PNG from the source
   logo.jpeg (see web/public/logo-mark-*.png). Used anywhere the wordmark
   appears at nav/UI scale; the giant footer/hero display wordmark stays
   pure typography (rasterizing the mark that large would blur). */
export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo-mark-192.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}
