import type { CSSProperties } from 'react';

interface IconProps { size?: number; color?: string; style?: CSSProperties }
const base = (size: number): CSSProperties => ({ width: size, height: size, flexShrink: 0 });

export const HeartPulse = ({ size = 24, color = '#fff' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none">
    <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5 6 5c2 0 3.2 1.3 4 2.5C10.8 6.3 12 5 14 5c3.5 0 5 4 3.5 7-.5.9-1.3 1.9-2.3 2.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 12.5H7l1.6-3.2L11 15l1.6-2.5h4" stroke="#7FE0CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SyncIcon = ({ size = 20, color = '#fff' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none">
    <path d="M4 12a8 8 0 0 1 13.5-5.8L20 8M20 4v4h-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 12a8 8 0 0 1-13.5 5.8L4 16M4 20v-4h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertTriangle = ({ size = 18, color = '#C7322B' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none">
    <path d="M12 8v5M12 16.5v.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke={color} strokeWidth="1.7" />
  </svg>
);

export const Back = ({ size = 20, color = '#fff' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const Plus = ({ size = 24, color = '#fff' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" /></svg>
);

export const Search = ({ size = 18, color = '#9A8C7C' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
);

export const Check = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const CheckCircle = ({ size = 20, color = '#7FE0CE' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" /><path d="M8.5 12.5l2.3 2.3 4.7-5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const User = ({ size = 18, color = '#9A8C7C' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth="1.6" /><path d="M5 19a7 7 0 0 1 14 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></svg>
);

export const WifiOff = ({ size = 18, color = '#FFB454' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><path d="M3 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 19 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><path d="M4 19 19 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
);

export const Download = ({ size = 18, color = '#0F5750' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none">
    <path d="M12 3v11m0 0l-4-4m4 4l4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const Lock = ({ size = 24, color = '#C7322B' }: IconProps) => (
  <svg style={base(size)} viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></svg>
);
