'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

type ZoneIdx = 0 | 1 | 2; // 0=Left, 1=Center, 2=Right
const ZONE_NAMES = ['LEFT', 'CENTER', 'RIGHT'];

export default function PenaltyShootoutGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const totalKicksPerPlayer = config.ruleMode === 'rounds' ? config.roundsTarget : 3;
  const totalTurns = activePlayers.length * totalKicksPerPlayer;

  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<'shooter' | 'keeper' | 'reveal'>('shooter');
  const [shotZone, setShotZone] = useState<ZoneIdx | null>(null);
  const [diveZone, setDiveZone] = useState<ZoneIdx | null>(null);
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [banner, setBanner] = useState('Striker: Secretly pick shot corner!');
  const finishedRef = useRef(false);

  const shooter = activePlayers[turnIndex % activePlayers.length];
  const keeper = useMemo(() => {
    if (activePlayers.length === 1) return shooter;
    const candidates = activePlayers.filter((p) => {
      if (p.id === shooter.id) return false;
      if (config.teamScoring && p.team === shooter.team) return false;
      return true;
    });
    return candidates[0] || activePlayers[(turnIndex + 1) % activePlayers.length];
  }, [activePlayers, config.teamScoring, shooter, turnIndex]);

  const resolveKick = (sZone: ZoneIdx, kZone: ZoneIdx) => {
    const scored = sZone !== kZone;
    setShotZone(sZone);
    setDiveZone(kZone);
    setPhase('reveal');

    let nextScores = scores;
    if (scored) {
      soundEngine.playScore();
      nextScores = { ...scores, [shooter.id]: (scores[shooter.id] || 0) + 1 };
      setScores(nextScores);
      onScoreUpdate(nextScores);
      setBanner(`GOOOAL! ${shooter.name} slotted it ${ZONE_NAMES[sZone]}!`);
    } else {
      soundEngine.playHit();
      setBanner(`SAVED! ${keeper.name} read ${ZONE_NAMES[kZone]}!`);
    }

    window.setTimeout(() => {
      if (finishedRef.current) return;
      const nextTurn = turnIndex + 1;
      if (nextTurn >= totalTurns) {
        finishedRef.current = true;
        onFinish(buildMatchResult(config, nextScores, {}, elapsedSeconds));
      } else {
        setTurnIndex(nextTurn);
        setShotZone(null);
        setDiveZone(null);
        setPhase('shooter');
        setBanner('Striker: Secretly pick shot corner!');
      }
    }, 1300);
  };

  // AI Striker auto-kick
  useEffect(() => {
    if (isPaused || finishedRef.current || phase !== 'shooter' || !shooter?.isAI) return;
    const t = window.setTimeout(() => {
      const pick = Math.floor(Math.random() * 3) as ZoneIdx;
      setShotZone(pick);
      setPhase('keeper');
      setBanner(`${keeper.name}: Pick where to DIVE!`);
    }, 700);
    return () => window.clearTimeout(t);
  }, [isPaused, keeper.name, phase, shooter?.isAI]);

  // AI Keeper auto-dive
  useEffect(() => {
    if (isPaused || finishedRef.current || phase !== 'keeper') return;
    const isAiKeeper = keeper?.isAI || activePlayers.length === 1;
    if (!isAiKeeper || shotZone === null) return;
    const t = window.setTimeout(() => {
      const pick = Math.floor(Math.random() * 3) as ZoneIdx;
      resolveKick(shotZone, pick);
    }, 650);
    return () => window.clearTimeout(t);
  }, [activePlayers.length, isPaused, keeper?.isAI, phase, shotZone]);

  const handleShooterPick = (zone: ZoneIdx) => {
    if (isPaused || phase !== 'shooter' || shooter.isAI) return;
    soundEngine.playClick();
    setShotZone(zone);
    setPhase('keeper');
    setBanner(`${keeper.name}: Secretly pick DIVE direction!`);
  };

  const handleKeeperPick = (zone: ZoneIdx) => {
    if (isPaused || phase !== 'keeper' || keeper.isAI || shotZone === null) return;
    soundEngine.playClick();
    resolveKick(shotZone, zone);
  };

  return (
    <div className="h-full w-full flex flex-col justify-between p-3 sm:p-4 bg-gradient-to-b from-emerald-900 to-green-950 text-white gap-3 touch-game-surface">
      {/* Turn Info + Score Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-950/75 border-2 border-emerald-400/50 px-4 py-2">
        <div className="text-xs sm:text-sm font-extrabold text-yellow-300">
          Kick {turnIndex + 1}/{totalTurns} · {banner}
        </div>
        <div className="flex items-center gap-3">
          {activePlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs font-extrabold">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[p.color].hex }}
              />
              <span>{p.name}:</span>
              <span className="font-mono text-amber-300">{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Goalpost Viewport */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="relative w-full max-w-2xl h-44 sm:h-56 rounded-2xl border-4 border-white bg-emerald-800/70 grid grid-cols-3 overflow-hidden shadow-2xl">
          {[0, 1, 2].map((z) => {
            const isShot = phase === 'reveal' && shotZone === z;
            const isDive = phase === 'reveal' && diveZone === z;
            return (
              <div
                key={z}
                className="border-r last:border-r-0 border-white/25 flex flex-col items-center justify-center gap-2 relative"
              >
                <span className="text-xs font-black text-white/40">{ZONE_NAMES[z]}</span>
                {isShot && (
                  <div className="h-10 w-10 rounded-full bg-white border-4 border-slate-950 shadow-lg animate-bounce" />
                )}
                {isDive && (
                  <div className="rounded-xl bg-amber-400 border-2 border-slate-950 px-3 py-1 text-xs font-black text-slate-950">
                    KEEPER
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons for Current Active Role */}
      <div className="rounded-3xl bg-slate-950/85 border-2 border-white/20 p-3">
        {phase === 'shooter' && (
          <div className="space-y-2">
            <div className="text-center text-xs font-extrabold text-cyan-300">
              SHOOTER: {shooter.name} — Tap your target corner!
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  disabled={shooter.isAI}
                  onPointerDown={() => handleShooterPick(z)}
                  className="rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-slate-950 border-b-4 border-amber-600 active:translate-y-0.5 disabled:opacity-50"
                >
                  Shoot {ZONE_NAMES[z]}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'keeper' && (
          <div className="space-y-2">
            <div className="text-center text-xs font-extrabold text-rose-300">
              GOALKEEPER: {keeper.name} — Tap where to dive!
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  disabled={keeper.isAI || activePlayers.length === 1}
                  onPointerDown={() => handleKeeperPick(z)}
                  className="rounded-2xl bg-cyan-400 py-3.5 text-sm font-black text-slate-950 border-b-4 border-cyan-600 active:translate-y-0.5 disabled:opacity-50"
                >
                  Dive {ZONE_NAMES[z]}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="py-3 text-center text-base font-extrabold text-emerald-300">
            {banner}
          </div>
        )}
      </div>
    </div>
  );
}
