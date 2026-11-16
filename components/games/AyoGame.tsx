'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

// Authentic 12-pit Nigerian Ayo (Oware) board:
// Side 0 (Bottom, Red/Team 0): indices 0..5 (left to right)
// Side 1 (Top, Blue/Team 1): indices 11..6 (left to right visually, counter-clockwise 6..11)

export default function AyoGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const sideA = activePlayers.filter((_, i) => (config.teamScoring ? _.team === 'red' : i % 2 === 0));
  const sideB = activePlayers.filter((_, i) => (config.teamScoring ? _.team === 'blue' : i % 2 === 1));
  const effectiveSideA = sideA.length > 0 ? sideA : [activePlayers[0]];
  const effectiveSideB = sideB.length > 0 ? sideB : [activePlayers[1] || activePlayers[0]];

  const [pits, setPits] = useState<number[]>(() => Array(12).fill(4));
  const [captures, setCaptures] = useState<[number, number]>([0, 0]);
  const [turnSide, setTurnSide] = useState<0 | 1>(0);
  const [turnIdxA, setTurnIdxA] = useState(0);
  const [turnIdxB, setTurnIdxB] = useState(0);
  const [message, setMessage] = useState('Tap any non-empty pit on your side to sow seeds.');
  const finishedRef = useRef(false);

  const currentPlayer =
    turnSide === 0
      ? effectiveSideA[turnIdxA % effectiveSideA.length]
      : effectiveSideB[turnIdxB % effectiveSideB.length];

  const concludeMatch = (finalCaps: [number, number], remainingPits: number[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const remA = remainingPits.slice(0, 6).reduce((a, b) => a + b, 0);
    const remB = remainingPits.slice(6, 12).reduce((a, b) => a + b, 0);
    const totalA = finalCaps[0] + remA;
    const totalB = finalCaps[1] + remB;

    const scoreMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    effectiveSideA.forEach((p) => (scoreMap[p.id] = totalA));
    effectiveSideB.forEach((p) => (scoreMap[p.id] = totalB));
    onScoreUpdate(scoreMap);
    onFinish(buildMatchResult(config, scoreMap, {}, elapsedSeconds));
  };

  const sowPit = (pitIndex: number) => {
    if (isPaused || finishedRef.current) return;
    const isValidSide = turnSide === 0 ? pitIndex >= 0 && pitIndex <= 5 : pitIndex >= 6 && pitIndex <= 11;
    if (!isValidSide || pits[pitIndex] === 0) return;

    soundEngine.playHop();
    const next = [...pits];
    let seeds = next[pitIndex];
    next[pitIndex] = 0;
    let cursor = pitIndex;

    while (seeds > 0) {
      cursor = (cursor + 1) % 12;
      if (cursor === pitIndex && next[pitIndex] === 0 && seeds >= 12) {
        // Skip origin pit on full lap
        continue;
      }
      next[cursor] += 1;
      seeds -= 1;
    }

    // Check captures on opponent side ending on 2 or 3
    let gained = 0;
    const oppStart = turnSide === 0 ? 6 : 0;
    const oppEnd = turnSide === 0 ? 11 : 5;
    let check = cursor;
    while (check >= oppStart && check <= oppEnd && (next[check] === 2 || next[check] === 3)) {
      gained += next[check];
      next[check] = 0;
      check = (check - 1 + 12) % 12;
    }

    const nextCaps: [number, number] = [
      captures[0] + (turnSide === 0 ? gained : 0),
      captures[1] + (turnSide === 1 ? gained : 0),
    ];

    if (gained > 0) {
      soundEngine.playScore();
      setMessage(`${currentPlayer.name} captured ${gained} seeds!`);
    } else {
      setMessage(`${currentPlayer.name} sowed from pit ${(pitIndex % 6) + 1}.`);
    }

    setPits(next);
    setCaptures(nextCaps);

    const scoreMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    effectiveSideA.forEach((p) => (scoreMap[p.id] = nextCaps[0]));
    effectiveSideB.forEach((p) => (scoreMap[p.id] = nextCaps[1]));
    onScoreUpdate(scoreMap);

    // Win check: 25+ captured OR next side has 0 seeds
    const nextSide: 0 | 1 = turnSide === 0 ? 1 : 0;
    const nextSideHasMoves = next
      .slice(nextSide === 0 ? 0 : 6, nextSide === 0 ? 6 : 12)
      .some((v) => v > 0);

    if (nextCaps[0] >= 25 || nextCaps[1] >= 25 || !nextSideHasMoves) {
      concludeMatch(nextCaps, next);
      return;
    }

    if (turnSide === 0) setTurnIdxA((i) => i + 1);
    else setTurnIdxB((i) => i + 1);
    setTurnSide(nextSide);
  };

  // AI turn
  useEffect(() => {
    if (!currentPlayer?.isAI || isPaused || finishedRef.current) return;
    const t = window.setTimeout(() => {
      const start = turnSide === 0 ? 0 : 6;
      const validPits = [0, 1, 2, 3, 4, 5]
        .map((o) => start + o)
        .filter((idx) => pits[idx] > 0);
      if (validPits.length === 0) return;

      // Pick pit maximizing immediate capture
      let best = validPits[0];
      let bestScore = -1;
      for (const idx of validPits) {
        const landing = (idx + pits[idx]) % 12;
        const isOpp = turnSide === 0 ? landing >= 6 : landing < 6;
        const capVal = isOpp && (pits[landing] === 1 || pits[landing] === 2) ? pits[landing] + 1 : 0;
        if (capVal > bestScore) {
          bestScore = capVal;
          best = idx;
        }
      }
      sowPit(best);
    }, 650);
    return () => window.clearTimeout(t);
  }, [currentPlayer, isPaused, pits, turnSide]);

  const topIndices = [11, 10, 9, 8, 7, 6];
  const bottomIndices = [0, 1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full w-full p-4 bg-amber-950 text-white">
      {/* Top Side (Side B) */}
      <div className="flex items-center justify-between w-full max-w-2xl px-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: PLAYER_COLORS[effectiveSideB[0].color].hex }}
          />
          <span className="text-sm font-extrabold">
            {effectiveSideB.map((p) => p.name).join(' & ')}
          </span>
        </div>
        <span className="font-mono text-lg font-extrabold text-amber-300">
          Captured: {captures[1]}
        </span>
      </div>

      {/* Carved Wooden Ayo Board */}
      <div className="w-full max-w-2xl rounded-3xl bg-amber-800 border-4 border-amber-900 shadow-2xl p-4 sm:p-6 space-y-4">
        {/* Top Row (Side 1) */}
        <div className="grid grid-cols-6 gap-2 sm:gap-4">
          {topIndices.map((idx) => {
            const active = turnSide === 1 && pits[idx] > 0 && !currentPlayer.isAI;
            return (
              <button
                key={idx}
                type="button"
                disabled={!active}
                onClick={() => sowPit(idx)}
                className={`aspect-square rounded-full bg-amber-950 border-4 flex flex-col items-center justify-center transition-transform ${
                  active
                    ? 'border-blue-400 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'border-amber-900/70 opacity-85'
                }`}
              >
                <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-100">
                  {pits[idx]}
                </span>
                <span className="text-[10px] text-amber-400/70">seeds</span>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs font-bold text-amber-200 bg-amber-950/60 rounded-xl py-2 px-3">
          {turnSide === 0 ? '▼ Bottom Side Turn' : '▲ Top Side Turn'} · {message}
        </div>

        {/* Bottom Row (Side 0) */}
        <div className="grid grid-cols-6 gap-2 sm:gap-4">
          {bottomIndices.map((idx) => {
            const active = turnSide === 0 && pits[idx] > 0 && !currentPlayer.isAI;
            return (
              <button
                key={idx}
                type="button"
                disabled={!active}
                onClick={() => sowPit(idx)}
                className={`aspect-square rounded-full bg-amber-950 border-4 flex flex-col items-center justify-center transition-transform ${
                  active
                    ? 'border-red-400 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'border-amber-900/70 opacity-85'
                }`}
              >
                <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-100">
                  {pits[idx]}
                </span>
                <span className="text-[10px] text-amber-400/70">seeds</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Side (Side A) */}
      <div className="flex items-center justify-between w-full max-w-2xl px-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: PLAYER_COLORS[effectiveSideA[0].color].hex }}
          />
          <span className="text-sm font-extrabold">
            {effectiveSideA.map((p) => p.name).join(' & ')}
          </span>
        </div>
        <span className="font-mono text-lg font-extrabold text-amber-300">
          Captured: {captures[0]}
        </span>
      </div>
    </div>
  );
}
