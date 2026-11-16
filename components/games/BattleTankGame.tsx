'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Gauge } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface TankState {
  id: PlayerId;
  x: number; // normalized 0..1
  y: number;
  angle: number;
  turn: -1 | 0 | 1;
  drive: boolean;
  cooldown: number;
  lives: number;
  score: number;
  eliminated: boolean;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: PlayerId;
  bounces: number;
  ttl: number;
}

const SPAWNS = [
  { x: 0.16, y: 0.22, angle: 0.5 },
  { x: 0.84, y: 0.22, angle: Math.PI - 0.5 },
  { x: 0.16, y: 0.78, angle: -0.5 },
  { x: 0.84, y: 0.78, angle: -Math.PI + 0.5 },
];

export default function BattleTankGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const tanksRef = useRef<TankState[]>([]);
  const shellsRef = useRef<Shell[]>([]);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { score: number; lives: number; elim: boolean }>>({});

  useEffect(() => {
    tanksRef.current = activePlayers.map((p, idx) => {
      const sp = SPAWNS[idx % 4];
      return {
        id: p.id,
        x: sp.x,
        y: sp.y,
        angle: sp.angle,
        turn: 0,
        drive: false,
        cooldown: 0,
        lives: config.livesCount,
        score: 0,
        eliminated: false,
      };
    });
    shellsRef.current = [];
    finishedRef.current = false;
  }, [activePlayers, config.livesCount]);

  const setTankControl = (playerId: PlayerId, patch: Partial<Pick<TankState, 'turn' | 'drive'>>) => {
    const t = tanksRef.current.find((x) => x.id === playerId);
    if (t && !t.eliminated) Object.assign(t, patch);
  };

  const fireShell = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const t = tanksRef.current.find((x) => x.id === playerId);
    if (!t || t.eliminated || t.cooldown > 0) return;
    t.cooldown = 0.55;
    soundEngine.playHop();
    shellsRef.current.push({
      x: t.x + Math.cos(t.angle) * 0.04,
      y: t.y + Math.sin(t.angle) * 0.04,
      vx: Math.cos(t.angle) * 0.58,
      vy: Math.sin(t.angle) * 0.58,
      ownerId: t.id,
      bounces: 1,
      ttl: 3.2,
    });
  };

  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    let hudTick = 0;

    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!isPaused && !finishedRef.current) {
        tanksRef.current.forEach((t) => {
          if (t.eliminated) return;
          if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - dt);

          const pDef = activePlayers.find((p) => p.id === t.id);
          if (pDef?.isAI) {
            // Find nearest enemy tank
            const enemies = tanksRef.current.filter((o) => {
              if (o.id === t.id || o.eliminated) return false;
              const oDef = activePlayers.find((p) => p.id === o.id);
              if (config.teamScoring && oDef?.team === pDef.team) return false;
              return true;
            });
            if (enemies.length > 0) {
              const target = enemies[0];
              const desired = Math.atan2(target.y - t.y, target.x - t.x);
              let diff = desired - t.angle;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              t.turn = diff > 0.1 ? 1 : diff < -0.1 ? -1 : 0;
              t.drive = Math.hypot(target.x - t.x, target.y - t.y) > 0.28;
              if (Math.abs(diff) < 0.25 && t.cooldown <= 0) {
                fireShell(t.id);
              }
            }
          }

          t.angle += t.turn * 2.8 * dt;
          if (t.drive) {
            const nx = Math.max(0.08, Math.min(0.92, t.x + Math.cos(t.angle) * 0.22 * dt));
            const ny = Math.max(0.12, Math.min(0.88, t.y + Math.sin(t.angle) * 0.22 * dt));
            // Keep clear of center pillar
            if (Math.hypot(nx - 0.5, ny - 0.5) > 0.11) {
              t.x = nx;
              t.y = ny;
            }
          }
        });

        // Update shells
        const aliveShells: Shell[] = [];
        shellsRef.current.forEach((s) => {
          s.ttl -= dt;
          if (s.ttl <= 0) return;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          // Wall bounce
          if (s.x < 0.05 || s.x > 0.95) {
            if (s.bounces > 0) {
              s.vx *= -1;
              s.x = Math.max(0.05, Math.min(0.95, s.x));
              s.bounces -= 1;
            } else return;
          }
          if (s.y < 0.08 || s.y > 0.92) {
            if (s.bounces > 0) {
              s.vy *= -1;
              s.y = Math.max(0.08, Math.min(0.92, s.y));
              s.bounces -= 1;
            } else return;
          }
          // Center obstacle bounce
          if (Math.hypot(s.x - 0.5, s.y - 0.5) < 0.07) {
            return;
          }

          // Hit detection
          let hit = false;
          tanksRef.current.forEach((t) => {
            if (hit || t.eliminated || t.id === s.ownerId) return;
            const ownerDef = activePlayers.find((p) => p.id === s.ownerId);
            const tDef = activePlayers.find((p) => p.id === t.id);
            if (config.teamScoring && ownerDef?.team === tDef?.team) return;

            if (Math.hypot(t.x - s.x, t.y - s.y) < 0.045) {
              hit = true;
              soundEngine.playHit();
              const shooter = tanksRef.current.find((x) => x.id === s.ownerId);
              if (shooter) shooter.score += 100;
              t.lives -= 1;
              if (t.lives <= 0 && config.ruleMode !== 'points' && config.ruleMode !== 'timed') {
                t.eliminated = true;
              } else if (t.lives <= 0) {
                // Respawn in points/timed mode
                t.lives = config.livesCount;
                const sp = SPAWNS[Math.floor(Math.random() * 4)];
                t.x = sp.x;
                t.y = sp.y;
              }
            }
          });
          if (!hit) aliveShells.push(s);
        });
        shellsRef.current = aliveShells;

        // Elimination victory check
        const aliveTanks = tanksRef.current.filter((t) => !t.eliminated);
        const aliveTeams = new Set(
          aliveTanks.map((t) => activePlayers.find((p) => p.id === t.id)?.team)
        );
        const shouldEnd =
          (config.teamScoring && aliveTeams.size <= 1 && activePlayers.length > 1) ||
          (!config.teamScoring && aliveTanks.length <= 1 && activePlayers.length > 1);

        if (shouldEnd && !finishedRef.current) {
          finishedRef.current = true;
          const scores: Partial<Record<PlayerId, number>> = {};
          const elims: Partial<Record<PlayerId, boolean>> = {};
          tanksRef.current.forEach((t) => {
            scores[t.id] = t.score + (t.eliminated ? 0 : 150);
            elims[t.id] = t.eliminated;
          });
          onFinish(buildMatchResult(config, scores, elims, elapsedSeconds));
        }
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#365314';
        ctx.fillRect(0, 0, w, h);

        // Arena border
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 8;
        ctx.strokeRect(w * 0.04, h * 0.07, w * 0.92, h * 0.86);

        // Center crate
        const cr = Math.min(w, h) * 0.07;
        ctx.fillStyle = '#92400E';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(w / 2 - cr, h / 2 - cr, cr * 2, cr * 2, 10);
        ctx.fill();
        ctx.stroke();

        // Shells
        shellsRef.current.forEach((s) => {
          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Tanks
        tanksRef.current.forEach((t) => {
          if (t.eliminated) return;
          const pDef = activePlayers.find((p) => p.id === t.id);
          const col = pDef ? PLAYER_COLORS[pDef.color].hex : '#EF4444';
          ctx.save();
          ctx.translate(t.x * w, t.y * h);
          ctx.rotate(t.angle);
          // Body
          ctx.fillStyle = col;
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.roundRect(-18, -14, 36, 28, 6);
          ctx.fill();
          ctx.stroke();
          // Barrel
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(4, -4, 22, 8);
          ctx.strokeRect(4, -4, 22, 8);
          // Turret
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nextHud: Record<number, { score: number; lives: number; elim: boolean }> = {};
        const scoreMap: Partial<Record<PlayerId, number>> = {};
        const elimMap: Partial<Record<PlayerId, boolean>> = {};
        tanksRef.current.forEach((t) => {
          nextHud[t.id] = { score: t.score, lives: t.lives, elim: t.eliminated };
          scoreMap[t.id] = t.score;
          elimMap[t.id] = t.eliminated;
        });
        setHud(nextHud);
        onScoreUpdate(scoreMap, elimMap);
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [isPaused]);

  const btnCls = getTouchButtonSize(touchScale);

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {activePlayers.map((player) => {
        const st = hud[player.id] || { score: 0, lives: config.livesCount, elim: false };
        return (
          <PlayerCornerPanel
            key={player.id}
            player={player}
            score={st.score}
            lives={st.lives}
            eliminated={st.elim}
          >
            {!player.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="steer"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[player.color].hex}
                  label="Steer tank"
                  onSteer={(dir) => setTankControl(player.id, { turn: dir })}
                />
                <button
                  type="button"
                  onPointerDown={() => setTankControl(player.id, { drive: true })}
                  onPointerUp={() => setTankControl(player.id, { drive: false })}
                  onPointerLeave={() => setTankControl(player.id, { drive: false })}
                  onPointerCancel={() => setTankControl(player.id, { drive: false })}
                  className={`${btnCls} rounded-xl bg-cyan-400 text-slate-950 font-black flex items-center justify-center active:scale-95`}
                  aria-label="Drive"
                >
                  <Gauge className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => fireShell(player.id)}
                  className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center active:scale-95`}
                  aria-label="Fire"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-amber-300 text-center">AI Tank</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
