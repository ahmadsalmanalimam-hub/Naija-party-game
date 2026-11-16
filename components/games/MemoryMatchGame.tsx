'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Car,
  Crown,
  Flame,
  Heart,
  Music,
  Shield,
  Star,
  Trophy,
} from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface CardItem {
  uid: number;
  pairId: number;
  matched: boolean;
}

const ICONS = [
  { name: 'Crown', Icon: Crown, bg: '#FACC15', fg: '#0F172A' },
  { name: 'Danfo', Icon: Car, bg: '#F59E0B', fg: '#0F172A' },
  { name: 'Flame', Icon: Flame, bg: '#EF4444', fg: '#FFFFFF' },
  { name: 'Music', Icon: Music, bg: '#22D3EE', fg: '#0F172A' },
  { name: 'Star', Icon: Star, bg: '#A855F7', fg: '#FFFFFF' },
  { name: 'Trophy', Icon: Trophy, bg: '#10B981', fg: '#0F172A' },
  { name: 'Shield', Icon: Shield, bg: '#3B82F6', fg: '#FFFFFF' },
  { name: 'Heart', Icon: Heart, bg: '#EC4899', fg: '#FFFFFF' },
];

function createOrderedDeck(): CardItem[] {
  const raw: number[] = [];
  for (let i = 0; i < 8; i++) {
    raw.push(i, i);
  }
  return raw.map((pairId, idx) => ({ uid: idx, pairId, matched: false }));
}

function createDeck(): CardItem[] {
  const raw: number[] = [];
  for (let i = 0; i < 8; i++) {
    raw.push(i, i);
  }
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw.map((pairId, idx) => ({ uid: idx, pairId, matched: false }));
}

export default function MemoryMatchGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [cards, setCards] = useState<CardItem[]>(() => createOrderedDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [lockBoard, setLockBoard] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCards(createDeck());
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const [banner, setBanner] = useState('Flip two matching cards!');
  const seenMemoryRef = useRef<Record<number, number>>({});
  const finishedRef = useRef(false);

  const currentPlayer = activePlayers[turnIdx % activePlayers.length];

  const handleFlip = (idx: number) => {
    if (isPaused || lockBoard || finishedRef.current) return;
    const card = cards[idx];
    if (!card || card.matched || flipped.includes(idx)) return;

    soundEngine.playClick();
    seenMemoryRef.current[idx] = card.pairId;
    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setLockBoard(true);
      const [a, b] = nextFlipped;
      const isMatch = cards[a].pairId === cards[b].pairId;

      window.setTimeout(() => {
        if (isMatch) {
          soundEngine.playScore();
          const nextCards = cards.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          );
          const nextScores = {
            ...scores,
            [currentPlayer.id]: (scores[currentPlayer.id] || 0) + 100,
          };
          setCards(nextCards);
          setScores(nextScores);
          setFlipped([]);
          setLockBoard(false);
          setBanner(`${currentPlayer.name} matched a pair! Bonus turn!`);
          onScoreUpdate(nextScores);

          if (nextCards.every((c) => c.matched)) {
            finishedRef.current = true;
            onFinish(buildMatchResult(config, nextScores, {}, elapsedSeconds));
          }
        } else {
          soundEngine.playHit();
          const nextTurn = (turnIdx + 1) % activePlayers.length;
          setFlipped([]);
          setTurnIdx(nextTurn);
          setLockBoard(false);
          setBanner(`${activePlayers[nextTurn].name}'s turn!`);
        }
      }, 650);
    }
  };

  // AI memory turn
  useEffect(() => {
    if (!currentPlayer?.isAI || isPaused || lockBoard || finishedRef.current) return;
    if (flipped.length >= 2) return;

    const t = window.setTimeout(() => {
      const available = cards
        .map((c, idx) => ({ c, idx }))
        .filter((x) => !x.c.matched && !flipped.includes(x.idx));
      if (available.length === 0) return;

      const memChance =
        currentPlayer.aiDifficulty === 'pro'
          ? 0.9
          : currentPlayer.aiDifficulty === 'normal'
          ? 0.65
          : 0.3;

      if (flipped.length === 1 && Math.random() < memChance) {
        const firstPair = cards[flipped[0]].pairId;
        const knownMatch = available.find((x) => seenMemoryRef.current[x.idx] === firstPair);
        if (knownMatch) {
          handleFlip(knownMatch.idx);
          return;
        }
      }

      const pick = available[Math.floor(Math.random() * available.length)];
      handleFlip(pick.idx);
    }, 550);
    return () => window.clearTimeout(t);
  }, [cards, currentPlayer, flipped, isPaused, lockBoard]);

  return (
    <div className="h-full w-full flex flex-col justify-between p-3 bg-gradient-to-b from-violet-950 to-slate-950 text-white gap-2.5 touch-game-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-950/75 border-2 border-violet-400/50 px-4 py-2">
        <span className="text-xs sm:text-sm font-extrabold text-yellow-300">{banner}</span>
        <div className="flex items-center gap-3">
          {activePlayers.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                p.id === currentPlayer.id ? 'bg-white/15 ring-2 ring-yellow-300' : ''
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[p.color].hex }}
              />
              <span>{p.name}:</span>
              <span className="font-mono text-amber-300">{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4x4 Memory Card Grid */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-xl h-full max-h-[380px]">
          {cards.map((card, idx) => {
            const isUp = card.matched || flipped.includes(idx);
            const meta = ICONS[card.pairId];
            const Icon = meta.Icon;
            return (
              <button
                key={card.uid}
                type="button"
                disabled={currentPlayer.isAI || lockBoard || isUp}
                onPointerDown={() => handleFlip(idx)}
                className={`rounded-2xl border-3 border-slate-950 flex flex-col items-center justify-center transition-transform active:scale-95 shadow-lg ${
                  card.matched ? 'opacity-65' : ''
                }`}
                style={{
                  backgroundColor: isUp ? meta.bg : '#4C1D95',
                  color: isUp ? meta.fg : '#FACC15',
                }}
              >
                {isUp ? (
                  <>
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                    <span className="text-[10px] font-black mt-0.5">{meta.name}</span>
                  </>
                ) : (
                  <span className="font-display text-2xl font-black">?</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
