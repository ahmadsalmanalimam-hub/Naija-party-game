'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flame, Utensils } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';

interface Ingredient {
  id: number;
  x: number; // 0..1
  y: number; // 0..1
  vx: number;
  vy: number;
  kind: 'tomato' | 'rice' | 'plantain' | 'pepper' | 'burnt';
  label: string;
  points: number;
}

interface ChefState {
  id: PlayerId;
  score: number;
  combo: number;
  lives: number;
  eliminated: boolean;
  flash: string;
  aiTick: number;
}

const ITEMS: Array<{ kind: Ingredient['kind']; label: string; points: number }> = [
  { kind: 'tomato', label: '🍅 Tomato', points: 25 },
  { kind: 'rice', label: '🍚 Basmati', points: 30 },
  { kind: 'plantain', label: '🍌 Dodo', points: 40 },
  { kind: 'pepper', label: '🌶️ Ata Rodo', points: 50 },
  { kind: 'burnt', label: '🔥 Burnt Pot', points: -45 },
];

export default function JollofMasterGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const itemsRef = useRef<Ingredient[]>([]);
  const chefsRef = useRef<ChefState[]>([]);
  const nextId = useRef(1);
  const spawnTimer = useRef(0);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { score: number; combo: number; lives: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  useEffect(() => {
    chefsRef.current = activePlayers.map((p) => ({
      id: p.id,
      score: 0,
      combo: 1,
      lives: config.livesCount,
      eliminated: false,
      flash: '',
      aiTick: 0.25,
    }));
    itemsRef.current = [];
    finishedRef.current = false;
  }, [config.livesCount]);

  // Each player owns a corner zone in the shared kitchen table:
  // P1: Top-Left (x<0.5, y<0.5), P2: Top-Right (x>=0.5, y<0.5), P3: Bottom-Left (x<0.5, y>=0.5), P4: Bottom-Right (x>=0.5, y>=0.5)
  const isInPlayerZone = (playerId: PlayerId, x: number, y: number) => {
    if (playerId === 1) return x <= 0.55 && y <= 0.55;
    if (playerId === 2) return x >= 0.45 && y <= 0.55;
    if (playerId === 3) return x <= 0.55 && y >= 0.45;
    return x >= 0.45 && y >= 0.45;
  };

  const grabInZone = (playerId: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const chef = chefsRef.current.find((c) => c.id === playerId);
    if (!chef || chef.eliminated) return;

    const candidates = itemsRef.current.filter((it) => isInPlayerZone(playerId, it.x, it.y));
    if (candidates.length === 0) {
      chef.combo = 1;
      soundEngine.playClick();
      return;
    }

    // Prioritize good items if present, else take closest
    const target = candidates.find((c) => c.kind !== 'burnt') || candidates[0];
    itemsRef.current = itemsRef.current.filter((it) => it.id !== target.id);

    if (target.kind === 'burnt') {
      chef.combo = 1;
      chef.score = Math.max(0, chef.score + target.points);
      soundEngine.playHit();
      if (config.ruleMode === 'lives') {
        chef.lives -= 1;
        if (chef.lives <= 0) {
          chef.eliminated = true;
          soundEngine.playEliminate();
        }
      }
    } else {
      chef.score += target.points * chef.combo;
      chef.combo = Math.min(5, chef.combo + 1);
      soundEngine.playScore();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') grabInZone(1);
      if (e.key === 'Enter') grabInZone(2);
      if (e.key === 'j' || e.key === 'J') grabInZone(3);
      if (e.key === 'k' || e.key === 'K') grabInZone(4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
        if (ctx && !isPaused && !finishedRef.current) {
          spawnTimer.current -= dt;
          if (spawnTimer.current <= 0) {
            spawnTimer.current = 0.42;
            const tpl = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.16 + Math.random() * 0.14;
            itemsRef.current.push({
              id: nextId.current++,
              x: 0.5,
              y: 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              kind: tpl.kind,
              label: tpl.label,
              points: tpl.points,
            });
          }

          itemsRef.current.forEach((it) => {
            it.x += it.vx * dt;
            it.y += it.vy * dt;
          });
          itemsRef.current = itemsRef.current.filter(
            (it) => it.x > 0.04 && it.x < 0.96 && it.y > 0.04 && it.y < 0.96
          );

          // AI grabbing
          chefsRef.current.forEach((chef) => {
            if (chef.eliminated) return;
            const slot = activePlayers.find((p) => p.id === chef.id);
            if (!slot?.isAI) return;
            chef.aiTick -= dt;
            if (chef.aiTick <= 0) {
              chef.aiTick = slot.aiDifficulty === 'pro' ? 0.35 : slot.aiDifficulty === 'normal' ? 0.58 : 0.9;
              const goodInZone = itemsRef.current.some(
                (it) => it.kind !== 'burnt' && isInPlayerZone(chef.id, it.x, it.y)
              );
              if (goodInZone) {
                grabInZone(chef.id);
              }
            }
          });

          const alive = chefsRef.current.filter((c) => !c.eliminated);
          if (config.ruleMode === 'lives' && alive.length <= 1 && chefsRef.current.length > 1) {
            finishedRef.current = true;
            const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            const eMap: Partial<Record<PlayerId, boolean>> = {};
            chefsRef.current.forEach((c) => {
              sMap[c.id] = c.score;
              eMap[c.id] = c.eliminated;
            });
            onFinish(buildMatchResult(config, sMap, eMap, elapsedSeconds));
          }
        }

        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Party kitchen table quadrants
          ctx.fillStyle = '#291D16';
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Zone tints for active players
          activePlayers.forEach((p) => {
            const pCol = PLAYER_COLORS[p.color];
            const zx = p.id === 1 || p.id === 3 ? 0 : w / 2;
            const zy = p.id === 1 || p.id === 2 ? 0 : h / 2;
            ctx.fillStyle = `${pCol.hex}18`;
            ctx.fillRect(zx, zy, w / 2, h / 2);
          });

          // Central steaming Jollof pot
          ctx.fillStyle = '#DC2626';
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('JOLLOF POT', w / 2, h / 2 + 4);

          // Flying ingredients
          itemsRef.current.forEach((it) => {
            const ix = it.x * w;
            const iy = it.y * h;
            ctx.fillStyle = it.kind === 'burnt' ? '#18181B' : '#FEF3C7';
            ctx.strokeStyle = it.kind === 'burnt' ? '#EF4444' : '#F59E0B';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(ix - 48, iy - 16, 96, 32, 12);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = it.kind === 'burnt' ? '#FCA5A5' : '#1E293B';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(it.label, ix, iy + 4);
          });
        }
      }

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const nh: Record<number, { score: number; combo: number; lives: number; elim: boolean }> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        const eu: Partial<Record<PlayerId, boolean>> = {};
        chefsRef.current.forEach((c) => {
          nh[c.id] = { score: c.score, combo: c.combo, lives: c.lives, elim: c.eliminated };
          su[c.id] = c.score;
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
        const st = hud[p.id] || { score: 0, combo: 1, lives: config.livesCount, elim: false };
        return (
          <PlayerCornerPanel
            key={p.id}
            player={p}
            score={st.score}
            lives={config.ruleMode === 'lives' ? st.lives : undefined}
            eliminated={st.elim}
          >
            {!p.isAI ? (
              <button
                type="button"
                onPointerDown={() => grabInZone(p.id)}
                className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-extrabold active:scale-95 flex items-center justify-center gap-1.5`}
              >
                <Utensils className="h-4 w-4" />
                <span>CATCH x{st.combo}</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300">
                <Flame className="h-3.5 w-3.5" />
                <span>AI x{st.combo}</span>
              </div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
