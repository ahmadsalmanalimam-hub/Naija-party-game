'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface BoatState {
  id: PlayerId;
  lane: number; // 0..3
  dist: number;
  speed: number;
  boost: number;
  stunTimer: number;
  lives: number;
  eliminated: boolean;
  aiCooldown: number;
}

interface LagoonObj {
  id: number;
  lane: number;
  dist: number;
  kind: 'log' | 'wake';
}

const FINISH_DIST = 1350;

export default function BoatRaceGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const boatsRef = useRef<BoatState[]>([]);
  const objsRef = useRef<LagoonObj[]>([]);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { pct: number; boost: number; lives: number; elim: boolean }>>({});

  useEffect(() => {
    boatsRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      lane: idx % 4,
      dist: 0,
      speed: 120,
      boost: 60,
      stunTimer: 0,
      lives: config.livesCount,
      eliminated: false,
      aiCooldown: 0.25,
    }));

    const items: LagoonObj[] = [];
    let oid = 1;
    for (let d = 140; d < FINISH_DIST - 50; d += 62) {
      items.push({
        id: oid++,
        lane: Math.floor(Math.random() * 4),
        dist: d,
        kind: Math.random() < 0.32 ? 'wake' : 'log',
      });
    }
    objsRef.current = items;
    finishedRef.current = false;
  }, [activePlayers, config.livesCount]);

  const shiftLane = (playerId: PlayerId, delta: -1 | 1) => {
    if (isPaused || finishedRef.current) return;
    const b = boatsRef.current.find((x) => x.id === playerId);
    if (!b || b.eliminated) return;
    const next = Math.max(0, Math.min(3, b.lane + delta));
    if (next !== b.lane) {
      b.lane = next;
      soundEngine.playHop();
    }
  };

  const triggerSurge = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const b = boatsRef.current.find((x) => x.id === playerId);
    if (!b || b.eliminated || b.boost < 30) return;
    b.boost -= 30;
    b.speed = Math.max(b.speed, 220);
    soundEngine.playScore();
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
        boatsRef.current.forEach((b) => {
          if (b.eliminated) return;
          const pDef = activePlayers.find((p) => p.id === b.id);

          if (pDef?.isAI) {
            b.aiCooldown -= dt;
            if (b.aiCooldown <= 0) {
              b.aiCooldown = pDef.aiDifficulty === 'pro' ? 0.16 : 0.34;
              const aheadLog = objsRef.current.find(
                (o) => o.kind === 'log' && o.lane === b.lane && o.dist > b.dist && o.dist - b.dist < 85
              );
              if (aheadLog) {
                const alt = b.lane < 3 ? b.lane + 1 : b.lane - 1;
                b.lane = alt;
              } else if (b.boost >= 65 && Math.random() < 0.25) {
                b.boost -= 30;
                b.speed = 215;
              }
            }
          }

          if (b.stunTimer > 0) {
            b.stunTimer -= dt;
            b.speed = 55;
          } else {
            b.speed = Math.max(125, b.speed - 25 * dt);
            b.boost = Math.min(100, b.boost + 10 * dt);
          }

          b.dist += b.speed * dt;

          // Collisions
          objsRef.current.forEach((o) => {
            if (o.lane === b.lane && Math.abs(o.dist - b.dist) < 16) {
              if (o.kind === 'wake') {
                b.speed = 235;
                b.boost = Math.min(100, b.boost + 25);
                o.dist = -999;
                soundEngine.playScore();
              } else if (b.stunTimer <= 0) {
                b.stunTimer = 0.7;
                o.dist = -999;
                soundEngine.playHit();
                if (config.ruleMode === 'lives') {
                  b.lives -= 1;
                  if (b.lives <= 0) b.eliminated = true;
                }
              }
            }
          });

          if (b.dist >= FINISH_DIST && !finishedRef.current) {
            finishedRef.current = true;
            const scores: Partial<Record<PlayerId, number>> = {};
            const elims: Partial<Record<PlayerId, boolean>> = {};
            boatsRef.current.forEach((x) => {
              scores[x.id] = Math.round(x.dist);
              elims[x.id] = x.eliminated;
            });
            onFinish(buildMatchResult(config, scores, elims, elapsedSeconds));
          }
        });
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;

        // Water background & lane ripples
        ctx.fillStyle = '#0369A1';
        ctx.fillRect(0, 0, w, h);

        const topPad = h * 0.16;
        const laneH = (h * 0.68) / 4;

        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(56,189,248,0.14)' : 'rgba(14,165,233,0.08)';
          ctx.fillRect(0, topPad + i * laneH, w, laneH);
        }

        // Camera centers near leader
        const leaderDist = Math.max(0, ...boatsRef.current.map((b) => b.dist));
        const viewStart = Math.max(0, leaderDist - 220);
        const pxPerUnit = w / 340;

        // Finish Buoy Line
        const finishX = (FINISH_DIST - viewStart) * pxPerUnit;
        if (finishX >= 0 && finishX <= w) {
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(finishX, topPad, 10, laneH * 4);
        }

        // Objects
        objsRef.current.forEach((o) => {
          if (o.dist < viewStart - 30 || o.dist > viewStart + 380) return;
          const ox = (o.dist - viewStart) * pxPerUnit;
          const oy = topPad + (o.lane + 0.5) * laneH;
          if (o.kind === 'wake') {
            ctx.fillStyle = '#22D3EE';
            ctx.beginPath();
            ctx.moveTo(ox + 14, oy);
            ctx.lineTo(ox - 10, oy - 11);
            ctx.lineTo(ox - 4, oy);
            ctx.lineTo(ox - 10, oy + 11);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = '#78350F';
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(ox - 14, oy - 9, 28, 18, 6);
            ctx.fill();
            ctx.stroke();
          }
        });

        // Boats
        boatsRef.current.forEach((b) => {
          const pDef = activePlayers.find((p) => p.id === b.id);
          const col = pDef ? PLAYER_COLORS[pDef.color].hex : '#FACC15';
          const bx = (b.dist - viewStart) * pxPerUnit;
          const by = topPad + (b.lane + 0.5) * laneH;

          ctx.save();
          ctx.translate(bx, by);
          if (b.eliminated) ctx.globalAlpha = 0.35;
          ctx.fillStyle = col;
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-18, -11);
          ctx.lineTo(14, -11);
          ctx.lineTo(26, 0);
          ctx.lineTo(14, 11);
          ctx.lineTo(-18, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nextHud: Record<number, { pct: number; boost: number; lives: number; elim: boolean }> = {};
        const scoreMap: Partial<Record<PlayerId, number>> = {};
        const elimMap: Partial<Record<PlayerId, boolean>> = {};
        boatsRef.current.forEach((b) => {
          nextHud[b.id] = {
            pct: Math.min(100, Math.round((b.dist / FINISH_DIST) * 100)),
            boost: Math.round(b.boost),
            lives: b.lives,
            elim: b.eliminated,
          };
          scoreMap[b.id] = Math.round(b.dist);
          elimMap[b.id] = b.eliminated;
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
        const st = hud[player.id] || { pct: 0, boost: 60, lives: config.livesCount, elim: false };
        return (
          <PlayerCornerPanel
            key={player.id}
            player={player}
            score={st.pct}
            lives={config.ruleMode === 'lives' ? st.lives : undefined}
            eliminated={st.elim}
          >
            <div className="text-[10px] font-bold text-cyan-300 text-center">
              {st.pct}% · Surge {st.boost}%
            </div>
            {!player.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="lane"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[player.color].hex}
                  label="Steer boat"
                  onStep={(delta) => shiftLane(player.id, delta)}
                />
                <button
                  type="button"
                  onPointerDown={() => triggerSurge(player.id)}
                  className={`${btnCls} rounded-xl bg-cyan-400 text-slate-950 font-black flex items-center justify-center`}
                  aria-label="Wave Surge"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-amber-300 text-center">AI Captain</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
