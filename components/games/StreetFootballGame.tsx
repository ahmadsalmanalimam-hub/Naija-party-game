'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CircleDot } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface Footballer {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  teamSide: 'red' | 'blue';
  goals: number;
}

export default function StreetFootballGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
  isSuddenDeath,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playersRef = useRef<Footballer[]>([]);
  const ballRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, lastTouch: 1 as PlayerId });
  const inputVec = useRef<Record<number, { dx: number; dy: number }>>({});
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, number>>({});

  const activePlayers = config.players.filter((p) => p.active);

  const resetPositions = () => {
    const redSpawns = [
      { x: 0.25, y: 0.38 },
      { x: 0.25, y: 0.62 },
    ];
    const blueSpawns = [
      { x: 0.75, y: 0.38 },
      { x: 0.75, y: 0.62 },
    ];
    let rIdx = 0;
    let bIdx = 0;
    playersRef.current.forEach((f) => {
      const sp = f.teamSide === 'red' ? redSpawns[rIdx++ % 2] : blueSpawns[bIdx++ % 2];
      f.x = sp.x;
      f.y = sp.y;
      f.vx = 0;
      f.vy = 0;
    });
    ballRef.current = { x: 0.5, y: 0.5, vx: 0, vy: 0, lastTouch: activePlayers[0]?.id || 1 };
  };

  useEffect(() => {
    playersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      x: 0.5,
      y: 0.5,
      vx: 0,
      vy: 0,
      teamSide: config.teamScoring ? (p.team === 'blue' ? 'blue' : 'red') : idx % 2 === 0 ? 'red' : 'blue',
      goals: 0,
    }));
    resetPositions();
    finishedRef.current = false;
  }, [config.teamScoring]);

  const kickBall = (id: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const pl = playersRef.current.find((x) => x.id === id);
    if (!pl) return;
    const ball = ballRef.current;
    const dx = ball.x - pl.x;
    const dy = ball.y - pl.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.12 && dist > 0) {
      ball.vx = (dx / dist) * 0.75;
      ball.vy = (dy / dist) * 0.75;
      ball.lastTouch = id;
      soundEngine.playHit();
    } else {
      // Sprint burst
      const dir = inputVec.current[id] || { dx: pl.teamSide === 'red' ? 1 : -1, dy: 0 };
      pl.vx += dir.dx * 0.35;
      pl.vy += dir.dy * 0.35;
    }
  };

  const setDir = (id: PlayerId, dx: number, dy: number) => {
    inputVec.current[id] = { dx, dy };
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'w') setDir(1, 0, -1);
      if (e.key === 's') setDir(1, 0, 1);
      if (e.key === 'a') setDir(1, -1, 0);
      if (e.key === 'd') setDir(1, 1, 0);
      if (e.key === 'q') kickBall(1);
      if (e.key === 'ArrowUp') setDir(2, 0, -1);
      if (e.key === 'ArrowDown') setDir(2, 0, 1);
      if (e.key === 'ArrowLeft') setDir(2, -1, 0);
      if (e.key === 'ArrowRight') setDir(2, 1, 0);
      if (e.key === ' ') kickBall(2);
    };
    const onUp = (e: KeyboardEvent) => {
      if ('wasd'.includes(e.key)) setDir(1, 0, 0);
      if (e.key.startsWith('Arrow')) setDir(2, 0, 0);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTick = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        if (ctx && !isPaused && !finishedRef.current) {
          const ball = ballRef.current;

          playersRef.current.forEach((pl) => {
            const slot = activePlayers.find((p) => p.id === pl.id);
            let mx = 0;
            let my = 0;
            if (slot?.isAI) {
              const targetX = pl.teamSide === 'red' ? ball.x - 0.03 : ball.x + 0.03;
              const dx = targetX - pl.x;
              const dy = ball.y - pl.y;
              const dist = Math.hypot(dx, dy) || 1;
              mx = dx / dist;
              my = dy / dist;
              if (Math.hypot(ball.x - pl.x, ball.y - pl.y) < 0.08) {
                const goalX = pl.teamSide === 'red' ? 0.96 : 0.04;
                const gdx = goalX - ball.x;
                const gdy = 0.5 - ball.y;
                const gd = Math.hypot(gdx, gdy) || 1;
                ball.vx = (gdx / gd) * 0.6;
                ball.vy = (gdy / gd) * 0.6;
                ball.lastTouch = pl.id;
              }
            } else {
              const iv = inputVec.current[pl.id];
              if (iv) {
                mx = iv.dx;
                my = iv.dy;
              }
            }

            pl.vx += mx * 1.45 * dt;
            pl.vy += my * 1.45 * dt;
            pl.vx *= 0.86;
            pl.vy *= 0.86;
            pl.x = Math.max(0.06, Math.min(0.94, pl.x + pl.vx * dt));
            pl.y = Math.max(0.08, Math.min(0.92, pl.y + pl.vy * dt));

            // Dribble collision with ball
            const dx = ball.x - pl.x;
            const dy = ball.y - pl.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < 0.055) {
              const nx = dx / dist;
              const ny = dy / dist;
              ball.x = pl.x + nx * 0.056;
              ball.y = pl.y + ny * 0.056;
              ball.vx = pl.vx * 1.25 + nx * 0.25;
              ball.vy = pl.vy * 1.25 + ny * 0.25;
              ball.lastTouch = pl.id;
            }
          });

          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          ball.vx *= 0.98;
          ball.vy *= 0.98;

          if (ball.y < 0.06) {
            ball.y = 0.06;
            ball.vy = Math.abs(ball.vy);
          } else if (ball.y > 0.94) {
            ball.y = 0.94;
            ball.vy = -Math.abs(ball.vy);
          }

          const inGoalMouth = ball.y > 0.34 && ball.y < 0.66;
          let scoredSide: 'red' | 'blue' | null = null;
          if (ball.x < 0.04) {
            if (inGoalMouth) scoredSide = 'blue';
            else {
              ball.x = 0.04;
              ball.vx = Math.abs(ball.vx);
            }
          } else if (ball.x > 0.96) {
            if (inGoalMouth) scoredSide = 'red';
            else {
              ball.x = 0.96;
              ball.vx = -Math.abs(ball.vx);
            }
          }

          if (scoredSide) {
            soundEngine.playScore();
            const scorer = playersRef.current.find(
              (p) => p.id === ball.lastTouch && p.teamSide === scoredSide
            );
            if (scorer) {
              scorer.goals += 1;
            } else {
              const sidePlayers = playersRef.current.filter((p) => p.teamSide === scoredSide);
              if (sidePlayers[0]) sidePlayers[0].goals += 1;
            }
            resetPositions();

            if (isSuddenDeath) {
              finishedRef.current = true;
              const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
              playersRef.current.forEach((p) => (sMap[p.id] = p.goals));
              onFinish(buildMatchResult(config, sMap, {}, elapsedSeconds, { isSuddenDeath: true }));
            }
          }
        }

        // Draw pitch
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#065F46';
          ctx.fillRect(0, 0, w, h);

          // Pitch stripes
          ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
          for (let i = 0; i < 8; i += 2) {
            ctx.fillRect((i * w) / 8, 0, w / 8, h);
          }

          // Pitch lines
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 3;
          ctx.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88);
          ctx.beginPath();
          ctx.moveTo(w / 2, h * 0.06);
          ctx.lineTo(w / 2, h * 0.94);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2);
          ctx.stroke();

          // Goalposts
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(0, h * 0.34, w * 0.04, h * 0.32);
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(w * 0.96, h * 0.34, w * 0.04, h * 0.32);

          // Players
          const r = Math.max(16, Math.min(w, h) * 0.036);
          playersRef.current.forEach((pl) => {
            const slot = activePlayers.find((p) => p.id === pl.id);
            const pCol = PLAYER_COLORS[slot?.color || 'red'];
            ctx.fillStyle = pCol.hex;
            ctx.strokeStyle = pl.teamSide === 'red' ? '#FEE2E2' : '#DBEAFE';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(pl.x * w, pl.y * h, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${pl.id}`, pl.x * w, pl.y * h + 4);
          });

          // Football
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ballRef.current.x * w, ballRef.current.y * h, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nh: Record<number, number> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        playersRef.current.forEach((p) => {
          nh[p.id] = p.goals;
          su[p.id] = p.goals;
        });
        setHud(nh);
        onScoreUpdate(su);
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
  }, [isPaused, isSuddenDeath]);

  const btnCls = getTouchButtonSize(touchScale);

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {activePlayers.map((p) => {
        const sc = hud[p.id] || 0;
        return (
          <PlayerCornerPanel key={p.id} player={p} score={sc}>
            {!p.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="omni"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[p.color].hex}
                  label="Steer player"
                  onVector={(dx, dy) => setDir(p.id, dx, dy)}
                />
                <button
                  type="button"
                  onPointerDown={() => kickBall(p.id)}
                  className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-black active:scale-95 flex items-center justify-center`}
                  aria-label="Kick"
                >
                  <CircleDot className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">AI Striker</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
