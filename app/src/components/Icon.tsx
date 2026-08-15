import type { ReactNode } from "react";

// Kleine, selbst gezeichnete Icon-Sammlung im Material-Symbols-Outlined-Stil (Linienicons,
// abgerundet) - bewusst inline statt Icon-Font/CDN, damit die App ohne externe Requests und
// offline-fähig bleibt (passt zur bestehenden "minimal an Abhängigkeiten"-Linie des Projekts).
export type IconName =
  | "bus"
  | "search"
  | "map"
  | "swap"
  | "swapVertical"
  | "location"
  | "starFilled"
  | "starOutline"
  | "sun"
  | "moon"
  | "auto";

const PATHS: Record<IconName, ReactNode> = {
  bus: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="3" />
      <path d="M3 11h18" />
      <path d="M7 8h3M14 8h3" />
      <circle cx="7.5" cy="19" r="1.6" />
      <circle cx="16.5" cy="19" r="1.6" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M20 20l-5.8-5.8" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6l-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13M14 5l3 3-3 3" />
      <path d="M20 16H7M10 13l-3 3 3 3" />
    </>
  ),
  swapVertical: (
    <>
      <path d="M8 4v13M8 4L5 7M8 4l3 3" />
      <path d="M16 20V7M16 20l-3-3M16 20l3-3" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </>
  ),
  starFilled: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L1 9.2l7.1-.6z" fill="currentColor" />,
  starOutline: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L1 9.2l7.1-.6z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  auto: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
