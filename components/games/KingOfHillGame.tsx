'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface HillPlayer {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dirX: number;
  dirY: number;
  dashCd: number;
  score: number;
}

export default function KingOfHillGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePlayers = useMemo(() => config.players.filter((p) => p.active), [config.players]);

  const playersRef = useRef<HillPlayer[]>([]);
  const hillRef = useRef({ x: 0.5, y: 0.5, r: 0.14, timer: 11 });
  const [hud, setHud] = useState<Record<number, number>>({});

  useEffect(() => {
    const starts = [
      { x: 0.25, y: 0.3 },
      { x: 0.75, y: 0.3 },
      { x: 0.25, y: 0.7 },
      { x: 0.75, y: 0.7 },
    ];
    playersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      x: starts[idx % 4].x,
      y: starts[idx % 4].y,
      vx: 0,
      vy: 0,
      dirX: 0,
      dirY: 0,
      dashCd: 0,
      score: 0,
    }));
    hillRef.current = { x: 0.5, y: 0.5, r: 0.14, timer: 11 };
  }, [activePlayers]);

  const setDir = (playerId: PlayerId, dx: number, dy: number) => {
    const p = playersRef.current.find((x) => x.id === playerId);
    if (p) {
      p.dirX = dx;
      p.dirY = dy;
    }
  };

  const dash = (playerId: PlayerId) => {
    if (isPaused) return;
    const p = playersRef.current.find((x) => x.id === playerId);
    if (!p || p.dashCd > 0) return;
    p.dashCd = 1.4;
    const ang = p.dirX !== 0 || p.dirY !== 0 ? Math.atan2(p.dirY, p.dirX) : Math.atan2(hillRef.current.y - p.y, hillRef.current.x - p.x);
    p.vx += Math.cos(ang) * 0.75;
    p.vy += Math.sin(ang) * 0.75;
    soundEngine.playHop();
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

      if (!isPaused) {
        const hill = hillRef.current;
        hill.timer -= dt;
        if (hill.timer <= 0) {
          hill.timer = 11;
          hill.x = 0.28 + Math.random() * 0.44;
          hill.y = 0.28 + Math.random() * 0.44;
          soundEngine.playClick();
        }

        playersRef.current.forEach((p) => {
          if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);
          const pDef = activePlayers.find((a) => a.id === p.id);

          if (pDef?.isAI) {
            const dx = hill.x - p.x;
            const dy = hill.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d > 0.05) {
              p.dirX = dx / d;
              p.dirY = dy / d;
            } else {
              p.dirX = 0;
              p.dirY = 0;
            }
            if (d > 0.2 && p.dashCd <= 0 && Math.random() < 0.04) dash(p.id);
          }

          p.vx = p.vx * 0.88 + p.dirX * 0.035;
          p.vy = p.vy * 0.88 + p.dirY * 0.035;
          p.x = Math.max(0.08, Math.min(0.92, p.x + p.vx * dt));
          p.y = Math.max(0.12, Math.min(0.88, p.y + p.vy * dt));

          if (Math.hypot(p.x - hill.x, p.y - hill.y) <= hill.r) {
            p.score += 22 * dt;
          }
        });

        // Player-to-player bump physics
        for (let i = 0; i < playersRef.current.length; i++) {
          for (let j = i + 1; j < playersRef.current.length; j++) {
            const a = playersRef.current[i];
            const b = playersRef.current[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < 0.065) {
              const nx = dx / dist;
              const ny = dy / dist;
              const push = 0.45;
              a.vx -= nx * push;
              a.vy -= ny * push;
              b.vx += nx * push;
              b.vy += ny * push;
              soundEngine.playHit();
            }
          }
        }
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const minDim = Math.min(w, h);

        ctx.fillStyle = '#312E81';
        ctx.fillRect(0, 0, w, h);

        // Hill zone
        const hill = hillRef.current;
        const hx = hill.x * w;
        const hy = hill.y * h;
        const hr = hill.r * minDim;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crown icon in center of hill
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CROWN', hx, hy + 6);

        // Players
        playersRef.current.forEach((p) => {
          const pDef = activePlayers.find((a) => a.id === p.id);
          const col = pDef ? PLAYER_COLORS[pDef.color].hex : '#FFFFFF';
          const px = p.x * w;
          const py = p.y * h;
          ctx.fillStyle = col;
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px, py, minDim * 0.036, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      hudTick += dt;
      if (hudTick >= 0.14) {
        hudTick = 0;
        const nextHud: Record<number, number> = {};
        const scoreMap: Partial<Record<PlayerId, number>> = {};
        playersRef.current.forEach((p) => {
          const s = Math.round(p.score);
          nextHud[p.id] = s;
          scoreMap[p.id] = s;
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

      {activePlayers.map((player) => (
        <PlayerCornerPanel key={player.id} player={player} score={hud[player.id] || 0}>
          {!player.isAI ? (
            <div className="flex items-center gap-1.5">
              <SteeringWheel
                variant="omni"
                touchScale={touchScale}
                accentHex={PLAYER_COLORS[player.color].hex}
                label="Steer climber"
                onVector={(dx, dy) => setDir(player.id, dx, dy)}
              />
              <button
                type="button"
                onPointerDown={() => dash(player.id)}
                className={`${btnCls} rounded-xl bg-yellow-400 text-slate-950 font-black active:scale-95 flex items-center justify-center`}
                aria-label="Dash"
              >
                <Zap className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-bold text-amber-300 text-center">AI Climber</div>
          )}
        </PlayerCornerPanel>
      ))}
    </div>
  );
}
