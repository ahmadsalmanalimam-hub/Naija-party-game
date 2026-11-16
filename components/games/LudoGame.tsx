'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dices } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

// Standard 15x15 Ludo 52-step outer clockwise path coordinates [row, col]
const OUTER_PATH: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

// Start indices on OUTER_PATH for up to 4 corners: Top-Left (P1), Top-Right (P2), Bottom-Right (P3), Bottom-Left (P4)
const START_IDX: Record<number, number> = { 0: 0, 1: 13, 2: 26, 3: 39 };
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const HOME_LANES: Record<number, Array<[number, number]>> = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const YARD_SPOTS: Record<number, Array<[number, number]>> = {
  0: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  1: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
  2: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
  3: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
};

interface LudoToken {
  seatIdx: number;
  playerId: PlayerId;
  tokenIdx: number;
  progress: number; // -1 = yard, 0..50 = outer track steps from start, 51..56 = home lane (56 = finished)
}

export default function LudoGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [tokens, setTokens] = useState<LudoToken[]>(() => {
    const init: LudoToken[] = [];
    activePlayers.forEach((p, seatIdx) => {
      for (let t = 0; t < 4; t++) {
        init.push({ seatIdx, playerId: p.id, tokenIdx: t, progress: -1 });
      }
    });
    return init;
  });

  const [turnSeat, setTurnSeat] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('Tap Roll Dice to start!');
  const [turnTimerLeft, setTurnTimerLeft] = useState<number>(config.turnTimerSeconds);
  const finishedRef = useRef(false);

  const currentPlayer = activePlayers[turnSeat] || activePlayers[0];

  const getGlobalTrackIndex = (seatIdx: number, progress: number): number | null => {
    if (progress < 0 || progress > 50) return null;
    return (START_IDX[seatIdx] + progress) % 52;
  };

  const getLegalTokenIndices = (allTokens: LudoToken[], seatIdx: number, roll: number): number[] => {
    const legal: number[] = [];
    allTokens.forEach((tk, idx) => {
      if (tk.seatIdx !== seatIdx) return;
      if (tk.progress === 56) return;
      if (tk.progress === -1) {
        if (roll === 6) legal.push(idx);
      } else if (tk.progress + roll <= 56) {
        legal.push(idx);
      }
    });
    return legal;
  };

  const advanceTurn = (nextSeat: number) => {
    setDice(null);
    setTurnSeat(nextSeat % activePlayers.length);
    setTurnTimerLeft(config.turnTimerSeconds);
  };

  const handleMoveToken = (tokenArrayIndex: number, rollOverride?: number) => {
    const roll = rollOverride ?? dice;
    if (roll === null || isPaused || finishedRef.current) return;

    const tk = tokens[tokenArrayIndex];
    if (!tk || tk.seatIdx !== turnSeat) return;

    const legal = getLegalTokenIndices(tokens, turnSeat, roll);
    if (!legal.includes(tokenArrayIndex)) return;

    soundEngine.playHop();
    const nextTokens = tokens.map((t) => ({ ...t }));
    const moved = nextTokens[tokenArrayIndex];
    moved.progress = moved.progress === -1 ? 0 : moved.progress + roll;

    let captured = false;
    const landedGlobal = getGlobalTrackIndex(moved.seatIdx, moved.progress);
    if (landedGlobal !== null && !SAFE_INDICES.has(landedGlobal)) {
      nextTokens.forEach((other) => {
        if (other.seatIdx !== moved.seatIdx) {
          const otherGlobal = getGlobalTrackIndex(other.seatIdx, other.progress);
          if (otherGlobal === landedGlobal) {
            other.progress = -1;
            captured = true;
          }
        }
      });
    }

    if (captured) {
      soundEngine.playHit();
    } else if (moved.progress === 56) {
      soundEngine.playScore();
    }

    setTokens(nextTokens);

    // Update scores
    const scoreMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    activePlayers.forEach((p, sIdx) => {
      const pTokens = nextTokens.filter((t) => t.seatIdx === sIdx);
      scoreMap[p.id] = pTokens.reduce((acc, t) => acc + (t.progress < 0 ? 0 : t.progress + 1), 0);
    });
    onScoreUpdate(scoreMap);

    // Check win (all 4 tokens at 56)
    const finishedCount = nextTokens.filter((t) => t.seatIdx === turnSeat && t.progress === 56).length;
    if (finishedCount === 4) {
      finishedRef.current = true;
      onFinish(buildMatchResult(config, scoreMap, {}, elapsedSeconds));
      return;
    }

    if (roll === 6 || captured || moved.progress === 56) {
      setStatusMsg(`${currentPlayer.name} gets a bonus roll!`);
      setDice(null);
      setTurnTimerLeft(config.turnTimerSeconds);
    } else {
      setStatusMsg(`${activePlayers[(turnSeat + 1) % activePlayers.length].name}'s turn`);
      advanceTurn(turnSeat + 1);
    }
  };

  const rollDice = () => {
    if (dice !== null || isPaused || finishedRef.current) return;
    soundEngine.playDice();
    const rolled = Math.floor(Math.random() * 6) + 1;
    setDice(rolled);

    const legal = getLegalTokenIndices(tokens, turnSeat, rolled);
    if (legal.length === 0) {
      setStatusMsg(`${currentPlayer.name} rolled ${rolled} — no legal moves.`);
      window.setTimeout(() => {
        advanceTurn(turnSeat + 1);
      }, 750);
    } else if (legal.length === 1) {
      setStatusMsg(`${currentPlayer.name} rolled ${rolled}!`);
      window.setTimeout(() => {
        handleMoveToken(legal[0], rolled);
      }, 380);
    } else {
      setStatusMsg(`${currentPlayer.name} rolled ${rolled} — tap a highlighted token!`);
    }
  };

  const turnTimerRef = useRef<number>(config.turnTimerSeconds);
  const advanceTurnRef = useRef(advanceTurn);
  useEffect(() => {
    advanceTurnRef.current = advanceTurn;
  });
  useEffect(() => {
    turnTimerRef.current = turnTimerLeft;
  }, [turnTimerLeft]);

  // Optional turn timer
  useEffect(() => {
    if (config.turnTimerSeconds === 0 || isPaused || finishedRef.current) return;
    const iv = window.setInterval(() => {
      if (turnTimerRef.current <= 1) {
        turnTimerRef.current = config.turnTimerSeconds;
        setTurnTimerLeft(config.turnTimerSeconds);
        advanceTurnRef.current(turnSeat + 1);
        return;
      }
      const next = turnTimerRef.current - 1;
      turnTimerRef.current = next;
      setTurnTimerLeft(next);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [config.turnTimerSeconds, isPaused, turnSeat]);

  // AI automation
  useEffect(() => {
    if (!currentPlayer?.isAI || isPaused || finishedRef.current) return;
    if (dice === null) {
      const t = window.setTimeout(() => rollDice(), 650);
      return () => window.clearTimeout(t);
    } else {
      const legal = getLegalTokenIndices(tokens, turnSeat, dice);
      if (legal.length > 0) {
        const t = window.setTimeout(() => {
          // Prefer capturing or finishing or advancing furthest token
          let chosen = legal[0];
          for (const idx of legal) {
            const tk = tokens[idx];
            const nextProg = tk.progress === -1 ? 0 : tk.progress + dice;
            if (nextProg === 56) {
              chosen = idx;
              break;
            }
            const g = getGlobalTrackIndex(tk.seatIdx, nextProg);
            const canCapture =
              g !== null &&
              !SAFE_INDICES.has(g) &&
              tokens.some((o) => o.seatIdx !== tk.seatIdx && getGlobalTrackIndex(o.seatIdx, o.progress) === g);
            if (canCapture) {
              chosen = idx;
              break;
            }
            if (tk.progress > tokens[chosen].progress) chosen = idx;
          }
          handleMoveToken(chosen, dice);
        }, 550);
        return () => window.clearTimeout(t);
      }
    }
  }, [currentPlayer, dice, isPaused, turnSeat, tokens]);

  const legalSet = useMemo(
    () => (dice !== null ? new Set(getLegalTokenIndices(tokens, turnSeat, dice)) : new Set<number>()),
    [dice, tokens, turnSeat]
  );

  const getTokenCoords = (tk: LudoToken): [number, number] => {
    if (tk.progress === -1) return YARD_SPOTS[tk.seatIdx][tk.tokenIdx];
    if (tk.progress <= 50) {
      const g = getGlobalTrackIndex(tk.seatIdx, tk.progress)!;
      return OUTER_PATH[g];
    }
    return HOME_LANES[tk.seatIdx][tk.progress - 51];
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4 h-full w-full p-3 bg-slate-900 text-white overflow-y-auto">
      {/* 15x15 Ludo Board */}
      <div className="relative w-full max-w-[min(86vw,520px)] aspect-square bg-white rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden shrink-0">
        {/* Colored Yards */}
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-red-500/90 border-r-2 border-b-2 border-slate-800" />
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-500/90 border-l-2 border-b-2 border-slate-800" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-emerald-500/90 border-l-2 border-t-2 border-slate-800" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-amber-400/90 border-r-2 border-t-2 border-slate-800" />

        {/* Center Home */}
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-slate-900 flex items-center justify-center border-2 border-slate-800">
          <span className="text-[10px] font-extrabold text-amber-300">HOME</span>
        </div>

        {/* Track Cells */}
        {OUTER_PATH.map(([r, c], idx) => {
          const isSafe = SAFE_INDICES.has(idx);
          return (
            <div
              key={idx}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`,
              }}
              className={`absolute border border-slate-300 flex items-center justify-center text-[10px] font-bold ${
                idx === 0
                  ? 'bg-red-200'
                  : idx === 13
                  ? 'bg-blue-200'
                  : idx === 26
                  ? 'bg-emerald-200'
                  : idx === 39
                  ? 'bg-amber-200'
                  : isSafe
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-white'
              }`}
            >
              {isSafe ? '★' : ''}
            </div>
          );
        })}

        {/* Home Lanes */}
        {Object.entries(HOME_LANES).map(([sIdx, coords]) =>
          coords.slice(0, 5).map(([r, c], i) => (
            <div
              key={`${sIdx}-${i}`}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`,
              }}
              className={`absolute border border-slate-300 ${
                sIdx === '0'
                  ? 'bg-red-400'
                  : sIdx === '1'
                  ? 'bg-blue-400'
                  : sIdx === '2'
                  ? 'bg-emerald-400'
                  : 'bg-amber-300'
              }`}
            />
          ))
        )}

        {/* Tokens */}
        {tokens.map((tk, idx) => {
          const [r, c] = getTokenCoords(tk);
          const owner = activePlayers[tk.seatIdx];
          const pCol = PLAYER_COLORS[owner?.color || 'red'];
          const isLegal = legalSet.has(idx) && !owner?.isAI;
          return (
            <button
              key={`${tk.seatIdx}-${tk.tokenIdx}`}
              type="button"
              onClick={() => handleMoveToken(idx)}
              style={{
                top: `${((r + 0.5) / 15) * 100}%`,
                left: `${((c + 0.5) / 15) * 100}%`,
                backgroundColor: pCol.hex,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[5.4%] h-[5.4%] rounded-full border-2 border-white shadow-md transition-all flex items-center justify-center text-[9px] font-extrabold text-white ${
                isLegal ? 'scale-125 ring-4 ring-amber-300 z-20 animate-bounce' : 'z-10'
              } ${tk.progress === 56 ? 'opacity-65' : ''}`}
              aria-label={`Token ${tk.tokenIdx + 1}`}
            >
              {tk.tokenIdx + 1}
            </button>
          );
        })}
      </div>

      {/* Turn & Dice Control Panel */}
      <div className="w-full max-w-xs rounded-3xl bg-slate-800 border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: PLAYER_COLORS[currentPlayer?.color || 'red'].hex }}
            />
            <span className="text-sm font-extrabold">{currentPlayer?.name}&apos;s Turn</span>
          </div>
          {config.turnTimerSeconds > 0 && (
            <span className="font-mono text-xs font-bold text-amber-300">{turnTimerLeft}s</span>
          )}
        </div>

        <p className="text-xs text-slate-300 min-h-[32px]">{statusMsg}</p>

        <button
          type="button"
          disabled={dice !== null || currentPlayer?.isAI}
          onClick={rollDice}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 py-4 text-base font-extrabold text-slate-950 border-b-4 border-amber-600 disabled:opacity-50 active:translate-y-0.5"
        >
          <Dices className="h-5 w-5" />
          <span>{dice !== null ? `Rolled: ${dice}` : currentPlayer?.isAI ? 'AI Thinking...' : 'ROLL DICE'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          {activePlayers.map((p, sIdx) => {
            const done = tokens.filter((t) => t.seatIdx === sIdx && t.progress === 56).length;
            return (
              <div
                key={p.id}
                className={`rounded-xl px-2.5 py-2 text-xs font-bold flex items-center justify-between ${
                  sIdx === turnSeat ? 'bg-white/15 ring-1 ring-amber-400' : 'bg-white/5'
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-emerald-300">{done}/4</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
