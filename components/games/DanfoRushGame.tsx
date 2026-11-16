'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface DanfoRacer {
  id: PlayerId;
  lane: number; // 0..3
  distance: number; // 0..1000
  speed: number;
  nitro: number; // 0..100
  boostTimer: number;
  stunTimer: number;
  lives: number;
  eliminated: boolean;
  aiCooldown: number;
}

interface RoadObject {
  id: number;
  lane: number;
  dist: number;
  kind: 'pothole' | 'okada' | 'fuel';
}

const FINISH_DISTANCE = 1400;

export default function DanfoRushGame({
  config,
  isPaused,
  touchScale,
  lowRamMode,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const racersRef = useRef<DanfoRacer[]>([]);
  const objectsRef = useRef<RoadObject[]>([]);
  const nextObjId = useRef(1);
  const finishedRef = useRef(false);
  const [hudState, setHudState] = useState<Record<number, { dist: number; nitro: number; lives: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  // Initialize racers
  useEffect(() => {
    racersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      lane: idx % 4,
      distance: 0,
      speed: 110,
      nitro: 50,
      boostTimer: 0,
      stunTimer: 0,
      lives: config.livesCount,
      eliminated: false,
      aiCooldown: 0.25,
    }));

    const initialObjs: RoadObject[] = [];
    for (let d = 160; d < FINISH_DISTANCE - 60; d += 58) {
      const lane = Math.floor(Math.random() * 4);
      const roll = Math.random();
      initialObjs.push({
        id: nextObjId.current++,
        lane,
        dist: d,
        kind: roll < 0.28 ? 'fuel' : roll < 0.65 ? 'pothole' : 'okada',
      });
    }
    objectsRef.current = initialObjs;
    finishedRef.current = false;
  }, [config.livesCount]);

  const shiftLane = (playerId: PlayerId, delta: -1 | 1) => {
    if (isPaused || finishedRef.current) return;
    const r = racersRef.current.find((x) => x.id === playerId);
    if (!r || r.eliminated) return;
    const nextLane = Math.max(0, Math.min(3, r.lane + delta));
    if (nextLane !== r.lane) {
      r.lane = nextLane;
      soundEngine.playHop();
    }
  };

  const triggerBoost = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const r = racersRef.current.find((x) => x.id === playerId);
    if (!r || r.eliminated || r.nitro < 25 || r.boostTimer > 0) return;
    r.nitro -= 25;
    r.boostTimer = 1.15;
    soundEngine.playScore();
  };

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') shiftLane(1, -1);
      if (e.key === 's' || e.key === 'S') shiftLane(1, 1);
      if (e.key === 'd' || e.key === 'D') triggerBoost(1);
      if (e.key === 'ArrowUp') shiftLane(2, -1);
      if (e.key === 'ArrowDown') shiftLane(2, 1);
      if (e.key === 'ArrowRight') triggerBoost(2);
      if (e.key === 'i' || e.key === 'I') shiftLane(3, -1);
      if (e.key === 'k' || e.key === 'K') shiftLane(3, 1);
      if (e.key === 'l' || e.key === 'L') triggerBoost(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Main 60fps loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudTick = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && !isPaused && !finishedRef.current) {
          // Update racers
          racersRef.current.forEach((r) => {
            if (r.eliminated) return;
            const slot = activePlayers.find((p) => p.id === r.id);

            if (r.stunTimer > 0) {
              r.stunTimer = Math.max(0, r.stunTimer - dt);
            }
            if (r.boostTimer > 0) {
              r.boostTimer = Math.max(0, r.boostTimer - dt);
            }

            // AI logic
            if (slot?.isAI) {
              r.aiCooldown -= dt;
              if (r.aiCooldown <= 0) {
                r.aiCooldown = slot.aiDifficulty === 'pro' ? 0.14 : slot.aiDifficulty === 'normal' ? 0.24 : 0.4;
                const aheadHazard = objectsRef.current.find(
                  (o) => o.lane === r.lane && o.dist > r.distance + 10 && o.dist < r.distance + 95 && o.kind !== 'fuel'
                );
                if (aheadHazard) {
                  const safeLanes = [0, 1, 2, 3].filter(
                    (ln) =>
                      ln !== r.lane &&
                      !objectsRef.current.some(
                        (o) => o.lane === ln && o.dist > r.distance - 10 && o.dist < r.distance + 80 && o.kind !== 'fuel'
                      )
                  );
                  if (safeLanes.length > 0) {
                    const nearest = safeLanes.sort((a, b) => Math.abs(a - r.lane) - Math.abs(b - r.lane))[0];
                    r.lane = nearest > r.lane ? r.lane + 1 : r.lane - 1;
                  }
                } else if (r.nitro >= 50 && Math.random() < 0.35) {
                  r.nitro -= 25;
                  r.boostTimer = 1.1;
                }
              }
            }

            const baseSpeed = r.stunTimer > 0 ? 45 : r.boostTimer > 0 ? 195 : 122;
            r.speed += (baseSpeed - r.speed) * Math.min(1, dt * 6);
            r.distance += r.speed * dt;
            r.nitro = Math.min(100, r.nitro + dt * 7);

            // Check collisions with road objects
            objectsRef.current.forEach((obj) => {
              if (obj.lane === r.lane && Math.abs(obj.dist - r.distance) < 16) {
                obj.dist = -999; // consume
                if (obj.kind === 'fuel') {
                  r.nitro = Math.min(100, r.nitro + 35);
                  r.boostTimer = Math.max(r.boostTimer, 0.55);
                  soundEngine.playScore();
                } else {
                  r.stunTimer = 0.85;
                  r.speed = 35;
                  soundEngine.playHit();
                  if (config.ruleMode === 'lives') {
                    r.lives -= 1;
                    if (r.lives <= 0) {
                      r.eliminated = true;
                      soundEngine.playEliminate();
                    }
                  }
                }
              }
            });
          });

          // Check finish conditions
          const winner = racersRef.current.find((r) => !r.eliminated && r.distance >= FINISH_DISTANCE);
          const alive = racersRef.current.filter((r) => !r.eliminated);

          if (winner || (config.ruleMode === 'lives' && alive.length <= 1 && racersRef.current.length > 1)) {
            finishedRef.current = true;
            const scoreMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            const elimMap: Partial<Record<PlayerId, boolean>> = {};
            racersRef.current.forEach((r) => {
              scoreMap[r.id] = Math.round(r.distance);
              elimMap[r.id] = r.eliminated;
            });
            onFinish(buildMatchResult(config, scoreMap, elimMap, elapsedSeconds));
          }
        }

        // Render
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Bright stadium apron & sand edge
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(0, 0, w, h);

          const roadTop = h * 0.22;
          const roadHeight = h * 0.56;
          const laneH = roadHeight / 4;

          // Top & bottom colorful cartoon spectator bleachers
          const drawBleachers = (by: number, bh: number) => {
            const bw = Math.min(w * 0.44, 340);
            const bx = (w - bw) / 2;
            ctx.fillStyle = '#57423B';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#2DD4BF';
            ctx.fillRect(bx + 8, by + bh * 0.18, bw - 16, bh * 0.28);
            ctx.fillRect(bx + 8, by + bh * 0.56, bw - 16, bh * 0.28);
            const shirtCols = ['#EF4444', '#3B82F6', '#FACC15', '#10B981', '#EC4899', '#F97316'];
            const count = 8;
            for (let row = 0; row < 2; row++) {
              const cy = by + bh * (row === 0 ? 0.32 : 0.7);
              for (let c = 0; c < count; c++) {
                const cx = bx + 22 + (c * (bw - 44)) / (count - 1);
                ctx.fillStyle = shirtCols[(c + row * 3) % shirtCols.length];
                ctx.beginPath();
                ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#7C4B2C';
                ctx.beginPath();
                ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          };
          drawBleachers(4, roadTop - 14);
          drawBleachers(roadTop + roadHeight + 10, h - (roadTop + roadHeight) - 14);

          ctx.fillStyle = '#64748B';
          ctx.fillRect(0, roadTop, w, roadHeight);

          // Crisp white road edges
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, roadTop - 4, w, 4);
          ctx.fillRect(0, roadTop + roadHeight, w, 4);

          // Camera follows leading active racer
          const leadDist = Math.max(...racersRef.current.map((r) => r.distance), 0);
          const camStart = Math.max(0, leadDist - 220);
          const pxPerUnit = w / 340;

          // Bold white lane dividers + lane numbers (1..4)
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 3;
          for (let l = 1; l < 4; l++) {
            const y = roadTop + l * laneH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          for (let l = 0; l < 4; l++) {
            ctx.fillText(String(l + 1), w * 0.19, roadTop + l * laneH + laneH / 2 + 7);
          }

          // Finish line
          const finishX = (FINISH_DISTANCE - camStart) * pxPerUnit;
          if (finishX > -40 && finishX < w + 40) {
            for (let row = 0; row < 10; row++) {
              ctx.fillStyle = row % 2 === 0 ? '#FFFFFF' : '#0F172A';
              ctx.fillRect(finishX, roadTop + (row * roadHeight) / 10, 14, roadHeight / 10);
            }
          }

          // Road Objects
          objectsRef.current.forEach((obj) => {
            const ox = (obj.dist - camStart) * pxPerUnit;
            if (ox < -30 || ox > w + 30) return;
            const oy = roadTop + obj.lane * laneH + laneH / 2;

            if (obj.kind === 'fuel') {
              ctx.fillStyle = '#10B981';
              ctx.beginPath();
              ctx.roundRect(ox - 11, oy - 13, 22, 26, 5);
              ctx.fill();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('⚡', ox, oy + 4);
            } else if (obj.kind === 'pothole') {
              ctx.fillStyle = '#0F172A';
              ctx.beginPath();
              ctx.ellipse(ox, oy, 15, 10, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#F97316';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              // Okada hazard
              ctx.fillStyle = '#DC2626';
              ctx.beginPath();
              ctx.roundRect(ox - 14, oy - 9, 28, 18, 6);
              ctx.fill();
              ctx.fillStyle = '#FDE047';
              ctx.fillRect(ox + 8, oy - 5, 5, 10);
            }
          });

          // Danfo Buses
          racersRef.current.forEach((r) => {
            if (r.eliminated) return;
            const slot = activePlayers.find((p) => p.id === r.id);
            const pCol = PLAYER_COLORS[slot?.color || 'yellow'];
            const rx = (r.distance - camStart) * pxPerUnit;
            const ry = roadTop + r.lane * laneH + laneH / 2;

            // Boost flame
            if (r.boostTimer > 0 && !lowRamMode) {
              ctx.fillStyle = '#F97316';
              ctx.beginPath();
              ctx.moveTo(rx - 22, ry);
              ctx.lineTo(rx - 42 - Math.random() * 10, ry - 8);
              ctx.lineTo(rx - 42 - Math.random() * 10, ry + 8);
              ctx.closePath();
              ctx.fill();
            }

            // Classic yellow Danfo body with player color stripes
            ctx.fillStyle = r.stunTimer > 0 ? '#94A3B8' : '#FACC15';
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(rx - 24, ry - 16, 48, 32, 8);
            ctx.fill();
            ctx.stroke();

            // Player color roof & side stripe
            ctx.fillStyle = pCol.hex;
            ctx.fillRect(rx - 20, ry - 5, 40, 10);
            ctx.fillStyle = '#E0F2FE';
            ctx.fillRect(rx + 10, ry - 12, 10, 24);

            // Label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${r.id}`, rx - 4, ry + 4);
          });
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nextHud: Record<number, { dist: number; nitro: number; lives: number; elim: boolean }> = {};
        const scoreUpdate: Partial<Record<PlayerId, number>> = {};
        const elimUpdate: Partial<Record<PlayerId, boolean>> = {};
        racersRef.current.forEach((r) => {
          nextHud[r.id] = {
            dist: Math.min(100, Math.round((r.distance / FINISH_DISTANCE) * 100)),
            nitro: Math.round(r.nitro),
            lives: r.lives,
            elim: r.eliminated,
          };
          scoreUpdate[r.id] = Math.round(r.distance);
          elimUpdate[r.id] = r.eliminated;
        });
        setHudState(nextHud);
        onScoreUpdate(scoreUpdate, elimUpdate);
      }

      rafId = window.requestAnimationFrame(step);
    };

    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [isPaused, lowRamMode]);

  const btnCls = getTouchButtonSize(touchScale);

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {activePlayers.map((player) => {
        const st = hudState[player.id] || { dist: 0, nitro: 50, lives: config.livesCount, elim: false };
        return (
          <PlayerCornerPanel
            key={player.id}
            player={player}
            score={st.dist}
            lives={config.ruleMode === 'lives' ? st.lives : undefined}
            eliminated={st.elim}
          >
            {!player.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="lane"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[player.color].hex}
                  label="Steer Danfo"
                  onStep={(delta) => shiftLane(player.id, delta)}
                />
                <button
                  type="button"
                  disabled={st.nitro < 25}
                  onPointerDown={() => triggerBoost(player.id)}
                  className={`${btnCls} rounded-xl font-extrabold flex items-center justify-center gap-1 active:scale-95 ${
                    st.nitro >= 25
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>{st.dist}%</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">
                AI Racing · {st.dist}%
              </div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
