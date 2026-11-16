'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';

interface SumoWrestler {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  charging: boolean;
  power: number;
  eliminated: boolean;
  roundWins: number;
  aiWait: number;
}

export default function SumoBattleGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrestlersRef = useRef<SumoWrestler[]>([]);
  const finishedRef = useRef(false);
  const [roundBanner, setRoundBanner] = useState(
    () => `Round 1 · Best of ${config.roundsTarget}`
  );
  const [hud, setHud] = useState<Record<number, { wins: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  const setupRound = (keepWins: boolean) => {
    const spots = [
      { x: 0.41, y: 0.41, a: 0.8 },
      { x: 0.59, y: 0.41, a: 2.3 },
      { x: 0.41, y: 0.59, a: -0.8 },
      { x: 0.59, y: 0.59, a: -2.3 },
    ];
    const prev = new Map(wrestlersRef.current.map((w) => [w.id, w.roundWins]));
    wrestlersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      x: spots[idx % 4].x,
      y: spots[idx % 4].y,
      vx: 0,
      vy: 0,
      angle: spots[idx % 4].a,
      charging: false,
      power: 0,
      eliminated: false,
      roundWins: keepWins ? prev.get(p.id) ?? 0 : 0,
      aiWait: 0.6,
    }));
  };

  useEffect(() => {
    setupRound(false);
    finishedRef.current = false;
  }, []);

  const startCharge = (id: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const w = wrestlersRef.current.find((x) => x.id === id);
    if (!w || w.eliminated) return;
    w.charging = true;
  };

  const releaseCharge = (id: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const w = wrestlersRef.current.find((x) => x.id === id);
    if (!w || w.eliminated || !w.charging) return;
    w.charging = false;
    const force = 0.25 + w.power * 0.55;
    w.vx += Math.cos(w.angle) * force;
    w.vy += Math.sin(w.angle) * force;
    w.power = 0;
    soundEngine.playHop();
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === ' ') startCharge(1);
      if (e.key === 'Enter') startCharge(2);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === ' ') releaseCharge(1);
      if (e.key === 'Enter') releaseCharge(2);
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
    let roundCount = 1;
    let hudTick = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const cw = canvas.width;
        const ch = canvas.height;
        const minDim = Math.min(cw, ch);
        const cx = cw / 2;
        const cy = ch / 2;
        const ringR = minDim * 0.37;

        if (ctx && !isPaused && !finishedRef.current) {
          wrestlersRef.current.forEach((w) => {
            if (w.eliminated) return;
            const slot = activePlayers.find((p) => p.id === w.id);

            if (!w.charging) {
              w.angle += dt * 3.1;
            } else {
              w.power = Math.min(1, w.power + dt * 1.4);
            }

            // AI behavior
            if (slot?.isAI) {
              w.aiWait -= dt;
              const rivals = wrestlersRef.current.filter((o) => o.id !== w.id && !o.eliminated);
              if (rivals.length > 0 && w.aiWait <= 0) {
                const target = rivals[0];
                const angToRival = Math.atan2(target.y - w.y, target.x - w.x);
                let diff = Math.abs((angToRival - w.angle) % (Math.PI * 2));
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < 0.35 && !w.charging) {
                  w.charging = true;
                } else if (w.charging && w.power > 0.45) {
                  releaseCharge(w.id);
                  w.aiWait = slot.aiDifficulty === 'pro' ? 0.35 : 0.7;
                }
              }
            }

            w.vx *= 0.94;
            w.vy *= 0.94;
            w.x += w.vx * dt;
            w.y += w.vy * dt;

            // Check ring-out
            const px = w.x * cw;
            const py = w.y * ch;
            if (Math.hypot(px - cx, py - cy) > ringR) {
              w.eliminated = true;
              soundEngine.playEliminate();
            }
          });

          // Collisions
          for (let i = 0; i < wrestlersRef.current.length; i++) {
            for (let j = i + 1; j < wrestlersRef.current.length; j++) {
              const a = wrestlersRef.current[i];
              const b = wrestlersRef.current[j];
              if (a.eliminated || b.eliminated) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              const minD = 0.085;
              if (dist > 0 && dist < minD) {
                const nx = dx / dist;
                const ny = dy / dist;
                const push = 0.25 + Math.hypot(a.vx - b.vx, a.vy - b.vy) * 0.9;
                a.vx -= nx * push;
                a.vy -= ny * push;
                b.vx += nx * push;
                b.vy += ny * push;
                soundEngine.playHit();
              }
            }
          }

          const alive = wrestlersRef.current.filter((w) => !w.eliminated);
          let endRound = false;
          if (config.teamScoring) {
            const rA = alive.some((w) => activePlayers.find((p) => p.id === w.id)?.team === 'red');
            const bA = alive.some((w) => activePlayers.find((p) => p.id === w.id)?.team === 'blue');
            if (!rA || !bA) endRound = true;
          } else if (wrestlersRef.current.length > 1 && alive.length <= 1) {
            endRound = true;
          } else if (wrestlersRef.current.length === 1 && alive.length === 0) {
            endRound = true;
          }

          if (endRound) {
            alive.forEach((w) => {
              w.roundWins += 1;
            });
            const needed = config.ruleMode === 'rounds' ? Math.ceil(config.roundsTarget / 2) : 1;
            const champion = wrestlersRef.current.find((w) => w.roundWins >= needed);
            if (!champion && config.ruleMode === 'rounds') {
              roundCount += 1;
              setupRound(true);
              setRoundBanner(`Round ${roundCount} · Best of ${config.roundsTarget}`);
            } else {
              finishedRef.current = true;
              const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
              const eMap: Partial<Record<PlayerId, boolean>> = {};
              wrestlersRef.current.forEach((w) => {
                sMap[w.id] = w.roundWins * 100 + (w.eliminated ? 0 : 25);
                eMap[w.id] = w.eliminated;
              });
              onFinish(buildMatchResult(config, sMap, eMap, elapsedSeconds));
            }
          }
        }

        if (ctx) {
          ctx.clearRect(0, 0, cw, ch);
          ctx.fillStyle = '#1E1B18';
          ctx.fillRect(0, 0, cw, ch);

          // Dohyo mat
          ctx.fillStyle = '#FDE68A';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR * 0.55, 0, Math.PI * 2);
          ctx.stroke();

          // Wrestlers
          wrestlersRef.current.forEach((w) => {
            if (w.eliminated) return;
            const slot = activePlayers.find((p) => p.id === w.id);
            const pCol = PLAYER_COLORS[slot?.color || 'red'];
            const px = w.x * cw;
            const py = w.y * ch;
            const r = Math.max(20, minDim * 0.048);

            // Aim arrow
            ctx.strokeStyle = w.charging ? '#EF4444' : '#0F172A';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(
              px + Math.cos(w.angle) * (r + 14 + w.power * 24),
              py + Math.sin(w.angle) * (r + 14 + w.power * 24)
            );
            ctx.stroke();

            ctx.fillStyle = pCol.hex;
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${w.id}`, px, py + 4);
          });
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nh: Record<number, { wins: number; elim: boolean }> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        const eu: Partial<Record<PlayerId, boolean>> = {};
        wrestlersRef.current.forEach((w) => {
          nh[w.id] = { wins: w.roundWins, elim: w.eliminated };
          su[w.id] = w.roundWins * 100;
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

  const btnCls = getTouchButtonSize(touchScale);

  return (
    <div className="relative h-full w-full overflow-hidden touch-game-surface">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-slate-900/80 px-4 py-1 text-xs font-extrabold text-amber-300 pointer-events-none">
        {roundBanner}
      </div>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {activePlayers.map((p) => {
        const st = hud[p.id] || { wins: 0, elim: false };
        return (
          <PlayerCornerPanel key={p.id} player={p} score={st.wins} eliminated={st.elim}>
            {!p.isAI ? (
              <button
                type="button"
                onPointerDown={() => startCharge(p.id)}
                onPointerUp={() => releaseCharge(p.id)}
                onPointerCancel={() => releaseCharge(p.id)}
                className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-extrabold active:scale-95 flex items-center justify-center gap-1`}
              >
                <Flame className="h-4 w-4" />
                <span>HOLD & SLAM</span>
              </button>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">AI Sumo</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
