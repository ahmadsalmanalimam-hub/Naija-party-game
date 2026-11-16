'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bomb, Flame, Send } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

export default function HotPotatoGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [holderId, setHolderId] = useState<PlayerId>(() => activePlayers[0].id);
  const [lives, setLives] = useState<Record<PlayerId, number>>(() => {
    const map: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    activePlayers.forEach((p) => (map[p.id] = config.livesCount));
    return map;
  });
  const [eliminated, setEliminated] = useState<Partial<Record<PlayerId, boolean>>>({});
  const [fuseRemaining, setFuseRemaining] = useState(8);
  const [banner, setBanner] = useState('Tap any rival to toss the Hot Potato!');

  const fuseRef = useRef(8);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const initial = 6 + Math.random() * 6;
      fuseRef.current = initial;
      setFuseRemaining(initial);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const holderRef = useRef(holderId);
  const livesRef = useRef(lives);
  const elimRef = useRef(eliminated);
  const finishedRef = useRef(false);
  const elapsedRef = useRef(elapsedSeconds);
  const callbacksRef = useRef({ onScoreUpdate, onFinish });

  useEffect(() => {
    holderRef.current = holderId;
  }, [holderId]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    elimRef.current = eliminated;
  }, [eliminated]);
  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onFinish };
  });

  // Countdown hidden fuse
  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    const id = window.setInterval(() => {
      if (finishedRef.current) return;
      const nextFuse = fuseRef.current - 0.15;
      if (nextFuse <= 0) {
        // BOOM!
        soundEngine.playHit();
        const victimId = holderRef.current;
        const victimName = activePlayers.find((p) => p.id === victimId)?.name || `P${victimId}`;
        const nextLives = {
          ...livesRef.current,
          [victimId]: Math.max(0, (livesRef.current[victimId] || 1) - 1),
        };
        const nextElim = { ...elimRef.current };
        if (nextLives[victimId] <= 0) {
          nextElim[victimId] = true;
        }

        livesRef.current = nextLives;
        elimRef.current = nextElim;
        setLives(nextLives);
        setEliminated(nextElim);

        const scoreMap: Partial<Record<PlayerId, number>> = {};
        activePlayers.forEach((p) => {
          scoreMap[p.id] = (nextLives[p.id] || 0) * 100;
        });
        callbacksRef.current.onScoreUpdate(scoreMap, nextElim);

        const survivors = activePlayers.filter((p) => !nextElim[p.id]);
        const survivingTeams = new Set(survivors.map((s) => s.team));

        const isOver =
          (config.teamScoring && survivingTeams.size <= 1 && activePlayers.length > 1) ||
          (!config.teamScoring && survivors.length <= 1 && activePlayers.length > 1);

        if (isOver) {
          finishedRef.current = true;
          setBanner(`BOOM! ${victimName} exploded!`);
          window.setTimeout(() => {
            callbacksRef.current.onFinish(
              buildMatchResult(config, scoreMap, nextElim, elapsedRef.current)
            );
          }, 900);
          fuseRef.current = 0;
          setFuseRemaining(0);
          return;
        }

        const nextHolder =
          survivors[Math.floor(Math.random() * survivors.length)]?.id || activePlayers[0].id;
        holderRef.current = nextHolder;
        setHolderId(nextHolder);
        setBanner(`BOOM! ${victimName} lost a heart! New fuse ticking...`);
        const resetFuse = 5.5 + Math.random() * 6.5;
        fuseRef.current = resetFuse;
        setFuseRemaining(resetFuse);
        return;
      }

      fuseRef.current = nextFuse;
      setFuseRemaining(nextFuse);
    }, 150);
    return () => window.clearInterval(id);
  }, [activePlayers, config, isPaused]);

  const tossPotato = (targetId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    if (targetId === holderRef.current || elimRef.current[targetId]) return;
    soundEngine.playHop();
    holderRef.current = targetId;
    setHolderId(targetId);
    const targetName = activePlayers.find((p) => p.id === targetId)?.name || `P${targetId}`;
    setBanner(`Tossed to ${targetName}! Pass fast!`);
  };

  // AI holder tosses quickly
  useEffect(() => {
    const holder = activePlayers.find((p) => p.id === holderId);
    if (!holder?.isAI || isPaused || finishedRef.current) return;
    const delay =
      holder.aiDifficulty === 'pro' ? 320 : holder.aiDifficulty === 'normal' ? 520 : 850;
    const t = window.setTimeout(() => {
      const targets = activePlayers.filter((p) => p.id !== holderId && !elimRef.current[p.id]);
      if (targets.length === 0) return;
      // Prefer opponents in team mode
      const enemies = config.teamScoring
        ? targets.filter((x) => x.team !== holder.team)
        : targets;
      const pool = enemies.length > 0 ? enemies : targets;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      tossPotato(pick.id);
    }, delay);
    return () => window.clearTimeout(t);
  }, [activePlayers, config.teamScoring, holderId, isPaused]);

  const holderPlayer = activePlayers.find((p) => p.id === holderId);
  const dangerPulse = fuseRemaining < 2.5;

  return (
    <div
      className={`h-full w-full flex flex-col justify-between p-3 transition-colors touch-game-surface ${
        dangerPulse ? 'bg-red-950' : 'bg-gradient-to-b from-rose-950 to-slate-950'
      } text-white gap-3`}
    >
      {/* Center Bomb Display */}
      <div className="rounded-3xl bg-slate-950/85 border-3 border-orange-400 p-4 flex flex-col items-center justify-center text-center gap-1.5">
        <div className="flex items-center gap-2 text-yellow-300 font-extrabold text-sm">
          {dangerPulse ? <Flame className="h-5 w-5 text-red-500 animate-bounce" /> : <Bomb className="h-5 w-5 text-orange-400" />}
          <span>HOLDING HOT POTATO: {holderPlayer?.name}</span>
        </div>
        <div className="text-xs font-bold text-purple-200">{banner}</div>
      </div>

      {/* 4 Player Cards — Tap a rival to pass when you hold it */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const isHolding = p.id === holderId;
          const isElim = !!eliminated[p.id];
          const canReceive = !isHolding && !isElim && !holderPlayer?.isAI;

          return (
            <button
              key={p.id}
              type="button"
              disabled={!canReceive}
              onPointerDown={() => tossPotato(p.id)}
              className={`rounded-3xl border-4 p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                isElim
                  ? 'opacity-40 grayscale bg-slate-950'
                  : isHolding
                  ? 'bg-orange-500 text-slate-950 ring-4 ring-yellow-300 scale-[1.02]'
                  : canReceive
                  ? 'bg-slate-900/90 hover:bg-slate-800 active:scale-95'
                  : 'bg-slate-900/75'
              }`}
              style={{ borderColor: pCol.hex }}
            >
              <span className="block text-base sm:text-lg font-extrabold">{p.name}</span>
              <span className="block font-mono text-sm font-black">
                {isElim ? 'OUT!' : `Hearts: ${lives[p.id] || 0}`}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-black bg-slate-950/30">
                {isHolding ? (
                  <>
                    <Bomb className="h-3.5 w-3.5" />
                    <span>{holderPlayer?.isAI ? 'AI PASSING...' : 'TAP A RIVAL TO PASS!'}</span>
                  </>
                ) : canReceive ? (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>TOSS HERE!</span>
                  </>
                ) : (
                  <span>SAFE</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
