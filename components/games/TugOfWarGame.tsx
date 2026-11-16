'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

export default function TugOfWarGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const leftSide = useMemo(
    () => activePlayers.filter((p, idx) => (config.teamScoring ? p.team === 'red' : idx % 2 === 0)),
    [activePlayers, config.teamScoring]
  );
  const rightSide = useMemo(
    () => activePlayers.filter((p, idx) => (config.teamScoring ? p.team === 'blue' : idx % 2 === 1)),
    [activePlayers, config.teamScoring]
  );

  // ropePos: -100 (left wins) .. 0 (center) .. +100 (right wins)
  const [ropePos, setRopePos] = useState(0);
  const [round, setRound] = useState(1);
  const [surgeActive, setSurgeActive] = useState(false);
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [banner, setBanner] = useState('Tap PULL as fast as you can!');
  const ropeRef = useRef(0);
  const scoresRef = useRef(scores);
  const finishedRef = useRef(false);

  const targetRounds = config.ruleMode === 'rounds' ? config.roundsTarget : 3;

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // Toggle Golden Surge bonus window every few seconds
  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    const id = window.setInterval(() => {
      setSurgeActive((prev) => !prev);
    }, 2600);
    return () => window.clearInterval(id);
  }, [isPaused]);

  const pullRope = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const isLeft = leftSide.some((p) => p.id === playerId);
    const delta = (isLeft ? -1 : 1) * (surgeActive ? 9 : 5.5);
    const nextPos = Math.max(-100, Math.min(100, ropeRef.current + delta));
    ropeRef.current = nextPos;
    setRopePos(nextPos);
    soundEngine.playClick();

    if (Math.abs(nextPos) >= 100) {
      soundEngine.playScore();
      const winners = nextPos <= -100 ? leftSide : rightSide;
      const nextScores = { ...scoresRef.current };
      winners.forEach((w) => {
        nextScores[w.id] = (nextScores[w.id] || 0) + 1;
      });
      scoresRef.current = nextScores;
      setScores(nextScores);
      onScoreUpdate(nextScores);

      const needed = Math.ceil(targetRounds / 2);
      const anyWon = winners.some((w) => nextScores[w.id] >= needed) || round >= targetRounds;

      if (anyWon) {
        finishedRef.current = true;
        setBanner(`${winners.map((w) => w.name).join(' & ')} won the Tug!`);
        window.setTimeout(() => {
          onFinish(buildMatchResult(config, nextScores, {}, elapsedSeconds));
        }, 850);
      } else {
        setBanner(`${winners.map((w) => w.name).join(' & ')} took Round ${round}!`);
        ropeRef.current = 0;
        setRopePos(0);
        setRound((r) => r + 1);
      }
    }
  };

  // AI Pullers
  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    const timers: number[] = [];
    activePlayers.forEach((p) => {
      if (!p.isAI) return;
      const interval = p.aiDifficulty === 'pro' ? 190 : p.aiDifficulty === 'normal' ? 270 : 390;
      const id = window.setInterval(() => pullRope(p.id), interval);
      timers.push(id);
    });
    return () => timers.forEach((t) => window.clearInterval(t));
  }, [activePlayers, isPaused, round, surgeActive]);

  return (
    <div className="h-full w-full flex flex-col justify-between p-3 bg-gradient-to-b from-amber-900 to-slate-950 text-white gap-3 touch-game-surface">
      {/* Top Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-950/80 border-2 border-yellow-400 px-4 py-2">
        <span className="text-xs sm:text-sm font-extrabold text-yellow-300">
          Round {round}/{targetRounds} · {banner}
        </span>
        {surgeActive && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-950 animate-pulse">
            <Flame className="h-3.5 w-3.5" /> 2x POWER SURGE!
          </span>
        )}
      </div>

      {/* Center Tug Arena Rope Visualization */}
      <div className="rounded-3xl bg-amber-950/90 border-4 border-slate-950 p-4 flex flex-col justify-center gap-3 relative overflow-hidden">
        <div className="flex justify-between text-xs font-black uppercase">
          <span className="text-red-400">
            LEFT: {leftSide.map((p) => p.name).join(' & ')}
          </span>
          <span className="text-cyan-400">
            RIGHT: {rightSide.map((p) => p.name).join(' & ')}
          </span>
        </div>

        <div className="relative h-14 rounded-2xl bg-slate-900 border-3 border-slate-950 flex items-center px-4 overflow-hidden">
          {/* Victory Lines */}
          <div className="absolute left-3 top-0 bottom-0 w-1.5 bg-red-500" />
          <div className="absolute right-3 top-0 bottom-0 w-1.5 bg-cyan-400" />
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30" />

          {/* Rope */}
          <div className="w-full h-3 rounded-full bg-amber-200 border-2 border-slate-950" />

          {/* Moving Center Knot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-yellow-400 border-3 border-slate-950 shadow-lg transition-all duration-75 flex items-center justify-center text-xs font-black text-slate-950"
            style={{ left: `${50 + ropePos * 0.44}%` }}
          >
            KNOT
          </div>
        </div>
      </div>

      {/* Player Pull Pads */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const isLeft = leftSide.some((l) => l.id === p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={p.isAI}
              onPointerDown={() => pullRope(p.id)}
              className="rounded-3xl border-4 flex flex-col items-center justify-center p-3 active:scale-95 transition-transform bg-slate-900/90 hover:bg-slate-900"
              style={{ borderColor: pCol.hex }}
            >
              <span className="text-sm sm:text-base font-extrabold">{p.name}</span>
              <span className="text-[11px] font-bold text-cyan-300">
                {isLeft ? 'Pulling LEFT' : 'Pulling RIGHT'} · Wins: {scores[p.id] || 0}
              </span>
              <span className="mt-1.5 rounded-xl bg-yellow-400 px-4 py-1.5 text-sm font-black text-slate-950">
                {p.isAI ? 'AI PULLING...' : 'TAP PULL!'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
