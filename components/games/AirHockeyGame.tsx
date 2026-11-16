'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface Paddle {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  score: number;
}

export default function AirHockeyGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
  isSuddenDeath,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paddlesRef = useRef<Paddle[]>([]);
  const puckRef = useRef({ x: 0.5, y: 0.5, vx: 0.28, vy: 0.17, lastTouch: 1 as PlayerId });
  const moveDirRef = useRef<Record<number, number>>({});
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, number>>({});

  const activePlayers = config.players.filter((p) => p.active);
  const isFourGoal = activePlayers.length > 2 && !config.teamScoring;

  useEffect(() => {
    const sides: Array<Paddle['side']> = isFourGoal
      ? ['left', 'right', 'top', 'bottom']
      : activePlayers.map((p, idx) => {
          if (config.teamScoring) return p.team === 'red' ? 'left' : 'right';
          return idx % 2 === 0 ? 'left' : 'right';
        });

    paddlesRef.current = activePlayers.map((p, idx) => {
      const side = sides[idx];
      return {
        id: p.id,
        x: side === 'left' ? 0.14 : side === 'right' ? 0.86 : 0.5,
        y: side === 'top' ? 0.16 : side === 'bottom' ? 0.84 : idx >= 2 ? 0.68 : 0.35,
        vx: 0,
        vy: 0,
        side,
        score: 0,
      };
    });

    puckRef.current = { x: 0.5, y: 0.5, vx: 0.25, vy: 0.18, lastTouch: activePlayers[0]?.id || 1 };
    finishedRef.current = false;
  }, [config.teamScoring, isFourGoal]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'a') moveDirRef.current[1] = -1;
      if (e.key === 's' || e.key === 'd') moveDirRef.current[1] = 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') moveDirRef.current[2] = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') moveDirRef.current[2] = 1;
    };
    const onUp = (e: KeyboardEvent) => {
      if ('wasd'.includes(e.key)) moveDirRef.current[1] = 0;
      if (e.key.startsWith('Arrow')) moveDirRef.current[2] = 0;
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
          const puck = puckRef.current;

          // Move paddles
          paddlesRef.current.forEach((pad) => {
            const slot = activePlayers.find((p) => p.id === pad.id);
            let dir = moveDirRef.current[pad.id] || 0;

            if (slot?.isAI) {
              const target = pad.side === 'left' || pad.side === 'right' ? puck.y : puck.x;
              const current = pad.side === 'left' || pad.side === 'right' ? pad.y : pad.x;
              const diff = target - current;
              const deadzone = slot.aiDifficulty === 'pro' ? 0.02 : 0.05;
              dir = Math.abs(diff) > deadzone ? Math.sign(diff) : 0;
            }

            const speed = 0.65;
            if (pad.side === 'left' || pad.side === 'right') {
              pad.vy = dir * speed;
              pad.y = Math.max(0.16, Math.min(0.84, pad.y + pad.vy * dt));
            } else {
              pad.vx = dir * speed;
              pad.x = Math.max(0.18, Math.min(0.82, pad.x + pad.vx * dt));
            }
          });

          // Move puck
          puck.x += puck.vx * dt;
          puck.y += puck.vy * dt;

          // Puck-paddle collision
          paddlesRef.current.forEach((pad) => {
            const dx = puck.x - pad.x;
            const dy = puck.y - pad.y;
            const dist = Math.hypot(dx, dy);
            const minDist = 0.068;
            if (dist > 0 && dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              puck.x = pad.x + nx * minDist;
              puck.y = pad.y + ny * minDist;
              const dot = puck.vx * nx + puck.vy * ny;
              puck.vx = (puck.vx - 2 * dot * nx) * 1.05 + pad.vx * 0.45;
              puck.vy = (puck.vy - 2 * dot * ny) * 1.05 + pad.vy * 0.45;
              // Clamp max speed
              const mag = Math.hypot(puck.vx, puck.vy);
              if (mag > 0.85) {
                puck.vx = (puck.vx / mag) * 0.85;
                puck.vy = (puck.vy / mag) * 0.85;
              }
              puck.lastTouch = pad.id;
              soundEngine.playHit();
            }
          });

          // Goal zones
          const inVerticalGoal = puck.y > 0.3 && puck.y < 0.7;
          const inHorizGoal = puck.x > 0.32 && puck.x < 0.68;

          let goalFor: 'left' | 'right' | 'top' | 'bottom' | null = null;
          if (puck.x <= 0.04) {
            if (inVerticalGoal) goalFor = 'left';
            else {
              puck.x = 0.04;
              puck.vx = Math.abs(puck.vx);
              soundEngine.playClick();
            }
          } else if (puck.x >= 0.96) {
            if (inVerticalGoal) goalFor = 'right';
            else {
              puck.x = 0.96;
              puck.vx = -Math.abs(puck.vx);
              soundEngine.playClick();
            }
          }

          if (puck.y <= 0.06) {
            if (isFourGoal && inHorizGoal) goalFor = 'top';
            else {
              puck.y = 0.06;
              puck.vy = Math.abs(puck.vy);
              soundEngine.playClick();
            }
          } else if (puck.y >= 0.94) {
            if (isFourGoal && inHorizGoal) goalFor = 'bottom';
            else {
              puck.y = 0.94;
              puck.vy = -Math.abs(puck.vy);
              soundEngine.playClick();
            }
          }

          if (goalFor) {
            soundEngine.playScore();
            if (isFourGoal) {
              // Award point to last toucher if not own goal, else all others
              const scorer = paddlesRef.current.find((p) => p.id === puck.lastTouch && p.side !== goalFor);
              if (scorer) scorer.score += 1;
              else {
                paddlesRef.current.filter((p) => p.side !== goalFor).forEach((p) => (p.score += 1));
              }
            } else {
              const scorers = paddlesRef.current.filter((p) => p.side !== goalFor);
              if (scorers[0]) scorers[0].score += 1;
            }

            // Reset puck
            puck.x = 0.5;
            puck.y = 0.5;
            puck.vx = (Math.random() < 0.5 ? -1 : 1) * 0.28;
            puck.vy = (Math.random() - 0.5) * 0.34;

            if (isSuddenDeath) {
              finishedRef.current = true;
              const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
              paddlesRef.current.forEach((p) => (sMap[p.id] = p.score));
              onFinish(buildMatchResult(config, sMap, {}, elapsedSeconds, { isSuddenDeath: true }));
            }
          }
        }

        // Draw table
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, w, h);

          // Rink markings
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 4;
          ctx.strokeRect(w * 0.03, h * 0.05, w * 0.94, h * 0.9);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(w / 2, h * 0.05);
          ctx.lineTo(w / 2, h * 0.95);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2);
          ctx.stroke();

          // Goals
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(0, h * 0.3, w * 0.03, h * 0.4);
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(w * 0.97, h * 0.3, w * 0.03, h * 0.4);

          if (isFourGoal) {
            ctx.fillStyle = '#10B981';
            ctx.fillRect(w * 0.32, 0, w * 0.36, h * 0.05);
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(w * 0.32, h * 0.95, w * 0.36, h * 0.05);
          }

          // Paddles
          const rad = Math.max(18, Math.min(w, h) * 0.042);
          paddlesRef.current.forEach((pad) => {
            const slot = activePlayers.find((p) => p.id === pad.id);
            const pCol = PLAYER_COLORS[slot?.color || 'red'];
            ctx.fillStyle = pCol.hex;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(pad.x * w, pad.y * h, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });

          // Puck
          ctx.fillStyle = '#FDE047';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(puckRef.current.x * w, puckRef.current.y * h, rad * 0.62, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nh: Record<number, number> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        paddlesRef.current.forEach((p) => {
          nh[p.id] = p.score;
          su[p.id] = p.score;
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

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {activePlayers.map((p) => {
        const sc = hud[p.id] || 0;
        return (
          <PlayerCornerPanel key={p.id} player={p} score={sc}>
            {!p.isAI ? (
              <div className="flex items-center justify-center">
                <SteeringWheel
                  variant="steer"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[p.color].hex}
                  label="Steer striker"
                  onSteer={(dir) => {
                    moveDirRef.current[p.id] = dir;
                  }}
                />
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
