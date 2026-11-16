'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

interface QuizQuestion {
  q: string;
  options: [string, string, string, string];
  answerIdx: number;
}

const STATIC_BANK: QuizQuestion[] = [
  { q: 'Which bridge connects Lagos Mainland to Lagos Island?', options: ['Third Mainland', 'Niger Bridge', 'Carter Bridge', 'Lekki Link'], answerIdx: 0 },
  { q: 'What are the main colors of a classic Lagos Danfo bus?', options: ['Green & White', 'Yellow & Black', 'Blue & Red', 'Orange & Grey'], answerIdx: 1 },
  { q: 'Which Nigerian dish is famous for its smoky party flavor?', options: ['Party Jollof', 'Suya Wrap', 'Puff-Puff', 'Akara'], answerIdx: 0 },
  { q: 'What is the capital city of Nigeria?', options: ['Lagos', 'Kano', 'Abuja', 'Port Harcourt'], answerIdx: 2 },
  { q: 'Which traditional Nigerian board game uses 12 pits and 48 seeds?', options: ['Ludo', 'Ayo', 'Whot', 'Drafts'], answerIdx: 1 },
  { q: 'What is the nickname of the Nigerian senior men’s football team?', options: ['Black Stars', 'Super Eagles', 'Indomitable Lions', 'Atlas Lions'], answerIdx: 1 },
  { q: 'Which spicy grilled skewered meat is a Nigerian street classic?', options: ['Kilishi', 'Suya', 'Boli', 'Asun'], answerIdx: 1 },
  { q: 'How many states make up Nigeria (excluding FCT)?', options: ['32', '36', '38', '40'], answerIdx: 1 },
  { q: 'Which Nigerian city is known as the "Centre of Excellence"?', options: ['Ibadan', 'Enugu', 'Lagos', 'Kaduna'], answerIdx: 2 },
  { q: 'Roasted plantain served with groundnut is popularly called what?', options: ['Dodo', 'Boli', 'Ewa Agoyin', 'Moi-Moi'], answerIdx: 1 },
  { q: 'Which West African currency is used in Nigeria?', options: ['Cedi', 'Naira', 'Franc', 'Dalasi'], answerIdx: 1 },
  { q: 'Which popular Nigerian card game features "Pick Two" & "Hold On"?', options: ['Whot', 'Poker', 'Blackjack', 'Uno'], answerIdx: 0 },
];

function generateQuestion(roundNum: number): QuizQuestion {
  if (roundNum % 3 === 0) {
    // Procedural rapid math question
    const a = 6 + Math.floor(Math.random() * 19);
    const b = 4 + Math.floor(Math.random() * 15);
    const correct = a + b;
    const opts = new Set<number>([correct]);
    while (opts.size < 4) {
      opts.add(Math.max(2, correct + Math.floor(Math.random() * 11) - 5));
    }
    const arr = Array.from(opts).sort(() => Math.random() - 0.5);
    return {
      q: `Quick Math: What is ${a} + ${b}?`,
      options: [String(arr[0]), String(arr[1]), String(arr[2]), String(arr[3])],
      answerIdx: arr.indexOf(correct),
    };
  }
  return STATIC_BANK[roundNum % STATIC_BANK.length];
}

export default function QuickQuizGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [qIdx, setQIdx] = useState(0);
  const [question, setQuestion] = useState<QuizQuestion>(() => STATIC_BANK[0]);
  const [scores, setScores] = useState<Record<PlayerId, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [locked, setLocked] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState('First correct answer wins the round!');
  const finishedRef = useRef(false);
  const lockedRef = useRef<Record<number, boolean>>({});
  const elapsedRef = useRef(elapsedSeconds);
  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const totalQuestions = config.ruleMode === 'rounds' ? config.roundsTarget * 2 + 1 : 8;

  const advanceQuestion = (nextScores: Record<PlayerId, number>) => {
    const nextIdx = qIdx + 1;
    if (nextIdx >= totalQuestions) {
      finishedRef.current = true;
      onFinish(buildMatchResult(config, nextScores, {}, elapsedRef.current));
      return;
    }
    setQIdx(nextIdx);
    setQuestion(generateQuestion(nextIdx));
    lockedRef.current = {};
    setLocked({});
    setFeedback('Next question — buzz in!');
  };

  const answerOption = (playerId: PlayerId, optIdx: number) => {
    if (isPaused || finishedRef.current || lockedRef.current[playerId]) return;
    const pName = activePlayers.find((p) => p.id === playerId)?.name || `P${playerId}`;

    if (optIdx === question.answerIdx) {
      soundEngine.playScore();
      const nextScores = { ...scores, [playerId]: (scores[playerId] || 0) + 100 };
      setScores(nextScores);
      onScoreUpdate(nextScores);
      setFeedback(`${pName} got it! (${question.options[question.answerIdx]})`);
      const allLocked = { 1: true, 2: true, 3: true, 4: true };
      lockedRef.current = allLocked;
      setLocked(allLocked);
      window.setTimeout(() => advanceQuestion(nextScores), 900);
    } else {
      soundEngine.playHit();
      const nextLocked = { ...lockedRef.current, [playerId]: true };
      lockedRef.current = nextLocked;
      setLocked(nextLocked);
      setFeedback(`${pName} missed! Locked out this round.`);

      // If everyone is locked out, reveal & move on
      if (activePlayers.every((p) => nextLocked[p.id])) {
        window.setTimeout(() => advanceQuestion(scores), 900);
      }
    }
  };

  const answerOptionRef = useRef(answerOption);
  useEffect(() => {
    answerOptionRef.current = answerOption;
  });

  // AI bots answer after realistic delay
  useEffect(() => {
    if (isPaused || finishedRef.current) return;
    const timers: number[] = [];
    activePlayers.forEach((p) => {
      if (!p.isAI || lockedRef.current[p.id]) return;
      const delay = (p.aiDifficulty === 'pro' ? 1400 : p.aiDifficulty === 'normal' ? 2200 : 3200) + Math.random() * 900;
      const t = window.setTimeout(() => {
        const accuracy = p.aiDifficulty === 'pro' ? 0.85 : p.aiDifficulty === 'normal' ? 0.65 : 0.45;
        const pick = Math.random() < accuracy ? question.answerIdx : (question.answerIdx + 1) % 4;
        answerOptionRef.current(p.id, pick);
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activePlayers, isPaused, qIdx, question]);

  return (
    <div className="flex flex-col justify-between h-full w-full p-3 bg-slate-950 text-white gap-3 touch-game-surface">
      {/* Center Question Card */}
      <div className="rounded-3xl bg-indigo-950/90 border-2 border-indigo-400/40 p-4 text-center shadow-xl">
        <div className="text-xs font-bold text-indigo-300">
          Question {qIdx + 1} of {totalQuestions} · {feedback}
        </div>
        <h2 className="mt-1.5 text-lg sm:text-2xl font-extrabold text-white">{question.q}</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          {question.options.map((opt, idx) => (
            <div key={idx} className="rounded-xl bg-white/10 px-3 py-2 text-amber-200 truncate">
              {['A', 'B', 'C', 'D'][idx]}: {opt}
            </div>
          ))}
        </div>
      </div>

      {/* 4 Player Buzzer Quadrants */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {activePlayers.map((p) => {
          const pCol = PLAYER_COLORS[p.color];
          const isLocked = !!locked[p.id];
          return (
            <div
              key={p.id}
              className={`rounded-2xl border-2 bg-slate-900 p-2.5 flex flex-col justify-between ${
                isLocked ? 'opacity-45' : ''
              }`}
              style={{ borderColor: pCol.hex }}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-amber-300">{scores[p.id] || 0}</span>
              </div>
              {!p.isAI ? (
                <div className="grid grid-cols-4 gap-1.5 mt-2 flex-1">
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <button
                      key={letter}
                      type="button"
                      disabled={isLocked}
                      onPointerDown={() => answerOption(p.id, idx)}
                      className="rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 font-extrabold text-base sm:text-lg text-white flex items-center justify-center min-h-[48px]"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs font-bold text-amber-300">
                  AI Thinking...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
