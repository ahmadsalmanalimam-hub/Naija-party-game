'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface Walker {
  id: PlayerId;
  col: number; // 0..11
  row: number; // 0 (top goal) .. 7 (bottom start)
  score: number;
  lives: number;
  eliminated: boolean;
  aiTick: number;
}

interface TrafficCar {
  row: number;
  x: number; // 0..12
  width: number;
  speed: number;
  color: string;
}

const COLS = 12;
const ROWS = 8;

export default function LagosCrossingGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const walkersRef = useRef<Walker[]>([]);
  const carsRef = useRef<TrafficCar[]>([]);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { score: number; lives: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  useEffect(() => {
    walkersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      col: 2 + idx * 2,
      row: ROWS - 1,
      score: 0,
      lives: config.livesCount,
      eliminated: false,
      aiTick: 0.35,
    }));

    const lanes: TrafficCar[] = [];
    const laneConfigs = [
      { row: 1, dir: 1, spd: 3.1, count: 3, color: '#FACC15', w: 1.5 },
      { row: 2, dir: -1, spd: 4.0, count: 3, color: '#EF4444', w: 1.2 },
      { row: 3, dir: 1, spd: 2.5, count: 2, color: '#38BDF8', w: 2.1 },
      { row: 5, dir: -1, spd: 3.6, count: 3, color: '#FACC15', w: 1.4 },
      { row: 6, dir: 1, spd: 2.9, count: 3, color: '#10B981', w: 1.3 },
    ];
    laneConfigs.forEach((lc) => {
      for (let i = 0; i < lc.count; i++) {
        lanes.push({
          row: lc.row,
          x: (i * COLS) / lc.count,
          width: lc.w,
          speed: lc.dir * lc.spd,
          color: lc.color,
        });
      }
    });
    carsRef.current = lanes;
    finishedRef.current = false;
  }, [config.livesCount]);

  const moveWalker = (playerId: PlayerId, dCol: number, dRow: number) => {
    if (isPaused || finishedRef.current) return;
    const w = walkersRef.current.find((x) => x.id === playerId);
    if (!w || w.eliminated) return;
    w.col = Math.max(0, Math.min(COLS - 1, w.col + dCol));
    w.row = Math.max(0, Math.min(ROWS - 1, w.row + dRow));
    soundEngine.playHop();

    if (dRow < 0) {
      w.score += 10;
    }
    if (w.row === 0) {
      w.score += 100;
      w.row = ROWS - 1;
      soundEngine.playScore();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'w') moveWalker(1, 0, -1);
      if (e.key === 's') moveWalker(1, 0, 1);
      if (e.key === 'a') moveWalker(1, -1, 0);
      if (e.key === 'd') moveWalker(1, 1, 0);
      if (e.key === 'ArrowUp') moveWalker(2, 0, -1);
      if (e.key === 'ArrowDown') moveWalker(2, 0, 1);
      if (e.key === 'ArrowLeft') moveWalker(2, -1, 0);
      if (e.key === 'ArrowRight') moveWalker(2, 1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && !isPaused && !finishedRef.current) {
          carsRef.current.forEach((c) => {
            c.x += c.speed * dt;
            if (c.x > COLS + 1) c.x = -c.width;
            if (c.x < -c.width - 1) c.x = COLS;
          });

          walkersRef.current.forEach((w) => {
            if (w.eliminated) return;
            const slot = activePlayers.find((p) => p.id === w.id);

            if (slot?.isAI) {
              w.aiTick -= dt;
              if (w.aiTick <= 0) {
                w.aiTick = slot.aiDifficulty === 'pro' ? 0.24 : slot.aiDifficulty === 'normal' ? 0.36 : 0.55;
                const nextRow = Math.max(0, w.row - 1);
                const danger = carsRef.current.some(
                  (c) => c.row === nextRow && w.col + 0.5 >= c.x - 0.5 && w.col + 0.5 <= c.x + c.width + 0.6
                );
                if (!danger) {
                  moveWalker(w.id, 0, -1);
                } else if (Math.random() < 0.35) {
                  moveWalker(w.id, Math.random() < 0.5 ? -1 : 1, 0);
                }
              }
            }

            // Check vehicle hit
            const hit = carsRef.current.some(
              (c) => c.row === w.row && w.col + 0.72 > c.x && w.col + 0.28 < c.x + c.width
            );
            if (hit) {
              soundEngine.playHit();
              w.row = ROWS - 1;
              if (config.ruleMode === 'lives' || config.ruleMode === 'survival') {
                w.lives -= 1;
                if (w.lives <= 0) {
                  w.eliminated = true;
                  soundEngine.playEliminate();
                }
              } else {
                w.score = Math.max(0, w.score - 25);
              }
            }
          });

          const alive = walkersRef.current.filter((w) => !w.eliminated);
          if ((config.ruleMode === 'lives' || config.ruleMode === 'survival') && alive.length <= 1 && walkersRef.current.length > 1) {
            finishedRef.current = true;
            const scoreMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            const elimMap: Partial<Record<PlayerId, boolean>> = {};
            walkersRef.current.forEach((w) => {
              scoreMap[w.id] = w.score + (w.eliminated ? 0 : 150);
              elimMap[w.id] = w.eliminated;
            });
            onFinish(buildMatchResult(config, scoreMap, elimMap, elapsedSeconds));
          }
        }

        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.clearRect(0, 0, cw, ch);

          const cellW = cw / COLS;
          const cellH = ch / ROWS;

          // Draw rows
          for (let r = 0; r < ROWS; r++) {
            if (r === 0) ctx.fillStyle = '#059669';
            else if (r === 4 || r === ROWS - 1) ctx.fillStyle = '#475569';
            else ctx.fillStyle = '#1E293B';
            ctx.fillRect(0, r * cellH, cw, cellH);

            if (r >= 1 && r <= 6 && r !== 4) {
              ctx.strokeStyle = 'rgba(255,255,255,0.22)';
              ctx.setLineDash([14, 14]);
              ctx.beginPath();
              ctx.moveTo(0, r * cellH);
              ctx.lineTo(cw, r * cellH);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Safe Goal Label
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VICTORIA ISLAND SAFE ZONE (+100 PTS)', cw / 2, cellH * 0.6);

          // Draw traffic
          carsRef.current.forEach((c) => {
            const x = c.x * cellW;
            const y = c.row * cellH + cellH * 0.16;
            const w = c.width * cellW;
            const h = cellH * 0.68;
            ctx.fillStyle = c.color;
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 8);
            ctx.fill();
            ctx.stroke();
          });

          // Draw players
          walkersRef.current.forEach((w) => {
            if (w.eliminated) return;
            const slot = activePlayers.find((p) => p.id === w.id);
            const col = PLAYER_COLORS[slot?.color || 'red'];
            const cx = (w.col + 0.5) * cellW;
            const cy = (w.row + 0.5) * cellH;
            const rad = Math.min(cellW, cellH) * 0.34;

            ctx.fillStyle = col.hex;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${w.id}`, cx, cy + 4);
          });
        }
      }

      hudTimer += dt;
      if (hudTimer >= 0.12) {
        hudTimer = 0;
        const nh: Record<number, { score: number; lives: number; elim: boolean }> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        const eu: Partial<Record<PlayerId, boolean>> = {};
        walkersRef.current.forEach((w) => {
          nh[w.id] = { score: w.score, lives: w.lives, elim: w.eliminated };
          su[w.id] = w.score;
          eu[w.id] = w.eliminated;
        });
        setHud(nh);
        onScoreUpdate(su, eu);
      }

      raf = window.requestAnimationFrame(loop);
    };

    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    raf = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [isPaused]);

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {activePlayers.map((p) => {
        const st = hud[p.id] || { score: 0, lives: config.livesCount, elim: false };
        return (
          <PlayerCornerPanel
            key={p.id}
            player={p}
            score={st.score}
            lives={config.ruleMode === 'lives' || config.ruleMode === 'survival' ? st.lives : undefined}
            eliminated={st.elim}
          >
            {!p.isAI ? (
              <div className="flex items-center justify-center">
                <SteeringWheel
                  variant="hop"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[p.color].hex}
                  label="Steer crossing"
                  onHop={(dCol, dRow) => moveWalker(p.id, dCol, dRow)}
                />
              </div>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">AI Crossing</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
