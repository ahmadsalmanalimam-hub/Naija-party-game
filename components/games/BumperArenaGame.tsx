'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface BumperCar {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  boostCd: number;
  lives: number;
  score: number;
  eliminated: boolean;
}

export default function BumperArenaGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const carsRef = useRef<BumperCar[]>([]);
  const steerRef = useRef<Record<number, number>>({}); // -1 left, 0 none, 1 right
  const arenaRadiusRatio = useRef(0.42);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { score: number; lives: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  useEffect(() => {
    const spawns = [
      { x: 0.36, y: 0.36, a: 0.6 },
      { x: 0.64, y: 0.36, a: 2.5 },
      { x: 0.36, y: 0.64, a: -0.6 },
      { x: 0.64, y: 0.64, a: -2.5 },
    ];
    carsRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      x: spawns[idx % 4].x,
      y: spawns[idx % 4].y,
      vx: 0,
      vy: 0,
      angle: spawns[idx % 4].a,
      boostCd: 0,
      lives: config.ruleMode === 'lives' ? config.livesCount : 1,
      score: 0,
      eliminated: false,
    }));
    arenaRadiusRatio.current = 0.43;
    finishedRef.current = false;
  }, [config.livesCount, config.ruleMode]);

  const ramCar = (id: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const c = carsRef.current.find((x) => x.id === id);
    if (!c || c.eliminated || c.boostCd > 0) return;
    c.vx += Math.cos(c.angle) * 0.46;
    c.vy += Math.sin(c.angle) * 0.46;
    c.boostCd = 1.2;
    soundEngine.playHop();
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'a') steerRef.current[1] = -1;
      if (e.key === 'd') steerRef.current[1] = 1;
      if (e.key === 'w') ramCar(1);
      if (e.key === 'ArrowLeft') steerRef.current[2] = -1;
      if (e.key === 'ArrowRight') steerRef.current[2] = 1;
      if (e.key === 'ArrowUp') ramCar(2);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'd') steerRef.current[1] = 0;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') steerRef.current[2] = 0;
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
        const minDim = Math.min(w, h);
        const cx = w / 2;
        const cy = h / 2;

        if (ctx && !isPaused && !finishedRef.current) {
          arenaRadiusRatio.current = Math.max(0.24, arenaRadiusRatio.current - dt * 0.004);

          // Update cars
          carsRef.current.forEach((c) => {
            if (c.eliminated) return;
            const slot = activePlayers.find((p) => p.id === c.id);
            c.boostCd = Math.max(0, c.boostCd - dt);

            if (slot?.isAI) {
              // Steer toward center if near edge, else toward nearest rival
              const dxCenter = 0.5 - c.x;
              const dyCenter = 0.5 - c.y;
              const distCenter = Math.hypot(dxCenter, dyCenter);
              let targetAngle = Math.atan2(dyCenter, dxCenter);
              if (distCenter < arenaRadiusRatio.current * 0.65) {
                const rivals = carsRef.current.filter((o) => o.id !== c.id && !o.eliminated && (!config.teamScoring || activePlayers.find((ap) => ap.id === o.id)?.team !== slot.team));
                if (rivals.length > 0) {
                  const target = rivals[0];
                  targetAngle = Math.atan2(target.y - c.y, target.x - c.x);
                  if (c.boostCd <= 0 && Math.hypot(target.x - c.x, target.y - c.y) < 0.25) {
                    ramCar(c.id);
                  }
                }
              }
              let diff = targetAngle - c.angle;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              c.angle += Math.sign(diff) * Math.min(Math.abs(diff), dt * 3.4);
            } else {
              const turn = steerRef.current[c.id] || 0;
              c.angle += turn * dt * 3.8;
            }

            c.vx += Math.cos(c.angle) * 0.34 * dt;
            c.vy += Math.sin(c.angle) * 0.34 * dt;
            c.vx *= 0.96;
            c.vy *= 0.96;

            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.score += dt * 10;
          });

          // Elastic car-to-car collisions
          for (let i = 0; i < carsRef.current.length; i++) {
            for (let j = i + 1; j < carsRef.current.length; j++) {
              const a = carsRef.current[i];
              const b = carsRef.current[j];
              if (a.eliminated || b.eliminated) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              const minDist = 0.075;
              if (dist > 0 && dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minDist - dist) / 2;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;

                const dvx = a.vx - b.vx;
                const dvy = a.vy - b.vy;
                const impact = dvx * nx + dvy * ny;
                if (impact > 0) {
                  const impulse = impact * 1.45 + 0.14;
                  a.vx -= nx * impulse;
                  a.vy -= ny * impulse;
                  b.vx += nx * impulse;
                  b.vy += ny * impulse;
                  a.score += 15;
                  b.score += 15;
                  soundEngine.playHit();
                }
              }
            }
          }

          // Ring-out check
          carsRef.current.forEach((c) => {
            if (c.eliminated) return;
            const px = c.x * w;
            const py = c.y * h;
            const distPx = Math.hypot(px - cx, py - cy);
            const ringPx = arenaRadiusRatio.current * minDim;
            if (distPx > ringPx) {
              c.lives -= 1;
              soundEngine.playEliminate();
              if (c.lives <= 0) {
                c.eliminated = true;
              } else {
                c.x = 0.5;
                c.y = 0.5;
                c.vx = 0;
                c.vy = 0;
              }
            }
          });

          // End check (single or team elimination)
          const alive = carsRef.current.filter((c) => !c.eliminated);
          let endNow = false;
          if (config.teamScoring) {
            const redAlive = alive.some((c) => activePlayers.find((p) => p.id === c.id)?.team === 'red');
            const blueAlive = alive.some((c) => activePlayers.find((p) => p.id === c.id)?.team === 'blue');
            if (!redAlive || !blueAlive) endNow = true;
          } else if (carsRef.current.length > 1 && alive.length <= 1) {
            endNow = true;
          } else if (carsRef.current.length === 1 && alive.length === 0) {
            endNow = true;
          }

          if (endNow) {
            finishedRef.current = true;
            const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            const eMap: Partial<Record<PlayerId, boolean>> = {};
            carsRef.current.forEach((c) => {
              sMap[c.id] = Math.round(c.score + (c.eliminated ? 0 : 200));
              eMap[c.id] = c.eliminated;
            });
            onFinish(buildMatchResult(config, sMap, eMap, elapsedSeconds));
          }
        }

        // Draw arena
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, w, h);

          // Lagoon water around rooftop
          ctx.fillStyle = '#0369A1';
          ctx.fillRect(0, 0, w, h);

          const ringPx = arenaRadiusRatio.current * minDim;
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(cx, cy, ringPx, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, ringPx * 0.55, 0, Math.PI * 2);
          ctx.stroke();

          // Cars
          carsRef.current.forEach((c) => {
            if (c.eliminated) return;
            const slot = activePlayers.find((p) => p.id === c.id);
            const pCol = PLAYER_COLORS[slot?.color || 'red'];
            const px = c.x * w;
            const py = c.y * h;
            const r = Math.max(18, minDim * 0.042);

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(c.angle);

            // Bumper ring
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = pCol.hex;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Front visor
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(r * 0.25, -r * 0.45, r * 0.55, r * 0.9);
            ctx.restore();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${c.id}`, px, py - r - 8);
          });
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nh: Record<number, { score: number; lives: number; elim: boolean }> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        const eu: Partial<Record<PlayerId, boolean>> = {};
        carsRef.current.forEach((c) => {
          nh[c.id] = { score: Math.round(c.score), lives: c.lives, elim: c.eliminated };
          su[c.id] = Math.round(c.score);
          eu[c.id] = c.eliminated;
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

  const btnCls = getTouchButtonSize(touchScale);

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
            lives={config.ruleMode === 'lives' ? st.lives : undefined}
            eliminated={st.elim}
          >
            {!p.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="steer"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[p.color].hex}
                  label="Steer bumper car"
                  onSteer={(dir) => {
                    steerRef.current[p.id] = dir;
                  }}
                />
                <button
                  type="button"
                  onPointerDown={() => ramCar(p.id)}
                  className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-extrabold active:scale-95 flex items-center justify-center`}
                  aria-label="Ram"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">AI Bumper</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
