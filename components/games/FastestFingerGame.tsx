'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

export default function FastestFingerGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'wait' | 'go' | 'round_end'>('wait');
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [lockedOut, setLockedOut] = useState<Record<number, boolean>>({});
  const [banner, setBanner] = useState('Wait for GREEN...');
  const goTimestamp = useRef(0);
  const finishedRef = useRef(false);
  const lockedOutRef = useRef<Record<number, boolean>>({});
  const elapsedRef = useRef(elapsedSeconds);
  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const targetRounds = config.ruleMode === 'rounds' ? config.roundsTarget : 5;

  // Schedule wait -> go transition
  useEffect(() => {
    if (isPaused || finishedRef.current || phase !== 'wait') return;
    const delay = 1400 + Math.random() * 2600;
    const t = window.setTimeout(() => {
      goTimestamp.current = performance.now();
      setPhase('go');
      setBanner('TAP NOW!');
      soundEngine.playCountdownGo();
    }, delay);
    return () => window.clearTimeout(t);
  }, [isPaused, phase, round]);

  const triggerPlayerTap = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current || phase === 'round_end' || lockedOutRef.current[playerId]) return;

    if (phase === 'wait') {
      soundEngine.playHit();
      const nextLocked = { ...lockedOutRef.current, [playerId]: true };
      lockedOutRef.current = nextLocked;
      setLockedOut(nextLocked);
      const pName = activePlayers.find((p) => p.id === playerId)?.name || `P${playerId}`;
      setBanner(`${pName} false started! Locked out!`);
      return;
    }

    // Winner of the round!
    const reactionMs = Math.max(80, Math.round(performance.now() - goTimestamp.current));
    soundEngine.playScore();
    const pName = activePlayers.find((p) => p.id === playerId)?.name || `P${playerId}`;
    const nextScores = { ...scores, [playerId]: (scores[playerId] || 0) + 1 };
    setScores(nextScores);
    onScoreUpdate(nextScores);
    setPhase('round_end');
    setBanner(`${pName} won Round ${round} in ${reactionMs}ms!`);

    const neededWins = config.ruleMode === 'rounds' ? Math.ceil(targetRounds / 2) : targetRounds;
    const wonMatch = nextScores[playerId] >= neededWins || round >= targetRounds;

    window.setTimeout(() => {
      if (wonMatch) {
        finishedRef.current = true;
        onFinish(buildMatchResult(config, nextScores, {}, elapsedRef.current));
      } else {
        setRound((r) => r + 1);
        lockedOutRef.current = {};
        setLockedOut({});
        setPhase('wait');
        setBanner('Wait for GREEN...');
      }
    }, 1250);
  };

  const triggerPlayerTapRef = useRef(triggerPlayerTap);
  useEffect(() => {
    triggerPlayerTapRef.current = triggerPlayerTap;
  });

  // AI bots react on GO
  useEffect(() => {
    if (phase !== 'go' || isPaused || finishedRef.current) return;
    const timers: number[] = [];
    activePlayers.forEach((p) => {
      if (!p.isAI || lockedOutRef.current[p.id]) return;
      const base = p.aiDifficulty === 'pro' ? 240 : p.aiDifficulty === 'normal' ? 370 : 540;
      const delay = base + Math.random() * 190;
      const id = window.setTimeout(() => triggerPlayerTapRef.current(p.id), delay);
      timers.push(id);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activePlayers, phase, isPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === '1') triggerPlayerTap(1);
      if (e.key === 'l' || e.key === '2') triggerPlayerTap(2);
      if (e.key === 'z' || e.key === '3') triggerPlayerTap(3);
      if (e.key === 'm' || e.key === '4') triggerPlayerTap(4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className={`relative h-full w-full flex flex-col justify-between p-3 transition-colors duration-100 touch-game-surface ${
        phase === 'go' ? 'bg-emerald-600' : phase === 'wait' ? 'bg-red-700' : 'bg-slate-900'
      }`}
    >
      {/* Center Signal */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
        <div className="text-xs font-extrabold tracking-wide text-white/80">
          ROUND {round} OF {targetRounds}
        </div>
        <div className="mt-2 text-3xl sm:text-5xl font-extrabold text-white drop-shadow">
          {banner}
        </div>
      </div>

      {/* 4 Player Touch Pads */}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full w-full relative z-10">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const isLocked = !!lockedOut[p.id];
          return (
            <button
              key={p.id}
              type="button"
              disabled={p.isAI || isLocked}
              onPointerDown={() => triggerPlayerTap(p.id)}
              className={`rounded-3xl border-4 flex flex-col items-center justify-center p-4 transition-transform active:scale-95 ${
                isLocked ? 'bg-slate-950/60 opacity-45' : 'bg-slate-950/45 hover:bg-slate-950/55'
              }`}
              style={{ borderColor: pCol.hex }}
            >
              <span className="text-base sm:text-lg font-extrabold text-white">{p.name}</span>
              <span className="mt-1 font-mono text-2xl font-extrabold text-amber-300">
                {scores[p.id] || 0}
              </span>
              <span className="mt-1 text-xs font-bold text-white/80">
                {p.isAI ? 'AI Ready' : isLocked ? 'FALSE START!' : 'TAP PAD'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
