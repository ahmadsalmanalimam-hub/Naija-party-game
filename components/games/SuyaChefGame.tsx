'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Sparkles, UtensilsCrossed } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface GrillState {
  heat: number; // 0..100
  speed: number;
  spiced: boolean;
  score: number;
  streak: number;
  lives: number;
  eliminated: boolean;
  feedback: string;
}

const ORDERS = ['Beef Yaji Special', 'Pepper Gizzard', 'Onion Suya Wrap', 'Chicken Suya'];

export default function SuyaChefGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [grills, setGrills] = useState<Record<number, GrillState>>(() => {
    const map: Record<number, GrillState> = {};
    activePlayers.forEach((p, idx) => {
      map[p.id] = {
        heat: 10,
        speed: 36 + (idx % 4) * 3,
        spiced: false,
        score: 0,
        streak: 0,
        lives: config.livesCount,
        eliminated: false,
        feedback: 'Add Yaji & Serve in Gold!',
      };
    });
    return map;
  });

  const [orderIdx, setOrderIdx] = useState(0);
  const grillsRef = useRef(grills);
  const finishedRef = useRef(false);
  const elapsedRef = useRef(elapsedSeconds);
  const callbacksRef = useRef({ onScoreUpdate, onFinish, checkElimFinish: (_m: Record<number, GrillState>) => {} });

  useEffect(() => {
    grillsRef.current = grills;
  }, [grills]);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const checkElimFinish = (nextMap: Record<number, GrillState>) => {
    if (finishedRef.current || config.ruleMode !== 'lives') return;
    const alive = activePlayers.filter((p) => !nextMap[p.id]?.eliminated);
    if (alive.length <= 1 && activePlayers.length > 1) {
      finishedRef.current = true;
      const scoreMap: Partial<Record<PlayerId, number>> = {};
      const elimMap: Partial<Record<PlayerId, boolean>> = {};
      activePlayers.forEach((p) => {
        scoreMap[p.id] = nextMap[p.id]?.score || 0;
        elimMap[p.id] = !!nextMap[p.id]?.eliminated;
      });
      onFinish(buildMatchResult(config, scoreMap, elimMap, elapsedRef.current));
    }
  };

  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onFinish, checkElimFinish };
  });

  // Grill heat loop
  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let changed = false;
      const next: Record<number, GrillState> = { ...grillsRef.current };

      activePlayers.forEach((p) => {
        const g = next[p.id];
        if (!g || g.eliminated) return;
        let nextHeat = g.heat + g.speed * dt;
        changed = true;

        if (nextHeat >= 100) {
          soundEngine.playHit();
          const nextLives = config.ruleMode === 'lives' ? g.lives - 1 : g.lives;
          const elim = config.ruleMode === 'lives' && nextLives <= 0;
          next[p.id] = {
            ...g,
            heat: 5,
            speed: 35 + Math.random() * 18,
            spiced: false,
            score: Math.max(0, g.score - 25),
            streak: 0,
            lives: nextLives,
            eliminated: elim,
            feedback: elim ? 'BURNED OUT!' : 'BURNT! -25',
          };
        } else {
          // AI Chef logic
          if (p.isAI) {
            if (!g.spiced && nextHeat > 25 && nextHeat < 50 && Math.random() < 0.08) {
              next[p.id] = { ...g, heat: nextHeat, spiced: true, feedback: 'Yaji Added!' };
              return;
            }
            const target =
              p.aiDifficulty === 'pro' ? 68 : p.aiDifficulty === 'normal' ? 64 : 56;
            const tolerance =
              p.aiDifficulty === 'pro' ? 5 : p.aiDifficulty === 'normal' ? 12 : 18;
            if (nextHeat >= target && Math.random() < (p.aiDifficulty === 'pro' ? 0.35 : 0.16)) {
              const inGold = nextHeat >= 58 && nextHeat <= 84;
              const pts = inGold
                ? 100 + (g.spiced ? 35 : 0) + g.streak * 15
                : nextHeat > 84
                ? 45
                : 35;
              next[p.id] = {
                ...g,
                heat: 6,
                speed: 36 + Math.random() * 18,
                spiced: false,
                score: g.score + pts,
                streak: inGold ? g.streak + 1 : 0,
                feedback: inGold ? `PERFECT +${pts}!` : `Served +${pts}`,
              };
              return;
            }
            if (nextHeat > target + tolerance) {
              nextHeat = 99;
            }
          }
          next[p.id] = { ...g, heat: nextHeat };
        }
      });

      if (changed) {
        grillsRef.current = next;
        setGrills(next);
        const scores: Partial<Record<PlayerId, number>> = {};
        const elims: Partial<Record<PlayerId, boolean>> = {};
        activePlayers.forEach((p) => {
          scores[p.id] = next[p.id]?.score || 0;
          elims[p.id] = !!next[p.id]?.eliminated;
        });
        callbacksRef.current.onScoreUpdate(scores, elims);
        callbacksRef.current.checkElimFinish(next);
      }

      if (!finishedRef.current) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [activePlayers, config.ruleMode, isPaused]);

  const handleSpice = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const g = grillsRef.current[playerId];
    if (!g || g.eliminated || g.spiced) return;
    soundEngine.playClick();
    const updated = {
      ...grillsRef.current,
      [playerId]: { ...g, spiced: true, feedback: 'Yaji Spiced! (+35)' },
    };
    grillsRef.current = updated;
    setGrills(updated);
  };

  const handleServe = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const g = grillsRef.current[playerId];
    if (!g || g.eliminated) return;

    const inGold = g.heat >= 58 && g.heat <= 84;
    const raw = g.heat < 35;
    let delta = 0;
    let msg = '';
    let nextStreak = g.streak;

    if (inGold) {
      soundEngine.playScore();
      nextStreak += 1;
      delta = 100 + (g.spiced ? 35 : 0) + (nextStreak - 1) * 15;
      msg = `PERFECT +${delta}!`;
      setOrderIdx((i) => (i + 1) % ORDERS.length);
    } else if (raw) {
      soundEngine.playHit();
      nextStreak = 0;
      delta = 15;
      msg = 'Still Raw! +15';
    } else {
      soundEngine.playHop();
      nextStreak = 0;
      delta = 45 + (g.spiced ? 15 : 0);
      msg = `Good Serve +${delta}`;
    }

    const updated = {
      ...grillsRef.current,
      [playerId]: {
        ...g,
        heat: 6,
        speed: 35 + Math.random() * 18,
        spiced: false,
        score: g.score + delta,
        streak: nextStreak,
        feedback: msg,
      },
    };
    grillsRef.current = updated;
    setGrills(updated);
  };

  return (
    <div className="relative h-full w-full flex flex-col justify-between bg-gradient-to-b from-orange-950 via-red-950 to-slate-950 p-3 gap-3 text-white touch-game-surface">
      {/* Center Night Market Order Banner */}
      <div className="rounded-2xl bg-slate-950/80 border-2 border-orange-400/70 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase">
            Hot Order: {ORDERS[orderIdx]}
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-300">
          Serve inside 58%–84% Gold Zone!
        </span>
      </div>

      {/* Player Grill Stations */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const g = grills[p.id];
          const pCol = PLAYER_COLORS[p.color];
          if (!g) return null;
          const inGold = g.heat >= 58 && g.heat <= 84;
          const danger = g.heat > 84;

          return (
            <div
              key={p.id}
              className={`rounded-3xl border-3 bg-slate-900/90 p-3 flex flex-col justify-between gap-2 ${
                g.eliminated ? 'opacity-45 grayscale' : ''
              }`}
              style={{ borderColor: pCol.hex }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: pCol.hex }}
                  />
                  <span className="text-sm font-extrabold truncate">{p.name}</span>
                  {g.streak > 1 && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {g.streak}x
                    </span>
                  )}
                </div>
                <span className="font-mono text-lg font-extrabold text-yellow-300 tabular-nums">
                  {g.score}
                </span>
              </div>

              {/* Heat Meter with Golden Target Zone */}
              <div className="space-y-1">
                <div className="relative h-7 w-full rounded-xl bg-slate-950 border-2 border-slate-700 overflow-hidden">
                  {/* Golden target zone 58%..84% */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-400/35 border-x-2 border-emerald-300"
                    style={{ left: '58%', width: '26%' }}
                  />
                  {/* Heat bar */}
                  <div
                    className={`h-full transition-none ${
                      danger
                        ? 'bg-red-500'
                        : inGold
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, g.heat)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[11px] font-black text-white drop-shadow">
                    <span>{g.feedback}</span>
                    <span className="font-mono">{Math.round(g.heat)}%</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              {!p.isAI ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={g.eliminated || g.spiced}
                    onPointerDown={() => handleSpice(p.id)}
                    className={`rounded-2xl py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-extrabold border-2 border-slate-950 active:translate-y-0.5 ${
                      g.spiced
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-orange-500 text-white hover:bg-orange-400'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{g.spiced ? 'Spiced!' : 'Yaji Spice'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={g.eliminated}
                    onPointerDown={() => handleServe(p.id)}
                    className={`rounded-2xl py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-extrabold border-2 border-slate-950 active:translate-y-0.5 ${
                      inGold
                        ? 'bg-emerald-400 text-slate-950 ring-2 ring-white'
                        : 'bg-cyan-400 text-slate-950'
                    }`}
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>Serve!</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-800/80 py-2.5 text-center text-xs font-bold text-amber-300">
                  AI Chef Grilling...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
