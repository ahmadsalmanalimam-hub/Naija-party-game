'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drum } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface DrumNote {
  id: number;
  lane: 0 | 1 | 2; // 0=Low, 1=Mid, 2=High
  y: number; // 0..100 (target is 82)
  hitBy: Record<number, boolean>;
}

const LANE_META = [
  { label: 'LOW', bg: 'bg-yellow-400 text-slate-950', dot: 'bg-yellow-400' },
  { label: 'MID', bg: 'bg-cyan-400 text-slate-950', dot: 'bg-cyan-400' },
  { label: 'HIGH', bg: 'bg-rose-500 text-white', dot: 'bg-rose-500' },
];

export default function DrumMasterGame({
  config,
  isPaused,
  onScoreUpdate,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [notes, setNotes] = useState<DrumNote[]>([]);
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [combos, setCombos] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [flashMsg, setFlashMsg] = useState<Record<number, string>>({});

  const notesRef = useRef<DrumNote[]>([]);
  const scoresRef = useRef(scores);
  const combosRef = useRef(combos);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(0);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    combosRef.current = combos;
  }, [combos]);

  const hitLane = (playerId: PlayerId, lane: 0 | 1 | 2) => {
    if (isPaused) return;
    // Find unhit note for this player closest to y=82 inside window 68..96
    const candidate = notesRef.current.find(
      (n) => n.lane === lane && !n.hitBy[playerId] && n.y >= 66 && n.y <= 97
    );

    if (candidate) {
      candidate.hitBy[playerId] = true;
      const dist = Math.abs(candidate.y - 82);
      const isPerfect = dist <= 7;
      const nextCombo = (combosRef.current[playerId] || 0) + 1;
      const mult = Math.min(4, 1 + Math.floor(nextCombo / 3));
      const gained = (isPerfect ? 50 : 30) * mult;

      if (isPerfect) soundEngine.playScore();
      else soundEngine.playClick();

      const nextScores = {
        ...scoresRef.current,
        [playerId]: (scoresRef.current[playerId] || 0) + gained,
      };
      const nextCombos = { ...combosRef.current, [playerId]: nextCombo };
      scoresRef.current = nextScores;
      combosRef.current = nextCombos;
      setScores(nextScores);
      setCombos(nextCombos);
      setFlashMsg((prev) => ({
        ...prev,
        [playerId]: `${isPerfect ? 'PERFECT' : 'GOOD'} +${gained}`,
      }));
      onScoreUpdate(nextScores);
    } else {
      soundEngine.playHit();
      const nextCombos = { ...combosRef.current, [playerId]: 0 };
      combosRef.current = nextCombos;
      setCombos(nextCombos);
      setFlashMsg((prev) => ({ ...prev, [playerId]: 'MISS!' }));
    }
  };

  useEffect(() => {
    if (isPaused) return;
    let last = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      spawnTimerRef.current += dt;
      const nextNotes = notesRef.current
        .map((n) => ({ ...n, y: n.y + 42 * dt }))
        .filter((n) => n.y <= 104);

      if (spawnTimerRef.current >= 0.58) {
        spawnTimerRef.current = 0;
        nextNotes.push({
          id: nextIdRef.current++,
          lane: Math.floor(Math.random() * 3) as 0 | 1 | 2,
          y: 0,
          hitBy: {},
        });
      }

      // AI Players auto-hit notes near y=82
      activePlayers.forEach((p) => {
        if (!p.isAI) return;
        const accuracy = p.aiDifficulty === 'pro' ? 0.92 : p.aiDifficulty === 'normal' ? 0.78 : 0.58;
        nextNotes.forEach((n) => {
          if (!n.hitBy[p.id] && n.y >= 80 && n.y <= 85) {
            if (Math.random() < accuracy) {
              hitLane(p.id, n.lane);
            } else {
              n.hitBy[p.id] = true; // AI skips miss
            }
          }
        });
      });

      notesRef.current = nextNotes;
      setNotes(nextNotes);
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPaused]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-3 p-3 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-white touch-game-surface">
      {/* Shared Talking Drum Highway */}
      <div className="lg:w-2/5 rounded-3xl bg-slate-950/90 border-3 border-amber-400 p-3 flex flex-col justify-between min-h-[180px]">
        <div className="flex items-center justify-between text-xs font-extrabold text-amber-300">
          <span className="flex items-center gap-1.5">
            <Drum className="h-4 w-4" />
            AFROBEAT TALKING DRUM TRACK
          </span>
          <span className="text-cyan-300">Hit at line!</span>
        </div>

        <div className="relative flex-1 my-2 rounded-2xl bg-purple-950/70 border-2 border-purple-700 overflow-hidden grid grid-cols-3">
          {/* 3 vertical lane guides */}
          {[0, 1, 2].map((laneIdx) => (
            <div
              key={laneIdx}
              className="border-r last:border-r-0 border-purple-800/70 relative h-full"
            >
              {notes
                .filter((n) => n.lane === laneIdx)
                .map((n) => (
                  <div
                    key={n.id}
                    className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-12 rounded-full border-2 border-slate-950 shadow ${LANE_META[laneIdx].dot}`}
                    style={{ top: `${n.y}%` }}
                  />
                ))}
            </div>
          ))}

          {/* Target Strike Line at 82% */}
          <div
            className="absolute inset-x-0 h-3 -translate-y-1/2 bg-white/25 border-y-2 border-yellow-300 pointer-events-none"
            style={{ top: '82%' }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black">
          {LANE_META.map((m) => (
            <div key={m.label} className={`rounded-lg py-1 ${m.bg}`}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Player Drum Pad Quadrants */}
      <div className="lg:w-3/5 grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const combo = combos[p.id] || 0;
          const mult = Math.min(4, 1 + Math.floor(combo / 3));
          return (
            <div
              key={p.id}
              className="rounded-3xl border-3 bg-slate-900/90 p-2.5 flex flex-col justify-between gap-2"
              style={{ borderColor: pCol.hex }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold truncate">{p.name}</div>
                  <div className="text-[10px] font-bold text-cyan-300 truncate">
                    {flashMsg[p.id] || 'Ready to drum'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-extrabold text-yellow-300 leading-none tabular-nums">
                    {scores[p.id] || 0}
                  </div>
                  <div className="text-[10px] font-black text-emerald-300">
                    {combo} hit · {mult}x
                  </div>
                </div>
              </div>

              {!p.isAI ? (
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {([0, 1, 2] as const).map((lane) => (
                    <button
                      key={lane}
                      type="button"
                      onPointerDown={() => hitLane(p.id, lane)}
                      className={`rounded-2xl border-2 border-slate-950 font-display text-xs sm:text-sm font-black active:scale-95 flex items-center justify-center min-h-[48px] ${LANE_META[lane].bg}`}
                    >
                      {LANE_META[lane].label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center rounded-2xl bg-slate-800/70 text-xs font-bold text-amber-300">
                  AI Drummer Grooving...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
