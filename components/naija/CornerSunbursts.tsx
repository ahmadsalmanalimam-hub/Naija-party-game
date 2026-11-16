'use client';

import React from 'react';
import { PlayerColorKey, PlayerId } from '@/lib/naija/types';

export function getSunburstClass(color: PlayerColorKey): string {
  switch (color) {
    case 'yellow':
      return 'sunburst-yellow';
    case 'blue':
    case 'teal':
      return 'sunburst-blue';
    case 'red':
    case 'orange':
    case 'pink':
      return 'sunburst-red';
    case 'green':
    default:
      return 'sunburst-green';
  }
}

export function CornerSunburstDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Top-Left Yellow */}
      <div className="absolute -top-16 -left-16 h-36 w-36 sm:h-44 sm:w-44 rounded-full sunburst-yellow border-[5px] border-white ring-[3px] ring-[#1a0536] shadow-lg" />
      {/* Top-Right Blue */}
      <div className="absolute -top-16 -right-16 h-36 w-36 sm:h-44 sm:w-44 rounded-full sunburst-blue border-[5px] border-white ring-[3px] ring-[#1a0536] shadow-lg" />
      {/* Bottom-Left Red */}
      <div className="absolute -bottom-16 -left-16 h-36 w-36 sm:h-44 sm:w-44 rounded-full sunburst-red border-[5px] border-white ring-[3px] ring-[#1a0536] shadow-lg" />
      {/* Bottom-Right Green */}
      <div className="absolute -bottom-16 -right-16 h-36 w-36 sm:h-44 sm:w-44 rounded-full sunburst-green border-[5px] border-white ring-[3px] ring-[#1a0536] shadow-lg" />
    </div>
  );
}

export function PlayerCornerSunburst({
  playerId,
  color,
}: {
  playerId: PlayerId;
  color: PlayerColorKey;
}) {
  const posClass =
    playerId === 1
      ? '-top-12 -left-12'
      : playerId === 2
      ? '-top-12 -right-12'
      : playerId === 3
      ? '-bottom-12 -left-12'
      : '-bottom-12 -right-12';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${posClass} h-28 w-28 sm:h-32 sm:w-32 rounded-full ${getSunburstClass(
        color
      )} border-4 border-white ring-2 ring-slate-950 opacity-90 z-10`}
    />
  );
}
