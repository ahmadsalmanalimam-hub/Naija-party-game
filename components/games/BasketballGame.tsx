'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface HoopState {
  needle: number; // 0..100
  dir: 1 | -1;
  speed: number;
  score: number;
  streak: number;
  ballArc: number; // 0 = ready, >0 animating
  lastResult: string;
  aiTimer: number;
}

export default function BasketballGame({
  config,
  isPaused,
  onScoreUpdate,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [hoops, setHoops] = useState<Record<number, HoopState>>(() => {
    const map: Record<number, HoopState> = {};
    activePlayers.forEach((p, idx) => {
      map[p.id] = {
        needle: 20 + ((idx * 17) % 55),
        dir: 1,
        speed: 115,
        score: 0,
        streak: 0,
        ballArc: 0,
        lastResult: 'Hit Green Zone!',
        aiTimer: 0.7,
      };
    });
    return map;
  });

  const hoopsRef = useRef(hoops);
  const onScoreUpdateRef = useRef(onScoreUpdate);

  useEffect(() => {
    hoopsRef.current = hoops;
  }, [hoops]);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  const shootBall = (playerId: PlayerId) => {
    if (isPaused) return;
    const h = hoopsRef.current[playerId];
    if (!h || h.ballArc > 0) return;

    const dist = Math.abs(h.needle - 50);
    const isFire = h.streak >= 3;
    let pts = 0;
    let nextStreak = 0;
    let msg = 'Brick!';

    if (dist <= 9) {
      soundEngine.playScore();
      nextStreak = h.streak + 1;
      pts = isFire ? 6 : 3;
      msg = isFire ? 'FIREBALL +6!' : 'SWISH +3!';
    } else if (dist <= 22) {
      soundEngine.playHop();
      nextStreak = h.streak + 1;
      pts = isFire ? 4 : 2;
      msg = isFire ? 'HOT BANK +4!' : 'SCORE +2!';
    } else {
      soundEngine.playHit();
    }

    const updated = {
      ...hoopsRef.current,
      [playerId]: {
        ...h,
        score: h.score + pts,
        streak: nextStreak,
        ballArc: 1,
        lastResult: msg,
        speed: Math.min(185, 115 + nextStreak * 12),
      },
    };
    hoopsRef.current = updated;
    setHoops(updated);

    const scoreMap: Partial<Record<PlayerId, number>> = {};
    activePlayers.forEach((p) => {
      scoreMap[p.id] = updated[p.id]?.score || 0;
    });
    onScoreUpdateRef.current(scoreMap);
  };

  useEffect(() => {
    if (isPaused) return;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const next: Record<number, HoopState> = { ...hoopsRef.current };
      let changed = false;

      activePlayers.forEach((p) => {
        const h = next[p.id];
        if (!h) return;
        changed = true;

        let needle = h.needle + h.dir * h.speed * dt;
        let dir = h.dir;
        if (needle >= 100) {
          needle = 100;
          dir = -1;
        } else if (needle <= 0) {
          needle = 0;
          dir = 1;
        }

        const ballArc = h.ballArc > 0 ? Math.max(0, h.ballArc - dt * 2.2) : 0;

        if (p.isAI && ballArc === 0) {
          const acc = p.aiDifficulty === 'pro' ? 10 : p.aiDifficulty === 'normal' ? 18 : 28;
          if (Math.abs(needle - 50) <= acc && Math.random() < 0.22) {
            hoopsRef.current[p.id] = { ...h, needle, dir, ballArc };
            shootBall(p.id);
            next[p.id] = hoopsRef.current[p.id];
            return;
          }
        }

        next[p.id] = { ...h, needle, dir, ballArc };
      });

      if (changed) {
        hoopsRef.current = next;
        setHoops(next);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayers, isPaused]);

  return (
    <div className="h-full w-full grid grid-cols-2 gap-3 p-3 bg-gradient-to-b from-orange-950 to-slate-950 text-white touch-game-surface">
      {activePlayers.map((p) => {
        const h = hoops[p.id];
        const pCol = PLAYER_COLORS[p.color];
        if (!h) return null;
        const isFire = h.streak >= 3;

        return (
          <div
            key={p.id}
            className="rounded-3xl border-3 bg-slate-900/90 p-3 flex flex-col justify-between gap-2"
            style={{ borderColor: pCol.hex }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-extrabold truncate">{p.name}</span>
                {isFire && (
                  <span className="inline-flex items-center gap-0.5 rounded-lg bg-orange-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                    <Flame className="h-3 w-3" /> 2x
                  </span>
                )}
              </div>
              <span className="font-mono text-2xl font-extrabold text-yellow-300 tabular-nums">
                {h.score}
              </span>
            </div>

            {/* Mini Hoop Illustration & Ball Arc */}
            <div className="relative flex-1 min-h-[70px] rounded-2xl bg-slate-950/75 border-2 border-slate-800 flex items-center justify-between px-4 overflow-hidden">
              <div className="text-xs font-extrabold text-cyan-300">{h.lastResult}</div>
              {/* Ball flying toward hoop */}
              <div
                className="h-7 w-7 rounded-full border-2 border-slate-950 transition-transform"
                style={{
                  backgroundColor: isFire ? '#EF4444' : '#F97316',
                  transform:
                    h.ballArc > 0
                      ? `translate(${(1 - h.ballArc) * 48}px, ${-Math.sin(h.ballArc * Math.PI) * 28}px) scale(0.85)`
                      : 'translate(0px, 0px)',
                }}
              />
              {/* Backboard & Rim */}
              <div className="flex items-center">
                <div className="h-2 w-8 rounded bg-orange-500 border border-slate-950" />
                <div className="h-12 w-2.5 rounded bg-white border border-slate-950" />
              </div>
            </div>

            {/* Oscillating Shot Meter */}
            <div className="relative h-6 w-full rounded-xl bg-slate-950 border-2 border-slate-700 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-amber-400/30"
                style={{ left: '28%', width: '44%' }}
              />
              <div
                className="absolute top-0 bottom-0 bg-emerald-400/60 border-x-2 border-emerald-300"
                style={{ left: '41%', width: '18%' }}
              />
              <div
                className="absolute top-0 bottom-0 w-2 -ml-1 bg-white shadow"
                style={{ left: `${h.needle}%` }}
              />
            </div>

            {!p.isAI ? (
              <button
                type="button"
                onPointerDown={() => shootBall(p.id)}
                className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-extrabold text-white border-b-4 border-orange-700 active:translate-y-0.5"
              >
                SHOOT!
              </button>
            ) : (
              <div className="rounded-2xl bg-slate-800 py-2.5 text-center text-xs font-bold text-amber-300">
                AI Shooter Ready
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
