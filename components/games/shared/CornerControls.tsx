'use client';

import React from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { PlayerId, PlayerSlot } from '@/lib/naija/types';
import { PlayerCornerSunburst } from '@/components/naija/CornerSunbursts';

export function getCornerPositionClass(playerId: PlayerId): string {
  switch (playerId) {
    case 1:
      return 'top-1.5 left-1.5 sm:top-2 sm:left-2 items-start';
    case 2:
      return 'top-1.5 right-1.5 sm:top-2 sm:right-2 items-end';
    case 3:
      return 'bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 items-start';
    case 4:
      return 'bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 items-end';
  }
}

export function getTouchButtonSize(scale: 'compact' | 'standard' | 'large'): string {
  if (scale === 'compact') return 'h-11 min-w-[44px] text-xs px-2.5';
  if (scale === 'large') return 'h-16 min-w-[64px] text-sm px-4';
  return 'h-13 min-w-[52px] text-xs px-3';
}

interface PlayerCornerBadgeProps {
  player: PlayerSlot;
  score: number;
  scoreLabel?: string;
  lives?: number;
  eliminated?: boolean;
  children?: React.ReactNode;
}

export function PlayerCornerPanel({
  player,
  score,
  scoreLabel,
  lives,
  eliminated,
  children,
}: PlayerCornerBadgeProps) {
  const color = PLAYER_COLORS[player.color];
  const isBottom = player.id === 3 || player.id === 4;

  const badge = (
    <div
      className="flex items-center gap-1.5 rounded-lg bg-slate-700/90 border-2 border-slate-950 px-2 py-0.5 text-[11px] font-display font-black leading-tight text-white shadow-[0_2px_0_#020617]"
    >
      <span
        className="h-2.5 w-2.5 rounded-full border border-slate-950 shrink-0"
        style={{ backgroundColor: color.hex }}
      />
      <span className="truncate max-w-[64px]">{player.name}</span>
      <span className="font-mono tabular-nums text-yellow-300">
        {lives !== undefined ? `♥${lives}` : scoreLabel ?? Math.round(score)}
      </span>
    </div>
  );

  return (
    <>
      <PlayerCornerSunburst playerId={player.id} color={player.color} />
      <div
        className={`absolute ${getCornerPositionClass(
          player.id
        )} z-20 flex flex-col gap-1 text-white touch-game-surface ${
          eliminated ? 'opacity-45 grayscale' : ''
        }`}
      >
        {!isBottom && badge}
        {eliminated ? (
          <div className="rounded-lg bg-slate-900/90 border-2 border-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-200 text-center">
            SPECTATING
          </div>
        ) : (
          children
        )}
        {isBottom && badge}
      </div>
    </>
  );
}
