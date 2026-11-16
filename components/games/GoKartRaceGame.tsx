'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface KartState {
  id: PlayerId;
  angle: number; // radians around oval track
  laneOffset: number; // -1 (inner) .. +1 (outer)
  steer: -1 | 0 | 1;
  laps: number;
  progress: number; // total radians
  turbo: number; // 0..100
  boostTimer: number;
}

const TARGET_LAPS = 3;

export default function GoKartRaceGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const kartsRef = useRef<KartState[]>([]);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { laps: number; turbo: number }>>({});

  useEffect(() => {
    kartsRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      angle: -Math.PI / 2 - idx * 0.14,
      laneOffset: (idx % 2 === 0 ? -0.45 : 0.45),
      steer: 0,
      laps: 0,
      progress: 0,
      turbo: 100,
      boostTimer: 0,
    }));
    finishedRef.current = false;
  }, [activePlayers]);

  const setSteer = (playerId: PlayerId, steer: -1 | 0 | 1) => {
    const k = kartsRef.current.find((x) => x.id === playerId);
    if (k) k.steer = steer;
  };

  const triggerTurbo = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const k = kartsRef.current.find((x) => x.id === playerId);
    if (!k || k.turbo < 30 || k.boostTimer > 0) return;
    k.turbo -= 30;
    k.boostTimer = 1.1;
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

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!isPaused && !finishedRef.current) {
        kartsRef.current.forEach((k) => {
          const pDef = activePlayers.find((p) => p.id === k.id);
          if (pDef?.isAI) {
            // AI hugs inner apex (-0.35) and fires turbo when charged
            const targetOffset = -0.3;
            k.steer = k.laneOffset < targetOffset - 0.1 ? 1 : k.laneOffset > targetOffset + 0.1 ? -1 : 0;
            if (k.turbo >= 60 && Math.random() < 0.03) {
              k.turbo -= 30;
              k.boostTimer = 1.0;
            }
          }

          k.laneOffset = Math.max(-0.85, Math.min(0.85, k.laneOffset + k.steer * 1.45 * dt));
          if (k.boostTimer > 0) k.boostTimer = Math.max(0, k.boostTimer - dt);
          else k.turbo = Math.min(100, k.turbo + 11 * dt);

          // Inner lane gives shorter circumference -> faster angular speed; outer gives slight slowdown
          const laneBonus = 1 - k.laneOffset * 0.16;
          const boostMult = k.boostTimer > 0 ? 1.52 : 1;
          const aiBase = pDef?.isAI
            ? pDef.aiDifficulty === 'pro'
              ? 1.05
              : pDef.aiDifficulty === 'normal'
              ? 0.94
              : 0.82
            : 1.0;
          const omega = 0.85 * laneBonus * boostMult * aiBase;

          k.angle += omega * dt;
          k.progress += omega * dt;
          k.laps = Math.floor(k.progress / (Math.PI * 2));

          // Turbo pad at bottom & top straightaways
          const normAngle = ((k.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (
            (Math.abs(normAngle - Math.PI / 2) < 0.14 || Math.abs(normAngle - Math.PI * 1.5) < 0.14) &&
            Math.abs(k.laneOffset) < 0.35 &&
            k.boostTimer <= 0.1
          ) {
            k.boostTimer = 0.65;
          }

          if (config.ruleMode === 'racing' && k.laps >= TARGET_LAPS && !finishedRef.current) {
            finishedRef.current = true;
            const scores: Partial<Record<PlayerId, number>> = {};
            kartsRef.current.forEach((kr) => {
              scores[kr.id] = Math.round(kr.progress * 100);
            });
            onFinish(buildMatchResult(config, scores, {}, elapsedSeconds));
          }
        });
      }

      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const rx = w * 0.36;
        const ry = h * 0.33;
        const trackWidth = Math.min(w, h) * 0.22;

        // Warm sandy beach background with gentle wave bands
        ctx.fillStyle = '#E8D5A7';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(209, 181, 120, 0.45)';
        ctx.lineWidth = Math.max(10, h * 0.045);
        for (let sx = -40; sx < w + 80; sx += 76) {
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.bezierCurveTo(sx + 25, h * 0.33, sx - 25, h * 0.66, sx + 15, h);
          ctx.stroke();
        }

        // Helper for top-down cartoon palm trees
        const drawPalm = (px: number, py: number, scale: number) => {
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(scale, scale);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.arc(3, 4, 15, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.fillStyle = i % 2 === 0 ? '#16A34A' : '#22C55E';
            ctx.beginPath();
            ctx.ellipse(11, 0, 12, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = '#78350F';
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        // Track geometry
        // Outer red/white racing curb
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = trackWidth + 16;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = trackWidth + 16;
        ctx.setLineDash([18, 18]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Packed warm dirt/tan race surface
        ctx.strokeStyle = '#B87A3D';
        ctx.lineWidth = trackWidth;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle inner racing groove
        ctx.strokeStyle = 'rgba(130, 80, 32, 0.35)';
        ctx.lineWidth = trackWidth * 0.55;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner blue/white curb
        const innerRx = Math.max(20, rx - trackWidth * 0.5);
        const innerRy = Math.max(20, ry - trackWidth * 0.5);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 7;
        ctx.setLineDash([14, 14]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Palm trees in infield and beach corners
        drawPalm(cx - rx * 0.28, cy - ry * 0.16, 1.0);
        drawPalm(cx + rx * 0.28, cy + ry * 0.18, 0.9);
        drawPalm(w * 0.24, h * 0.22, 0.85);
        drawPalm(w * 0.76, h * 0.78, 0.85);

        // Turbo Chevron Pads (Top & Bottom)
        [cy - ry, cy + ry].forEach((py) => {
          ctx.fillStyle = '#22D3EE';
          ctx.fillRect(cx - 24, py - 14, 48, 28);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - 24, py - 14, 48, 28);
        });

        // Start/Finish Checkered line (Top straight)
        for (let row = 0; row < 6; row++) {
          ctx.fillStyle = row % 2 === 0 ? '#FFFFFF' : '#1E293B';
          ctx.fillRect(cx - 6, cy - ry - trackWidth / 2 + (row * trackWidth) / 6, 12, trackWidth / 6);
        }

        // Karts
        kartsRef.current.forEach((k) => {
          const pDef = activePlayers.find((p) => p.id === k.id);
          const col = pDef ? PLAYER_COLORS[pDef.color].hex : '#FACC15';
          const offsetPx = k.laneOffset * (trackWidth * 0.38);
          const kx = cx + (rx + offsetPx) * Math.cos(k.angle);
          const ky = cy + (ry + offsetPx) * Math.sin(k.angle);
          const heading = Math.atan2(
            (ry + offsetPx) * Math.cos(k.angle),
            -(rx + offsetPx) * Math.sin(k.angle)
          );

          ctx.save();
          ctx.translate(kx, ky);
          ctx.rotate(heading);
          if (k.boostTimer > 0) {
            ctx.fillStyle = '#F97316';
            ctx.beginPath();
            ctx.moveTo(-16, -5);
            ctx.lineTo(-28, 0);
            ctx.lineTo(-16, 5);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = col;
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-15, -10, 30, 20, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(3, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nextHud: Record<number, { laps: number; turbo: number }> = {};
        const scoreMap: Partial<Record<PlayerId, number>> = {};
        kartsRef.current.forEach((k) => {
          nextHud[k.id] = { laps: Math.min(TARGET_LAPS, k.laps), turbo: Math.round(k.turbo) };
          scoreMap[k.id] = Math.round(k.progress * 100);
        });
        setHud(nextHud);
        onScoreUpdate(scoreMap);
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
        const st = hud[player.id] || { laps: 0, turbo: 100 };
        return (
          <PlayerCornerPanel
            key={player.id}
            player={player}
            score={st.laps}
            scoreLabel={`${st.laps}/${TARGET_LAPS}`}
          >
            {!player.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="steer"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[player.color].hex}
                  label="Steer kart"
                  onSteer={(dir) => setSteer(player.id, dir)}
                />
                <button
                  type="button"
                  onPointerDown={() => triggerTurbo(player.id)}
                  className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-black flex flex-col items-center justify-center leading-none gap-0.5`}
                  aria-label="Turbo"
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-[9px] tabular-nums">{st.turbo}%</span>
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-amber-300 text-center">AI Racing</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
