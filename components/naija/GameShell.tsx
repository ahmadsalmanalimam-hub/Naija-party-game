'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Coins,
  Gem,
  HelpCircle,
  Home,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ACHIEVEMENTS, ARENA_THEMES, GAMES_CATALOG, PLAYER_COLORS } from '@/lib/naija/catalog';
import { buildMatchResult } from '@/lib/naija/resultHelper';
import { soundEngine } from '@/lib/naija/sound';
import {
  MatchConfig,
  MatchResult,
  MiniGameProps,
  PlayerId,
  SaveData,
  TournamentState,
} from '@/lib/naija/types';
import { formatClock, useGameTimer } from '@/lib/naija/useGameTimer';
import { CharacterAvatar } from './CharacterAvatar';

interface GameShellProps {
  config: MatchConfig;
  saveData: SaveData;
  tournament: TournamentState | null;
  GameComponent: React.ComponentType<MiniGameProps>;
  onToggleSound: () => void;
  onCompleteMatch: (result: MatchResult) => {
    newlyUnlockedAchievements: string[];
    coinsEarned: number;
    gemsEarned?: number;
  };
  onNextTournamentGame?: () => void;
  onExit: () => void;
}

export function GameShell({
  config,
  saveData,
  tournament,
  GameComponent,
  onToggleSound,
  onCompleteMatch,
  onNextTournamentGame,
  onExit,
}: GameShellProps) {
  const game = GAMES_CATALOG.find((g) => g.id === config.gameId) || GAMES_CATALOG[0];
  const arena = ARENA_THEMES.find((a) => a.id === config.arenaTheme) || ARENA_THEMES[0];

  const [matchKey, setMatchKey] = useState(0);
  const [countdownStep, setCountdownStep] = useState<number>(3); // 3, 2, 1, 0 (GO!), -1 (playing)
  const [isPaused, setIsPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [scores, setScores] = useState<Partial<Record<PlayerId, number>>>({});
  const [eliminated, setEliminated] = useState<Partial<Record<PlayerId, boolean>>>({});
  const [result, setResult] = useState<MatchResult | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{
    newlyUnlockedAchievements: string[];
    coinsEarned: number;
    gemsEarned?: number;
  } | null>(null);
  const [isSuddenDeath, setIsSuddenDeath] = useState(false);

  const elapsedRef = useRef(0);

  // Snappy 3-2-1-GO countdown on match start / rematch
  useEffect(() => {
    if (countdownStep < 0) return;
    if (countdownStep > 0) {
      soundEngine.playCountdownTick();
      const t = window.setTimeout(() => setCountdownStep((c) => c - 1), 360);
      return () => window.clearTimeout(t);
    }
    soundEngine.playCountdownGo();
    const t = window.setTimeout(() => setCountdownStep(-1), 420);
    return () => window.clearTimeout(t);
  }, [countdownStep]);

  const finishWithResult = useCallback(
    (finalResult: MatchResult) => {
      if (result) return;
      soundEngine.playVictory();
      if (saveData.settings.vibrationEnabled) {
        soundEngine.vibrate([30, 50, 40]);
      }
      const normalized: MatchResult = {
        ...finalResult,
        durationSeconds:
          finalResult.durationSeconds > 0 ? finalResult.durationSeconds : elapsedRef.current,
      };
      setResult(normalized);
      const info = onCompleteMatch(normalized);
      setRewardInfo(info);
    },
    [onCompleteMatch, result, saveData.settings.vibrationEnabled]
  );

  const handleTimeUp = useCallback(() => {
    if (result) return;
    const activePlayers = config.players.filter((p) => p.active);
    const fullScores: Record<PlayerId, number> = {
      1: scores[1] ?? 0,
      2: scores[2] ?? 0,
      3: scores[3] ?? 0,
      4: scores[4] ?? 0,
    };

    if (
      config.allowSuddenDeath &&
      (config.gameId === 'street_football' || config.gameId === 'air_hockey')
    ) {
      const sorted = [...activePlayers].sort((a, b) => fullScores[b.id] - fullScores[a.id]);
      if (sorted.length >= 2 && fullScores[sorted[0].id] === fullScores[sorted[1].id]) {
        soundEngine.playWarning();
        setIsSuddenDeath(true);
        return;
      }
    }

    const built = buildMatchResult(config, fullScores, eliminated, config.timerSeconds || 0, {
      isSuddenDeath,
    });
    finishWithResult(built);
  }, [config, eliminated, finishWithResult, isSuddenDeath, result, scores]);

  const effectivePaused = isPaused || showTutorial || !!result || countdownStep >= 0;

  const { timeRemaining, elapsedSeconds, isUnlimited, resetTimer } = useGameTimer({
    initialSeconds: config.timerSeconds,
    isPaused: effectivePaused,
    isFinished: !!result,
    onTimeUp: handleTimeUp,
  });

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const handleScoreUpdate = useCallback(
    (nextScores: Partial<Record<PlayerId, number>>, nextElim?: Partial<Record<PlayerId, boolean>>) => {
      setScores((prev) => ({ ...prev, ...nextScores }));
      if (nextElim) {
        setEliminated((prev) => ({ ...prev, ...nextElim }));
      }
    },
    []
  );

  const handleRematch = () => {
    setResult(null);
    setRewardInfo(null);
    setScores({});
    setEliminated({});
    setIsSuddenDeath(false);
    setIsPaused(false);
    resetTimer();
    setCountdownStep(3);
    setMatchKey((k) => k + 1);
  };

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orient = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orient && typeof orient.lock === 'function') {
        await orient.lock('landscape');
      }
    } catch {
      // Ignore if unsupported
    }
  };

  const activePlayers = config.players.filter((p) => p.active);
  const eliminatedCount = activePlayers.filter((p) => eliminated[p.id]).length;
  const isTimeWarning = !isUnlimited && timeRemaining > 0 && timeRemaining <= 5;

  const redTotal = activePlayers
    .filter((p) => p.team === 'red')
    .reduce((acc, p) => acc + (scores[p.id] ?? 0), 0);
  const blueTotal = activePlayers
    .filter((p) => p.team === 'blue')
    .reduce((acc, p) => acc + (scores[p.id] ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden select-none"
      style={{ backgroundColor: arena.bgHex }}
    >
      {/* Compact Top Arcade Game HUD */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3 py-1 border-b-[3px] border-[#1a0536] bg-[#3b0764]/95 text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsPaused(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-slate-950 arcade-btn shrink-0"
            aria-label="Pause Game"
          >
            <Pause className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-display font-bold truncate text-yellow-300">
              {game.title}
            </div>
            {tournament && (
              <div className="text-[10px] text-cyan-300 font-bold truncate">
                {tournament.config.title} · {tournament.currentIndex + 1}/{tournament.config.gameIds.length}
              </div>
            )}
          </div>
        </div>

        {/* Center Live Scores & Large Readable Timer */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {config.teamScoring ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 border-2 border-slate-950 px-2.5 py-0.5 text-xs sm:text-sm font-extrabold tabular-nums">
              <span className="text-red-400">RED {Math.round(redTotal)}</span>
              <span className="text-white/40">VS</span>
              <span className="text-cyan-400">{Math.round(blueTotal)} BLUE</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              {activePlayers.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-lg border-2 border-slate-950 px-2 py-0.5 text-[11px] font-extrabold bg-[#220947] ${
                    eliminated[p.id] ? 'opacity-45 line-through' : ''
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-white"
                    style={{ backgroundColor: PLAYER_COLORS[p.color].hex }}
                  />
                  <span className="max-w-[68px] truncate">{p.name}</span>
                  <span className="font-mono text-xs tabular-nums text-yellow-300">
                    {Math.round(scores[p.id] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Large Readable Timer */}
          <div
            className={`px-3 py-0.5 rounded-xl border-2 border-slate-950 font-mono text-sm sm:text-base font-extrabold tabular-nums whitespace-nowrap shadow-sm ${
              isSuddenDeath
                ? 'bg-red-500 text-white animate-pulse'
                : isTimeWarning
                ? 'bg-yellow-400 text-slate-950 animate-pulse'
                : 'bg-cyan-400 text-slate-950'
            }`}
          >
            {isSuddenDeath
              ? 'SUDDEN DEATH!'
              : isUnlimited
              ? formatClock(elapsedSeconds)
              : formatClock(timeRemaining)}
          </div>
        </div>

        {/* Right Utility Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowTutorial(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-800 text-white arcade-btn"
            aria-label="How to Play"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-800 text-white arcade-btn"
            aria-label="Toggle Sound"
          >
            {saveData.settings.sfxEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={requestFullscreen}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 arcade-btn"
            aria-label="Landscape Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Spectator Mode Notice */}
      {eliminatedCount > 0 && eliminatedCount < activePlayers.length && !result && (
        <div className="bg-yellow-400 text-slate-950 px-3 py-1 text-center text-xs font-extrabold border-b-2 border-slate-950 shrink-0">
          Spectator Mode · Eliminated players cheer from the sidelines until the round finishes!
        </div>
      )}

      {/* Full-Bleed Active Mini-Game Surface */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <GameComponent
          key={matchKey}
          config={config}
          isPaused={effectivePaused}
          touchScale={saveData.settings.touchScale}
          lowRamMode={saveData.settings.lowRamMode}
          onScoreUpdate={handleScoreUpdate}
          onFinish={finishWithResult}
          timeRemaining={timeRemaining}
          elapsedSeconds={elapsedSeconds}
          isSuddenDeath={isSuddenDeath}
        />

        {/* Cartoon Traffic Light Countdown Overlay (Red -> Yellow -> Green) */}
        {countdownStep >= 0 && !isPaused && !showTutorial && !result && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-7 h-5 bg-[#1C1E24] border-x-[3px] border-[#0A0B0E]" />
              <div className="rounded-3xl bg-[#1C1E24] border-[4px] border-[#0A0B0E] p-3 flex flex-col items-center gap-2.5 shadow-[0_8px_0_rgba(0,0,0,0.45)]">
                {/* Red Light (3) */}
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-[3px] border-[#0A0B0E] flex items-center justify-center font-display text-2xl font-black transition-all ${
                    countdownStep === 3
                      ? 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.9)] scale-105'
                      : 'bg-red-950/60 text-transparent'
                  }`}
                >
                  {countdownStep === 3 ? '3' : ''}
                </div>
                {/* Yellow Light (2, 1) */}
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-[3px] border-[#0A0B0E] flex items-center justify-center font-display text-2xl font-black transition-all ${
                    countdownStep === 2 || countdownStep === 1
                      ? 'bg-yellow-400 text-slate-950 shadow-[0_0_24px_rgba(250,204,21,0.9)] scale-105'
                      : 'bg-yellow-950/50 text-transparent'
                  }`}
                >
                  {countdownStep === 2 || countdownStep === 1 ? countdownStep : ''}
                </div>
                {/* Green Light (GO!) */}
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-[3px] border-[#0A0B0E] flex items-center justify-center font-display text-lg font-black transition-all ${
                    countdownStep === 0
                      ? 'bg-emerald-400 text-slate-950 shadow-[0_0_26px_rgba(52,211,153,0.95)] scale-110'
                      : 'bg-emerald-950/50 text-transparent'
                  }`}
                >
                  {countdownStep === 0 ? 'GO!' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-indigo-950 text-white p-6 arcade-card">
            <h3 className="text-2xl font-display font-bold text-yellow-300">
              How to Play · {game.title}
            </h3>
            <p className="mt-1 text-xs font-bold text-cyan-300">{game.controlsSummary}</p>
            <ol className="mt-4 space-y-2.5 text-sm text-purple-100 list-decimal list-inside">
              {game.tutorialSteps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setShowTutorial(false)}
              className="mt-6 w-full rounded-2xl bg-emerald-400 py-3 text-sm font-extrabold text-slate-950 arcade-btn"
            >
              Back to Match
            </button>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && !result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-indigo-950 text-white p-6 arcade-card space-y-3">
            <h3 className="text-3xl font-display font-bold text-center text-yellow-300">
              Game Paused
            </h3>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setIsPaused(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 text-sm font-extrabold text-slate-950 arcade-btn"
            >
              <Play className="h-4 w-4 fill-current" />
              Resume Match
            </button>
            <button
              type="button"
              onClick={handleRematch}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-sm font-extrabold text-slate-950 arcade-btn"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Game
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPaused(false);
                setShowTutorial(true);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 arcade-btn"
            >
              <HelpCircle className="h-4 w-4" />
              Rules & Controls
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExit();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-extrabold text-white arcade-btn"
            >
              <Home className="h-4 w-4" />
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Celebratory Victory & Podium Screen */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/90 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-indigo-950 text-white p-5 sm:p-6 arcade-card my-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-purple-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950 arcade-card shrink-0">
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-xs font-bold text-cyan-300">
                    {game.title} · {formatClock(result.durationSeconds)}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-yellow-300">
                    {result.summaryText}
                  </h2>
                </div>
              </div>

              {rewardInfo && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 border-2 border-slate-950">
                    <Coins className="h-4 w-4" />
                    <span>+{rewardInfo.coinsEarned}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 border-2 border-slate-950">
                    <Gem className="h-4 w-4" />
                    <span>+{rewardInfo.gemsEarned ?? 2}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Standings Grid (Landscape-friendly 2-column for 3-4 players) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.standings.map((s) => {
                const isWinner = result.winningPlayerIds.includes(s.playerId);
                return (
                  <div
                    key={s.playerId}
                    className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-950 p-3 ${
                      isWinner ? 'bg-yellow-400 text-slate-950' : 'bg-purple-900/90 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-mono text-base font-extrabold">
                        #{s.rank}
                      </span>
                      <CharacterAvatar
                        characterId={s.character}
                        outfitId={s.outfit}
                        accessoryId={s.accessory}
                        colorKey={s.color}
                        mood={isWinner ? 'victory' : 'defeat'}
                        size={48}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">{s.name}</div>
                        <div
                          className={`text-xs font-bold ${
                            isWinner ? 'text-slate-800' : 'text-purple-200'
                          }`}
                        >
                          {config.teamScoring
                            ? `${s.team === 'red' ? 'Red Team' : 'Blue Team'}`
                            : s.isAI
                            ? 'AI Challenger'
                            : 'Human Player'}
                          {s.eliminated ? ' · Out' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xl font-extrabold tabular-nums">{s.score}</div>
                      <div
                        className={`text-[11px] font-bold ${
                          isWinner ? 'text-slate-800' : 'text-purple-300'
                        }`}
                      >
                        pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {rewardInfo && rewardInfo.newlyUnlockedAchievements.length > 0 && (
              <div className="mt-3 rounded-2xl bg-emerald-400 text-slate-950 border-2 border-slate-950 px-4 py-2 text-xs font-extrabold">
                Trophy Unlocked:{' '}
                {rewardInfo.newlyUnlockedAchievements
                  .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title || id)
                  .join(', ')}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {tournament && onNextTournamentGame ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onNextTournamentGame();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 px-5 text-sm font-extrabold text-slate-950 arcade-btn"
                >
                  <span>Next Tournament Game</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRematch}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 px-5 text-sm font-extrabold text-slate-950 arcade-btn"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Instant Rematch</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExit();
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 py-3.5 px-5 text-sm font-extrabold text-slate-950 arcade-btn"
              >
                <Home className="h-4 w-4" />
                <span>Main Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
