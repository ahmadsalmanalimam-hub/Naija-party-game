'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface MathPuzzle {
  prompt: string;
  options: [number, number, number, number];
  answerIdx: number;
}

function generateMathPuzzle(level: number): MathPuzzle {
  const mode = level % 3;
  let prompt = '';
  let answer = 0;

  if (mode === 0) {
    const a = 7 + Math.floor(Math.random() * (14 + level * 2));
    const b = 5 + Math.floor(Math.random() * (12 + level * 2));
    answer = a + b;
    prompt = `${a} + ${b} = ?`;
  } else if (mode === 1) {
    const b = 4 + Math.floor(Math.random() * 14);
    answer = 6 + Math.floor(Math.random() * 18);
    const a = answer + b;
    prompt = `${a} - ${b} = ?`;
  } else {
    const a = 3 + Math.floor(Math.random() * 9);
    const b = 3 + Math.floor(Math.random() * 9);
    answer = a * b;
    prompt = `${a} × ${b} = ?`;
  }

  const opts = new Set<number>([answer]);
  while (opts.size < 4) {
    const offset = Math.floor(Math.random() * 13) - 6;
    if (offset !== 0) opts.add(Math.max(1, answer + offset));
  }
  const arr = Array.from(opts).sort(() => Math.random() - 0.5);
  return {
    prompt,
    options: [arr[0], arr[1], arr[2], arr[3]],
    answerIdx: arr.indexOf(answer),
  };
}

export default function MathBattleGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const totalRounds = config.ruleMode === 'rounds' ? config.roundsTarget * 2 + 1 : 9;
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState<MathPuzzle>({
    prompt: '7 + 8 = ?',
    options: [13, 15, 16, 18],
    answerIdx: 1,
  });
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [locked, setLocked] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState('Tap the matching answer first!');
  const finishedRef = useRef(false);
  const lockedRef = useRef<Record<number, boolean>>({});
  const elapsedRef = useRef(elapsedSeconds);
  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPuzzle(generateMathPuzzle(0));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const nextRound = (nextScores: Record<PlayerId, number>) => {
    const nextIdx = round + 1;
    if (nextIdx >= totalRounds) {
      finishedRef.current = true;
      onFinish(buildMatchResult(config, nextScores, {}, elapsedRef.current));
      return;
    }
    setRound(nextIdx);
    setPuzzle(generateMathPuzzle(nextIdx));
    lockedRef.current = {};
    setLocked({});
    setFeedback('Next equation — go!');
  };

  const handleAnswer = (playerId: PlayerId, optIdx: number) => {
    if (isPaused || finishedRef.current || lockedRef.current[playerId]) return;
    const pName = activePlayers.find((p) => p.id === playerId)?.name || `P${playerId}`;

    if (optIdx === puzzle.answerIdx) {
      soundEngine.playScore();
      const nextScores = { ...scores, [playerId]: (scores[playerId] || 0) + 100 };
      setScores(nextScores);
      onScoreUpdate(nextScores);
      const allLocked = { 1: true, 2: true, 3: true, 4: true };
      lockedRef.current = allLocked;
      setLocked(allLocked);
      setFeedback(`${pName} nailed ${puzzle.options[puzzle.answerIdx]}!`);
      window.setTimeout(() => nextRound(nextScores), 750);
    } else {
      soundEngine.playHit();
      const nextLocked = { ...lockedRef.current, [playerId]: true };
      lockedRef.current = nextLocked;
      setLocked(nextLocked);
      setFeedback(`${pName} missed! Locked out!`);
      if (activePlayers.every((p) => nextLocked[p.id])) {
        window.setTimeout(() => nextRound(scores), 750);
      }
    }
  };

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  });

  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    const timers: number[] = [];
    activePlayers.forEach((p) => {
      if (!p.isAI || lockedRef.current[p.id]) return;
      const delay =
        (p.aiDifficulty === 'pro' ? 1100 : p.aiDifficulty === 'normal' ? 1850 : 2700) +
        Math.random() * 700;
      const id = window.setTimeout(() => {
        const acc = p.aiDifficulty === 'pro' ? 0.9 : p.aiDifficulty === 'normal' ? 0.72 : 0.5;
        const pick = Math.random() < acc ? puzzle.answerIdx : (puzzle.answerIdx + 1) % 4;
        handleAnswerRef.current(p.id, pick);
      }, delay);
      timers.push(id);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activePlayers, isPaused, puzzle, round]);

  return (
    <div className="h-full w-full flex flex-col justify-between p-3 bg-gradient-to-b from-sky-950 to-slate-950 text-white gap-3 touch-game-surface">
      {/* Chalkboard Question */}
      <div className="rounded-3xl bg-slate-900 border-4 border-yellow-400 p-4 text-center shadow-xl">
        <div className="text-xs font-extrabold text-cyan-300">
          Equation {round + 1}/{totalRounds} · {feedback}
        </div>
        <div className="mt-1 font-mono text-3xl sm:text-5xl font-black text-yellow-300">
          {puzzle.prompt}
        </div>
      </div>

      {/* 4 Player Answer Pads */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const isLocked = !!locked[p.id];
          return (
            <div
              key={p.id}
              className={`rounded-3xl border-3 bg-slate-900/90 p-2.5 flex flex-col justify-between ${
                isLocked ? 'opacity-45' : ''
              }`}
              style={{ borderColor: pCol.hex }}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-amber-300">{scores[p.id] || 0}</span>
              </div>

              {!p.isAI ? (
                <div className="grid grid-cols-2 gap-1.5 mt-1.5 flex-1">
                  {puzzle.options.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLocked}
                      onPointerDown={() => handleAnswer(p.id, idx)}
                      className="rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 font-mono text-lg sm:text-xl font-black border-2 border-slate-950 flex items-center justify-center min-h-[44px]"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs font-bold text-amber-300">
                  AI Calculating...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
