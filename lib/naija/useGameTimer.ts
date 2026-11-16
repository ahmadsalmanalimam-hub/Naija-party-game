'use client';

import { useEffect, useRef, useState } from 'react';
import { soundEngine } from './sound';
import { TimerSecondsOption } from './types';

interface UseGameTimerOptions {
  initialSeconds: TimerSecondsOption;
  isPaused: boolean;
  isFinished: boolean;
  onTimeUp?: () => void;
}

export function useGameTimer({
  initialSeconds,
  isPaused,
  isFinished,
  onTimeUp,
}: UseGameTimerOptions) {
  const isUnlimited = initialSeconds === 0;
  const [timeRemaining, setTimeRemaining] = useState<number>(initialSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);
  const remainingRef = useRef<number>(initialSeconds);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (isPaused || isFinished) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((e) => e + 1);
      if (!isUnlimited) {
        const prev = remainingRef.current;
        if (prev <= 1) {
          remainingRef.current = 0;
          setTimeRemaining(0);
          if (!firedRef.current) {
            firedRef.current = true;
            onTimeUpRef.current?.();
          }
          return;
        }
        const next = prev - 1;
        remainingRef.current = next;
        setTimeRemaining(next);
        if (next <= 5 && next > 0) {
          soundEngine.playCountdownTick();
        }
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused, isFinished, isUnlimited]);

  const resetTimer = () => {
    remainingRef.current = initialSeconds;
    setTimeRemaining(initialSeconds);
    setElapsedSeconds(0);
    firedRef.current = false;
  };

  return {
    timeRemaining,
    elapsedSeconds,
    isUnlimited,
    resetTimer,
  };
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
