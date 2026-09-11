import type { ReactNode } from 'react';

export type IconProps = { size?: number; weight?: string; className?: string };

export const Icon = ({ children, size = 20, className }: IconProps & { children: ReactNode }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={String(children)} />
  </svg>
);

export const ArrowLeft = (p: IconProps) => <Icon {...p}>M19 12H5m7 7-7-7 7-7</Icon>;
export const ArrowRight = (p: IconProps) => <Icon {...p}>M5 12h14m-7-7 7 7-7 7</Icon>;
export const Barbell = (p: IconProps) => <Icon {...p}>M6 9v6m12-6v6M3 10v4m18-4v4M6 12h12M3 12h3m12 0h3</Icon>;
export const Check = (p: IconProps) => <Icon {...p}>m5 12 4 4L19 6</Icon>;
export const Clock = (p: IconProps) => <Icon {...p}>M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z</Icon>;
export const DownloadSimple = (p: IconProps) => <Icon {...p}>M12 3v12m0 0 4-4m-4 4-4-4M5 21h14</Icon>;
export const Gear = (p: IconProps) => (
  <Icon {...p}>
    M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-2 .7-.3 1.3 1.2 1.7-1.7 1.7-1.7-1.2-1.3.3-.7 2h-2.4l-.7-2-1.3-.3-1.7 1.2-1.7-1.7L6.9 14l-.3-1.3-2-.7v-2l2-.7.3-1.3-1.2-1.7 1.7-1.7 1.7 1.2 1.3-.3.7-2h2.4l.7 2 1.3.3 1.7-1.2 1.7 1.7L17.1 8l.3 1.3 2 .7v2Z
  </Icon>
);
export const Play = (p: IconProps) => <Icon {...p}>m8 5 11 7-11 7V5Z</Icon>;
export const Repeat = (p: IconProps) => (
  <Icon {...p}>M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3</Icon>
);
export const Timer = (p: IconProps) => <Icon {...p}>M9 2h6M12 6v6l3 2m5-2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z</Icon>;
export const Trash = (p: IconProps) => (
  <Icon {...p}>M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14</Icon>
);
export const UserCircle = (p: IconProps) => (
  <Icon {...p}>M20 21a8 8 0 0 0-16 0m12-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z</Icon>
);
export const Video = (p: IconProps) => <Icon {...p}>m4 5 12 7-12 7V5Zm12 4 4-2v10l-4-2</Icon>;
export const X = (p: IconProps) => <Icon {...p}>M6 6l12 12M18 6 6 18</Icon>;
export const ChartLine = (p: IconProps) => <Icon {...p}>M4 19V5m0 14h16M7 15l3-4 3 2 5-7</Icon>;
export const Undo = (p: IconProps) => (
  <Icon {...p}>M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4</Icon>
);
