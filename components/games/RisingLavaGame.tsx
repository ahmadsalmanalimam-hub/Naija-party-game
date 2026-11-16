'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import { MiniGameProps, PlayerId } from '@/lib/naija/types';
import { getTouchButtonSize, PlayerCornerPanel } from './shared/CornerControls';
import { SteeringWheel } from './shared/SteeringWheel';

interface LavaPlayer {
  id: PlayerId;
  x: number; // 0..6
  y: number; // 0..6
  vx: number;
  vy: number;
  dashCd: number;
  eliminated: boolean;
  score: number;
  roundWins: number;
}

interface FloorTile {
  row: number;
  col: number;
  state: 'solid' | 'warning' | 'lava';
  timer: number;
}

const GRID = 6;

export default function RisingLavaGame({
  config,
  isPaused,
  touchScale,
  onScoreUpdate,
  onFinish,
  elapsedSeconds,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playersRef = useRef<LavaPlayer[]>([]);
  const tilesRef = useRef<FloorTile[]>([]);
  const inputVec = useRef<Record<number, { dx: number; dy: number }>>({});
  const collapseTick = useRef(0);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState<Record<number, { score: number; elim: boolean }>>({});

  const activePlayers = config.players.filter((p) => p.active);

  const resetBoard = (keepScores = false) => {
    const spawns = [
      { x: 1.5, y: 1.5 },
      { x: 4.5, y: 1.5 },
      { x: 1.5, y: 4.5 },
      { x: 4.5, y: 4.5 },
    ];
    const prevMap = new Map(playersRef.current.map((p) => [p.id, p]));
    playersRef.current = activePlayers.map((p, idx) => ({
      id: p.id,
      x: spawns[idx % 4].x,
      y: spawns[idx % 4].y,
      vx: 0,
      vy: 0,
      dashCd: 0,
      eliminated: false,
      score: keepScores ? prevMap.get(p.id)?.score ?? 0 : 0,
      roundWins: keepScores ? prevMap.get(p.id)?.roundWins ?? 0 : 0,
    }));

    const tiles: FloorTile[] = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        tiles.push({ row: r, col: c, state: 'solid', timer: 0 });
      }
    }
    tilesRef.current = tiles;
    collapseTick.current = 1.4;
  };

  useEffect(() => {
    resetBoard(false);
    finishedRef.current = false;
  }, []);

  const dashPlayer = (id: PlayerId) => {
    if (isPaused || finishedRef.current) return;
    const pl = playersRef.current.find((x) => x.id === id);
    if (!pl || pl.eliminated || pl.dashCd > 0) return;
    const v = inputVec.current[id] || { dx: 0, dy: -1 };
    const mag = Math.hypot(v.dx, v.dy) || 1;
    const dirX = mag > 0 ? v.dx / mag : 0;
    const dirY = mag > 0 ? v.dy / mag : -1;
    pl.vx += dirX * 5.2;
    pl.vy += dirY * 5.2;
    pl.dashCd = 1.1;
    soundEngine.playHop();
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
      if (e.key === 'q') dashPlayer(1);
      if (e.key === 'ArrowUp') setDir(2, 0, -1);
      if (e.key === 'ArrowDown') setDir(2, 0, 1);
      if (e.key === 'ArrowLeft') setDir(2, -1, 0);
      if (e.key === 'ArrowRight') setDir(2, 1, 0);
      if (e.key === ' ') dashPlayer(2);
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
    let hudTimer = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const boardSize = Math.min(w * 0.72, h * 0.82);
        const startX = (w - boardSize) / 2;
        const startY = (h - boardSize) / 2;
        const cell = boardSize / GRID;

        if (ctx && !isPaused && !finishedRef.current) {
          // Tile crumbling logic
          collapseTick.current -= dt;
          if (collapseTick.current <= 0) {
            collapseTick.current = 0.85;
            const solid = tilesRef.current.filter((t) => t.state === 'solid');
            if (solid.length > 2) {
              const pick = solid[Math.floor(Math.random() * solid.length)];
              pick.state = 'warning';
              pick.timer = 1.6;
            }
          }

          tilesRef.current.forEach((t) => {
            if (t.state === 'warning') {
              t.timer -= dt;
              if (t.timer <= 0) {
                t.state = 'lava';
                soundEngine.playWarning();
              }
            }
          });

          // Players movement & AI
          playersRef.current.forEach((pl) => {
            if (pl.eliminated) return;
            const slot = activePlayers.find((p) => p.id === pl.id);
            pl.dashCd = Math.max(0, pl.dashCd - dt);

            let mx = 0;
            let my = 0;
            if (slot?.isAI) {
              const currentTile = tilesRef.current.find(
                (t) => t.col === Math.floor(pl.x) && t.row === Math.floor(pl.y)
              );
              const safeTiles = tilesRef.current.filter((t) => t.state === 'solid');
              if (currentTile?.state !== 'solid' && safeTiles.length > 0) {
                safeTiles.sort(
                  (a, b) =>
                    Math.hypot(a.col + 0.5 - pl.x, a.row + 0.5 - pl.y) -
                    Math.hypot(b.col + 0.5 - pl.x, b.row + 0.5 - pl.y)
                );
                const target = safeTiles[0];
                const dx = target.col + 0.5 - pl.x;
                const dy = target.row + 0.5 - pl.y;
                const dist = Math.hypot(dx, dy) || 1;
                mx = dx / dist;
                my = dy / dist;
              } else {
                const dx = 3 - pl.x;
                const dy = 3 - pl.y;
                if (Math.hypot(dx, dy) > 1.2) {
                  mx = dx * 0.4;
                  my = dy * 0.4;
                }
              }
            } else {
              const iv = inputVec.current[pl.id];
              if (iv) {
                mx = iv.dx;
                my = iv.dy;
              }
            }

            pl.vx += mx * 9 * dt;
            pl.vy += my * 9 * dt;
            pl.vx *= 0.85;
            pl.vy *= 0.85;
            pl.x = Math.max(0.25, Math.min(GRID - 0.25, pl.x + pl.vx * dt));
            pl.y = Math.max(0.25, Math.min(GRID - 0.25, pl.y + pl.vy * dt));
            pl.score += dt * 15;

            const tile = tilesRef.current.find(
              (t) => t.col === Math.floor(pl.x) && t.row === Math.floor(pl.y)
            );
            if (!tile || tile.state === 'lava') {
              pl.eliminated = true;
              soundEngine.playEliminate();
            }
          });

          // Player collisions (shove)
          for (let i = 0; i < playersRef.current.length; i++) {
            for (let j = i + 1; j < playersRef.current.length; j++) {
              const a = playersRef.current[i];
              const b = playersRef.current[j];
              if (a.eliminated || b.eliminated) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 0 && dist < 0.52) {
                const nx = dx / dist;
                const ny = dy / dist;
                a.vx -= nx * 2.4;
                a.vy -= ny * 2.4;
                b.vx += nx * 2.4;
                b.vy += ny * 2.4;
                soundEngine.playHit();
              }
            }
          }

          // Check survivors
          const alive = playersRef.current.filter((p) => !p.eliminated);
          let roundOver = false;
          if (config.teamScoring) {
            const redAlive = alive.some((p) => activePlayers.find((ap) => ap.id === p.id)?.team === 'red');
            const blueAlive = alive.some((p) => activePlayers.find((ap) => ap.id === p.id)?.team === 'blue');
            if (!redAlive || !blueAlive) roundOver = true;
          } else if (playersRef.current.length > 1 && alive.length <= 1) {
            roundOver = true;
          } else if (playersRef.current.length === 1 && alive.length === 0) {
            roundOver = true;
          }

          if (roundOver) {
            alive.forEach((p) => {
              p.score += 150;
              p.roundWins += 1;
            });

            if (config.ruleMode === 'rounds') {
              const needed = Math.ceil(config.roundsTarget / 2);
              const champ = playersRef.current.find((p) => p.roundWins >= needed);
              if (!champ) {
                resetBoard(true);
                return;
              }
            }

            finishedRef.current = true;
            const sMap: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
            const eMap: Partial<Record<PlayerId, boolean>> = {};
            playersRef.current.forEach((p) => {
              sMap[p.id] = Math.round(p.score);
              eMap[p.id] = p.eliminated;
            });
            onFinish(buildMatchResult(config, sMap, eMap, elapsedSeconds));
          }
        }

        // Draw
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          // Molten lava sea
          ctx.fillStyle = '#7C2D12';
          ctx.fillRect(0, 0, w, h);

          tilesRef.current.forEach((t) => {
            const tx = startX + t.col * cell;
            const ty = startY + t.row * cell;
            if (t.state === 'lava') {
              ctx.fillStyle = '#EA580C';
              ctx.fillRect(tx + 2, ty + 2, cell - 4, cell - 4);
              return;
            }
            ctx.fillStyle = t.state === 'warning' ? '#F59E0B' : '#10B981';
            ctx.strokeStyle = '#064E3B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(tx + 3, ty + 3, cell - 6, cell - 6, 8);
            ctx.fill();
            ctx.stroke();
          });

          playersRef.current.forEach((pl) => {
            if (pl.eliminated) return;
            const slot = activePlayers.find((p) => p.id === pl.id);
            const pCol = PLAYER_COLORS[slot?.color || 'red'];
            const px = startX + pl.x * cell;
            const py = startY + pl.y * cell;
            const r = cell * 0.28;

            ctx.fillStyle = pCol.hex;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${pl.id}`, px, py + 4);
          });
        }
      }

      hudTimer += dt;
      if (hudTimer >= 0.12) {
        hudTimer = 0;
        const nh: Record<number, { score: number; elim: boolean }> = {};
        const su: Partial<Record<PlayerId, number>> = {};
        const eu: Partial<Record<PlayerId, boolean>> = {};
        playersRef.current.forEach((p) => {
          nh[p.id] = { score: Math.round(p.score), elim: p.eliminated };
          su[p.id] = Math.round(p.score);
          eu[p.id] = p.eliminated;
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
        const st = hud[p.id] || { score: 0, elim: false };
        return (
          <PlayerCornerPanel key={p.id} player={p} score={st.score} eliminated={st.elim}>
            {!p.isAI ? (
              <div className="flex items-center gap-1.5">
                <SteeringWheel
                  variant="omni"
                  touchScale={touchScale}
                  accentHex={PLAYER_COLORS[p.color].hex}
                  label="Steer survivor"
                  onVector={(dx, dy) => setDir(p.id, dx, dy)}
                />
                <button
                  type="button"
                  onPointerDown={() => dashPlayer(p.id)}
                  className={`${btnCls} rounded-xl bg-amber-400 text-slate-950 font-black active:scale-95 flex items-center justify-center`}
                  aria-label="Dash"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-amber-300 text-center">AI Survivor</div>
            )}
          </PlayerCornerPanel>
        );
      })}
    </div>
  );
}
