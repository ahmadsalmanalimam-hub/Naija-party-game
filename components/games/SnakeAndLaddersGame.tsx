'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Dices } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

// Classic 1..100 ladders (low -> high) & snakes (high -> low)
const LADDERS: Record<number, number> = {
  4: 25,
  13: 46,
  33: 49,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
};

const SNAKES: Record<number, number> = {
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  66: 45,
  76: 58,
  89: 53,
  99: 41,
};

function getTileNumberForGrid(rowIdx: number, colIdx: number): number {
  const rowFromBottom = 9 - rowIdx;
  const base = rowFromBottom * 10;
  return rowFromBottom % 2 === 0 ? base + colIdx + 1 : base + (10 - colIdx);
}

export default function SnakeAndLaddersGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [positions, setPositions] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    activePlayers.forEach((p) => (map[p.id] = 1));
    return map;
  });
  const [turnIdx, setTurnIdx] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [status, setStatus] = useState('Tap Roll Dice to start!');
  const finishedRef = useRef(false);

  const currentPlayer = activePlayers[turnIdx % activePlayers.length];

  const rollDice = () => {
    if (isPaused || finishedRef.current) return;
    const roll = 1 + Math.floor(Math.random() * 6);
    setLastRoll(roll);
    soundEngine.playHop();

    const curPos = positions[currentPlayer.id] || 1;
    let target = curPos + roll;
    if (target > 100) {
      // Bounce back from 100
      target = 100 - (target - 100);
    }

    let note = `${currentPlayer.name} rolled ${roll}!`;
    if (LADDERS[target]) {
      note = `${currentPlayer.name} rolled ${roll} & climbed Ladder ${target} → ${LADDERS[target]}!`;
      target = LADDERS[target];
      soundEngine.playScore();
    } else if (SNAKES[target]) {
      note = `${currentPlayer.name} rolled ${roll} & slid down Snake ${target} → ${SNAKES[target]}!`;
      target = SNAKES[target];
      soundEngine.playHit();
    }

    const nextPositions = { ...positions, [currentPlayer.id]: target };
    setPositions(nextPositions);
    setStatus(note);

    const scoreMap: Partial<Record<PlayerId, number>> = {};
    activePlayers.forEach((p) => (scoreMap[p.id] = nextPositions[p.id] || 1));
    onScoreUpdate(scoreMap);

    if (target === 100) {
      finishedRef.current = true;
      soundEngine.playScore();
      window.setTimeout(() => {
        onFinish(buildMatchResult(config, scoreMap, {}, elapsedSeconds));
      }, 900);
      return;
    }

    if (roll !== 6) {
      setTurnIdx((i) => (i + 1) % activePlayers.length);
    } else {
      setStatus(`${note} Bonus roll for 6!`);
    }
  };

  useEffect(() => {
    if (!currentPlayer?.isAI || isPaused || finishedRef.current) return;
    const t = window.setTimeout(() => {
      rollDice();
    }, 700);
    return () => window.clearTimeout(t);
  }, [currentPlayer, isPaused, positions, turnIdx]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-3 p-2.5 sm:p-3 bg-gradient-to-br from-emerald-950 to-slate-950 text-white touch-game-surface">
      {/* 10x10 Board */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="w-full max-w-[540px] aspect-square max-h-full rounded-2xl bg-amber-100 border-4 border-slate-950 p-1 grid grid-cols-10 grid-rows-10 gap-0.5 shadow-2xl">
          {Array.from({ length: 10 }, (_, r) =>
            Array.from({ length: 10 }, (_, c) => {
              const num = getTileNumberForGrid(r, c);
              const isLadder = !!LADDERS[num];
              const isSnake = !!SNAKES[num];
              const herePlayers = activePlayers.filter((p) => (positions[p.id] || 1) === num);
              return (
                <div
                  key={num}
                  className={`relative rounded flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-black leading-none border border-slate-900/20 ${
                    num === 100
                      ? 'bg-yellow-400 text-slate-950'
                      : isLadder
                      ? 'bg-amber-300 text-slate-950'
                      : isSnake
                      ? 'bg-emerald-400 text-slate-950'
                      : (r + c) % 2 === 0
                      ? 'bg-white text-slate-800'
                      : 'bg-sky-100 text-slate-800'
                  }`}
                >
                  <span>{num}</span>
                  {isLadder && <ArrowUpRight className="h-2.5 w-2.5 text-amber-800" />}
                  {isSnake && <ArrowDownRight className="h-2.5 w-2.5 text-red-700" />}
                  {herePlayers.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center flex-wrap gap-0.5 p-0.5">
                      {herePlayers.map((hp) => (
                        <span
                          key={hp.id}
                          className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: PLAYER_COLORS[hp.color].hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Turn & Dice Sidebar */}
      <div className="lg:w-72 rounded-3xl bg-indigo-950/90 border-3 border-slate-950 p-3 flex flex-col justify-between gap-3 shrink-0">
        <div>
          <div className="text-xs font-extrabold text-cyan-300 uppercase">Turn Order</div>
          <div className="mt-2 space-y-1.5">
            {activePlayers.map((p) => {
              const isTurn = p.id === currentPlayer.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 border-2 border-slate-950 ${
                    isTurn ? 'bg-yellow-400 text-slate-950' : 'bg-purple-900/80 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full border border-slate-950 shrink-0"
                      style={{ backgroundColor: PLAYER_COLORS[p.color].hex }}
                    />
                    <span className="text-xs font-extrabold truncate">{p.name}</span>
                  </div>
                  <span className="font-mono text-xs font-black">Tile {positions[p.id] || 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/80 p-3 text-center space-y-2">
          <div className="text-xs font-bold text-amber-200 min-h-[32px]">{status}</div>
          <button
            type="button"
            disabled={currentPlayer.isAI}
            onPointerDown={rollDice}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 text-sm font-black text-slate-950 border-b-4 border-emerald-700 active:translate-y-0.5 disabled:opacity-50"
          >
            <Dices className="h-5 w-5" />
            <span>
              {currentPlayer.isAI
                ? `${currentPlayer.name} Rolling...`
                : lastRoll
                ? `Roll Again (Last: ${lastRoll})`
                : `Roll Dice (${currentPlayer.name})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
