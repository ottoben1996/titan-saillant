import type { SVGProps } from 'react';

/**
 * Marque Coach : deux formes qui se rencontrent, comme l'athlète et le
 * programme. Le SVG reste net dans la barre, le choix de profil et les
 * notifications, sans dépendre d'un PNG détouré.
 */
export function LogoMark({ size = 32, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 64 40"
      width={size * 1.6}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect height="28" rx="14" stroke="currentColor" strokeWidth="2.5" width="28" x="5" y="6" />
      <rect height="28" rx="9" stroke="currentColor" strokeWidth="2.5" width="28" x="31" y="6" />
      <path
        d="M31 9.4C27.4 11.7 25.2 15.5 25.2 20S27.4 28.3 31 30.6C34.6 28.3 36.8 24.5 36.8 20S34.6 11.7 31 9.4Z"
        fill="currentColor"
      />
    </svg>
  );
}
