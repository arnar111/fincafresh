import type { SVGProps } from "react";

// Einföld línutákn (24×24), teiknuð fyrir verkefnið
const P: Record<string, string> = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  bag: "M6 7h12l1 14H5L6 7Zm3 0V6a3 3 0 0 1 6 0v1",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  leaf: "M5 19C5 9 11 4 20 4c0 9-5 15-15 15Zm0 0 7-7",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  pause: "M8 5v14M16 5v14",
  play: "M7 5l12 7-12 7V5Z",
  skip: "M5 5l10 7-10 7V5ZM19 5v14",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7S10 3 7.5 4 9 7 12 7Zm0 0s2-4 4.5-3S15 7 12 7Z",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z",
  crown: "M4 18h16M5 15 3 7l5 4 4-6 4 6 5-4-2 8H5Z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-11v6m0-9h.01",
  home: "M4 11l8-7 8 7v9H4v-9Zm6 9v-6h4v6",
  box: "M3 8l9-5 9 5v8l-9 5-9-5V8Zm0 0 9 5 9-5M12 13v8",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3",
  heart: "M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  menu: "M4 7h16M4 12h16M4 17h16",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  thermometer: "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  download: "M12 4v12m0 0-5-5m5 5 5-5M4 20h16",
  upload: "M12 20V8m0 0-5 5m5-5 5 5M4 4h16",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16v4Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  users: "M16 20a6 6 0 0 0-12 0M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 8a5 5 0 0 0-5-5m1-3a3 3 0 1 0 0-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  plug: "M9 2v6m6-6v6M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v5",
  inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4h.01",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  copy: "M8 8h12v12H8zM4 16V4h12",
};

export type IconName = keyof typeof P;

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName | string; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden {...rest}>
      <path d={P[name] ?? P.info} />
    </svg>
  );
}
