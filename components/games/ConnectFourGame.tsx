'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';

const ROWS = 6;
const COLS = 7;

type CellValue = 0 | 1 | 2 | 3 | 4; // 0 empty, or ownerId (playerId or team token)

function findDropRow(grid: CellValue[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === 0) return r;
  }
  return -1;
}

function checkConnectFour(grid: CellValue[][], val: CellValue): boolean {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== val) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === val) count++;
          else break;
        }
        if (count >= 4) return true;
      }
    }
  }
  return false;
}

export default function ConnectFourGame({
  config,
  isPaused,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const [grid, setGrid] = useState<CellValue[][]>(() =>
    Array.from({ length: ROWS }, () => Array<CellValue>(COLS).fill(0))
  );
  const [turnIdx, setTurnIdx] = useState(0);
  const [status, setStatus] = useState('Drop a disc into any column!');
  const finishedRef = useRef(false);

  const currentPlayer = activePlayers[turnIdx % activePlayers.length];

  // In team mode, Red team uses token 1 and Blue team uses token 2 so teammates share 4-in-a-row!
  const getTokenValue = (playerIdx: number): CellValue => {
    const p = activePlayers[playerIdx % activePlayers.length];
    if (config.teamScoring) {
      return p.team === 'red' ? 1 : 2;
    }
    return p.id as CellValue;
  };

  const getTokenColor = (val: CellValue): string => {
    if (val === 0) return '#0F172A';
    if (config.teamScoring) {
      return val === 1 ? '#EF4444' : '#3B82F6';
    }
    const p = activePlayers.find((x) => x.id === val);
    return p ? PLAYER_COLORS[p.color].hex : '#FACC15';
  };

  const dropDisc = (col: number) => {
    if (isPaused || finishedRef.current) return;
    const row = findDropRow(grid, col);
    if (row === -1) return;

    soundEngine.playHop();
    const token = getTokenValue(turnIdx);
    const nextGrid = grid.map((r) => [...r]);
    nextGrid[row][col] = token;
    setGrid(nextGrid);

    if (checkConnectFour(nextGrid, token)) {
      finishedRef.current = true;
      soundEngine.playScore();
      const scoreMap: Partial<Record<PlayerId, number>> = {};
      activePlayers.forEach((p) => {
        const won = config.teamScoring ? p.team === currentPlayer.team : p.id === currentPlayer.id;
        scoreMap[p.id] = won ? 100 : 20;
      });
      onScoreUpdate(scoreMap);
      setStatus(`${currentPlayer.name} connected four!`);
      window.setTimeout(() => {
        onFinish(buildMatchResult(config, scoreMap, {}, elapsedSeconds));
      }, 900);
      return;
    }

    // Check full board draw
    const isFull = nextGrid[0].every((c) => c !== 0);
    if (isFull) {
      finishedRef.current = true;
      const scoreMap: Partial<Record<PlayerId, number>> = {};
      activePlayers.forEach((p) => (scoreMap[p.id] = 50));
      onFinish(buildMatchResult(config, scoreMap, {}, elapsedSeconds));
      return;
    }

    const nextIdx = (turnIdx + 1) % activePlayers.length;
    setTurnIdx(nextIdx);
    setStatus(`${activePlayers[nextIdx].name}'s turn!`);
  };

  // Smart AI column picker
  useEffect(() => {
    if (!currentPlayer?.isAI || isPaused || finishedRef.current) return;
    const t = window.setTimeout(() => {
      const validCols = Array.from({ length: COLS }, (_, c) => c).filter(
        (c) => findDropRow(grid, c) !== -1
      );
      if (validCols.length === 0) return;

      const myToken = getTokenValue(turnIdx);
      // 1. Immediate win
      for (const c of validCols) {
        const r = findDropRow(grid, c);
        const test = grid.map((row) => [...row]);
        test[r][c] = myToken;
        if (checkConnectFour(test, myToken)) {
          dropDisc(c);
          return;
        }
      }
      // 2. Block next player
      const oppToken = getTokenValue(turnIdx + 1);
      if (oppToken !== myToken) {
        for (const c of validCols) {
          const r = findDropRow(grid, c);
          const test = grid.map((row) => [...row]);
          test[r][c] = oppToken;
          if (checkConnectFour(test, oppToken)) {
            dropDisc(c);
            return;
          }
        }
      }
      // 3. Center bias
      const sorted = [...validCols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
      const pick = currentPlayer.aiDifficulty === 'easy'
        ? validCols[Math.floor(Math.random() * validCols.length)]
        : sorted[0];
      dropDisc(pick);
    }, 550);
    return () => window.clearTimeout(t);
  }, [currentPlayer, grid, isPaused, turnIdx]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-indigo-950 to-slate-950 text-white gap-3 touch-game-surface">
      {/* Turn Indicator */}
      <div className="flex items-center gap-3 rounded-2xl bg-purple-900/90 border-2 border-slate-950 px-4 py-2">
        <span
          className="h-4 w-4 rounded-full border-2 border-white"
          style={{ backgroundColor: PLAYER_COLORS[currentPlayer.color].hex }}
        />
        <span className="text-sm font-extrabold text-yellow-300">{status}</span>
      </div>

      {/* 7x6 Blue Board */}
      <div className="rounded-3xl bg-blue-600 border-4 border-slate-950 shadow-2xl p-2.5 sm:p-3.5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <button
                key={`${rIdx}-${cIdx}`}
                type="button"
                disabled={currentPlayer.isAI || findDropRow(grid, cIdx) === -1}
                onPointerDown={() => dropDisc(cIdx)}
                className="h-9 w-9 sm:h-12 sm:w-12 rounded-full border-3 border-slate-950 transition-transform active:scale-95"
                style={{ backgroundColor: getTokenColor(cell) }}
                aria-label={`Drop column ${cIdx + 1}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
