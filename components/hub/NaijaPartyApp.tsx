'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Coins,
  Eraser,
  Flame,
  Gamepad2,
  Gem,
  Play,
  Settings,
  ShoppingBag,
  Shuffle,
  SlidersHorizontal,
  Store,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { CATEGORY_LABELS, GAMES_CATALOG } from '@/lib/naija/catalog';
import { soundEngine } from '@/lib/naija/sound';
import {
  applyPresetToPlayers,
  buildDefaultMatchConfig,
  getDefaultSaveData,
  loadSaveData,
  persistSaveData,
  recordMatchCompletion,
} from '@/lib/naija/storage';
import {
  GameCategory,
  GameDefinition,
  MatchConfig,
  MatchPresetMode,
  MatchResult,
  PlayerId,
  SaveData,
  TournamentConfig,
  TournamentMode,
  TournamentState,
} from '@/lib/naija/types';
import { GAME_COMPONENTS } from '@/components/games/GameRegistry';
import { CharacterAvatar } from '@/components/naija/CharacterAvatar';
import { CornerSunburstDecor } from '@/components/naija/CornerSunbursts';
import { GameArtwork } from '@/components/naija/GameArtwork';
import { GameShell } from '@/components/naija/GameShell';
import { LandscapeGuard } from '@/components/naija/LandscapeGuard';
import { PlayerSetupModal } from '@/components/naija/PlayerSetupModal';
import { PWAInstallButton } from '@/components/pwa/PWAControls';
import { CollectionView } from './CollectionView';
import { RecordsView } from './RecordsView';
import { SettingsView } from './SettingsView';
import { TournamentBuilderModal, TournamentStandingsScreen } from './TournamentModal';

type HubTab = 'home' | 'tournaments' | 'collection' | 'records' | 'settings';

const MODE_OPTIONS: Array<{
  id: MatchPresetMode;
  label: string;
  shortLabel: string;
  sub: string;
  bg: string;
  team: boolean;
}> = [
  { id: '1p_ai', label: '1 PLAYER', shortLabel: '1P', sub: 'vs AI Bots', bg: 'bg-cyan-400 text-slate-950', team: false },
  { id: '2p', label: '2 PLAYERS', shortLabel: '2P', sub: '1 Phone', bg: 'bg-emerald-400 text-slate-950', team: false },
  { id: '3p', label: '3 PLAYERS', shortLabel: '3P', sub: '1 Phone', bg: 'bg-yellow-400 text-slate-950', team: false },
  { id: '4p', label: '4 PLAYERS', shortLabel: '4P', sub: 'Full Squad', bg: 'bg-orange-400 text-slate-950', team: false },
  { id: '2v2', label: 'TEAM VS TEAM', shortLabel: '2v2', sub: 'Red vs Blue', bg: 'bg-rose-500 text-white', team: true },
];

const TOURNAMENT_CARDS: Array<{
  mode: TournamentMode;
  title: string;
  desc: string;
  accent: string;
}> = [
  {
    mode: 'party_cup',
    title: 'Party Championship',
    desc: '5, 10, or 20-game mixed party cup across all arenas.',
    accent: '#059669',
  },
  {
    mode: 'red_vs_blue',
    title: 'Red vs Blue',
    desc: 'Team up in 1v1, 1v2, 1v3, or 2v2 and combine team scores.',
    accent: '#EF4444',
  },
  {
    mode: 'survival_champ',
    title: 'Survival Mode',
    desc: 'Elimination & last-standing battles with spectator mode.',
    accent: '#F97316',
  },
  {
    mode: 'game_night',
    title: 'Game Night',
    desc: 'Long-form family & friends marathon rotation.',
    accent: '#3B82F6',
  },
  {
    mode: 'winner_stays',
    title: 'Winner Stays Champion',
    desc: 'Hold the crown across consecutive matches.',
    accent: '#F59E0B',
  },
  {
    mode: 'custom',
    title: 'Custom Tournament',
    desc: 'Choose your exact mini-games, rounds & match length.',
    accent: '#8B5CF6',
  },
];

export function NaijaPartyApp() {
  const [saveData, setSaveData] = useState<SaveData>(() => getDefaultSaveData());
  const [activeTab, setActiveTab] = useState<HubTab>('home');
  const [homeView, setHomeView] = useState<'menu' | 'games'>('menu');
  const [selectedMode, setSelectedMode] = useState<MatchPresetMode>('2p');
  const [categoryFilter, setCategoryFilter] = useState<'all' | GameCategory>('all');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(GAMES_CATALOG[0].id);
  const [setupGame, setSetupGame] = useState<GameDefinition | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchConfig | null>(null);
  const [tournamentBuilderMode, setTournamentBuilderMode] = useState<TournamentMode | null>(null);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);
  const [randomPickTick, setRandomPickTick] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const loaded = loadSaveData();
      setSaveData(loaded);
      const activeCount = loaded.playerPresets.filter((p) => p.active).length;
      const aiCount = loaded.playerPresets.filter((p) => p.active && p.isAI).length;
      if (aiCount >= 1 && loaded.playerPresets.filter((p) => p.active && !p.isAI).length === 1) {
        setSelectedMode('1p_ai');
      } else if (activeCount === 4) {
        setSelectedMode('4p');
      } else if (activeCount === 3) {
        setSelectedMode('3p');
      } else {
        setSelectedMode('2p');
      }
      soundEngine.configure({
        sfxEnabled: loaded.settings.sfxEnabled,
        musicEnabled: loaded.settings.musicEnabled,
        volume: loaded.settings.sfxVolume,
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleUpdateSave = (next: SaveData) => {
    setSaveData(next);
    persistSaveData(next);
  };

  const filteredGames = useMemo(() => {
    if (categoryFilter === 'all') return GAMES_CATALOG;
    return GAMES_CATALOG.filter(
      (g) => g.category === categoryFilter || g.secondaryCategory === categoryFilter
    );
  }, [categoryFilter]);

  const selectedGame = useMemo(
    () => GAMES_CATALOG.find((g) => g.id === selectedGameId) || null,
    [selectedGameId]
  );

  const selectionCtxRef = useRef({
    filteredGames: GAMES_CATALOG,
    selectedGameId: GAMES_CATALOG[0].id as string | null,
  });

  useEffect(() => {
    selectionCtxRef.current = { filteredGames, selectedGameId };
  }, [filteredGames, selectedGameId]);

  useEffect(() => {
    if (randomPickTick === 0) return;
    const id = window.setTimeout(() => {
      const { filteredGames: currentPool, selectedGameId: currentId } = selectionCtxRef.current;
      const pool = currentPool.length > 0 ? currentPool : GAMES_CATALOG;
      const candidates =
        pool.length > 1 && currentId ? pool.filter((g) => g.id !== currentId) : pool;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick) {
        setSelectedGameId(pick.id);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [randomPickTick]);

  const tournamentId = tournament?.config.id ?? null;
  const totalTournamentsCount = saveData.totalTournaments;

  useEffect(() => {
    if (!tournamentId || tournamentId.startsWith('t_uid_')) return;
    const id = window.setTimeout(() => {
      const uid = `t_uid_${totalTournamentsCount}_${Math.random().toString(36).slice(2, 8)}`;
      setTournament((prev) =>
        prev && prev.config.id === tournamentId
          ? { ...prev, config: { ...prev.config, id: uid } }
          : prev
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [tournamentId, totalTournamentsCount]);

  const buildConfigForMode = (game: GameDefinition, mode: MatchPresetMode): MatchConfig => {
    const base = buildDefaultMatchConfig(game.id, saveData);
    let players = applyPresetToPlayers(base.players, mode);
    let effectiveMode = mode;
    let isTeam = mode === '2v2';

    if (game.maxPlayers === 2) {
      players = players.map((p, idx) => ({ ...p, active: idx < 2 }));
      if (mode === '3p' || mode === '4p') {
        effectiveMode = '2p';
      } else if (mode === '2v2') {
        effectiveMode = '1v1';
      }
    }

    if (!game.supportsTeams) {
      isTeam = false;
    }

    return {
      ...base,
      presetMode: effectiveMode,
      players,
      teamScoring: isTeam,
    };
  };

  const handleSelectMode = (mode: MatchPresetMode) => {
    soundEngine.playClick();
    setSelectedMode(mode);
    const updatedPlayers = applyPresetToPlayers(saveData.playerPresets, mode);
    handleUpdateSave({
      ...saveData,
      playerPresets: updatedPlayers,
    });
  };

  const openGameSetup = (game: GameDefinition) => {
    soundEngine.playClick();
    setSelectedGameId(game.id);
    setSetupGame(game);
  };

  const handleInstantPlay = (game: GameDefinition) => {
    soundEngine.playCountdownGo();
    const cfg = buildConfigForMode(game, selectedMode);
    handleStartMatch(cfg);
  };

  const handleRandomGame = () => {
    soundEngine.playClick();
    setRandomPickTick((t) => t + 1);
  };

  const handleClearSelection = () => {
    soundEngine.playClick();
    setSelectedGameId(null);
    setCategoryFilter('all');
  };

  const handleStartMatch = (config: MatchConfig) => {
    const updatedSave: SaveData = {
      ...saveData,
      playerPresets: config.players.map((p) => ({ ...p })),
      settings: {
        ...saveData.settings,
        preferredArena: config.arenaTheme,
      },
    };
    handleUpdateSave(updatedSave);
    setSetupGame(null);
    setActiveMatch(config);
  };

  const handleStartTournament = (tConfig: TournamentConfig) => {
    const initialPoints: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const initialState: TournamentState = {
      config: tConfig,
      currentIndex: 0,
      playerPoints: initialPoints,
      teamPoints: { red: 0, blue: 0 },
      roundWins: { 1: 0, 2: 0, 3: 0, 4: 0 },
      championStreakId: null,
      championStreakCount: 0,
      completedGames: [],
      finished: false,
    };
    setTournamentBuilderMode(null);
    setTournament(initialState);
    launchTournamentGame(initialState, 0);
  };

  const launchTournamentGame = (tState: TournamentState, gameIdx: number) => {
    const gameId = tState.config.gameIds[gameIdx];
    const def = GAMES_CATALOG.find((g) => g.id === gameId) || GAMES_CATALOG[0];
    const base = buildDefaultMatchConfig(def.id, saveData);
    base.players = tState.config.players.map((p) => ({ ...p }));
    base.teamScoring = tState.config.teamMode && def.supportsTeams;
    base.roundsTarget = tState.config.bestOf;
    base.arenaTheme = tState.config.arenaTheme;
    setShowTournamentStandings(false);
    setActiveMatch(base);
  };

  const handleCompleteMatch = (result: MatchResult) => {
    if (!activeMatch) {
      return { newlyUnlockedAchievements: [], coinsEarned: 0, gemsEarned: 0 };
    }

    let nextTournamentState = tournament;
    let isCupDone = false;

    if (tournament) {
      const updatedPlayerPoints = { ...tournament.playerPoints };
      const pointsTable = [100, 60, 35, 15];
      result.standings.forEach((s) => {
        updatedPlayerPoints[s.playerId] =
          (updatedPlayerPoints[s.playerId] || 0) + (pointsTable[s.rank - 1] ?? 10);
      });

      const nextTeamPoints = { ...tournament.teamPoints };
      if (tournament.config.teamMode) {
        if (result.winningTeam === 'red') nextTeamPoints.red += 100;
        else if (result.winningTeam === 'blue') nextTeamPoints.blue += 100;
        else {
          nextTeamPoints.red += 50;
          nextTeamPoints.blue += 50;
        }
      }

      const firstWinnerId = result.winningPlayerIds[0] || null;
      let nextStreakId = tournament.championStreakId;
      let nextStreakCount = tournament.championStreakCount;
      if (firstWinnerId) {
        if (firstWinnerId === nextStreakId) nextStreakCount += 1;
        else {
          nextStreakId = firstWinnerId;
          nextStreakCount = 1;
        }
      }

      const nextIdx = tournament.currentIndex + 1;
      isCupDone = nextIdx >= tournament.config.gameIds.length;

      nextTournamentState = {
        ...tournament,
        currentIndex: nextIdx,
        playerPoints: updatedPlayerPoints,
        teamPoints: nextTeamPoints,
        championStreakId: nextStreakId,
        championStreakCount: nextStreakCount,
        completedGames: [
          ...tournament.completedGames,
          {
            gameId: result.gameId,
            winnerNames: result.standings
              .filter((s) => result.winningPlayerIds.includes(s.playerId))
              .map((s) => s.name),
            winningTeam: result.winningTeam,
          },
        ],
        finished: isCupDone,
      };
      setTournament(nextTournamentState);
    }

    const { updatedSave, newlyUnlockedAchievements, coinsEarned, gemsEarned } =
      recordMatchCompletion(saveData, activeMatch, result, isCupDone);
    setSaveData(updatedSave);
    return { newlyUnlockedAchievements, coinsEarned, gemsEarned };
  };

  const handleToggleSound = () => {
    const nextEnabled = !saveData.settings.sfxEnabled;
    const next: SaveData = {
      ...saveData,
      settings: {
        ...saveData.settings,
        sfxEnabled: nextEnabled,
        musicEnabled: nextEnabled ? saveData.settings.musicEnabled : false,
      },
    };
    soundEngine.configure({
      sfxEnabled: next.settings.sfxEnabled,
      musicEnabled: next.settings.musicEnabled,
      volume: next.settings.sfxVolume,
    });
    handleUpdateSave(next);
  };

  // Active Match Screen (only loads the active mini-game component)
  if (activeMatch) {
    const ActiveGameComp = GAME_COMPONENTS[activeMatch.gameId];
    if (ActiveGameComp) {
      return (
        <>
          <LandscapeGuard />
          <GameShell
            config={activeMatch}
            saveData={saveData}
            tournament={tournament}
            GameComponent={ActiveGameComp}
            onToggleSound={handleToggleSound}
            onCompleteMatch={handleCompleteMatch}
            onNextTournamentGame={
              tournament
                ? () => {
                    setActiveMatch(null);
                    setShowTournamentStandings(true);
                  }
                : undefined
            }
            onExit={() => {
              setActiveMatch(null);
              if (tournament) {
                setShowTournamentStandings(true);
              }
            }}
          />
        </>
      );
    }
  }

  const isMainMenuScreen = activeTab === 'home' && homeView === 'menu';

  const enterGamesWithMode = (mode: MatchPresetMode) => {
    handleSelectMode(mode);
    setActiveTab('home');
    setHomeView('games');
  };

  return (
    <div
      className={`min-h-screen flex flex-col arcade-bg text-white relative overflow-x-hidden ${
        isMainMenuScreen ? 'pb-4' : 'pb-16 sm:pb-4'
      }`}
    >
      <LandscapeGuard />
      <CornerSunburstDecor />

      {/* Main Menu Screen matching Reference Screenshot 1 */}
      {isMainMenuScreen ? (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-between px-4 sm:px-8 py-4 sm:py-6 min-h-screen">
          {/* Top Currency Counters (Gems & Coins) */}
          <div className="w-full max-w-3xl flex items-center justify-center gap-4 sm:gap-8 pt-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('collection');
              }}
              className="relative flex items-center justify-between min-w-[118px] sm:min-w-[140px] rounded-full bg-[#220947] border-[3px] border-[#15042d] pl-4 pr-10 py-1.5 shadow-[0_4px_0_#15042d] hover:brightness-110 transition"
              title="Party Gems — Open Shop"
            >
              <span className="font-display text-base sm:text-lg font-black tabular-nums text-white mx-auto">
                {saveData.gems ?? 15}
              </span>
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-cyan-400 border-[3px] border-[#15042d] flex items-center justify-center shadow-[0_3px_0_#15042d] rotate-6">
                <Gem className="h-5 w-5 text-slate-950" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('collection');
              }}
              className="relative flex items-center justify-between min-w-[130px] sm:min-w-[156px] rounded-full bg-[#220947] border-[3px] border-[#15042d] pl-4 pr-10 py-1.5 shadow-[0_4px_0_#15042d] hover:brightness-110 transition"
              title="Party Coins — Open Shop"
            >
              <span className="font-display text-base sm:text-lg font-black tabular-nums text-white mx-auto">
                {saveData.coins}
              </span>
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-yellow-400 border-[3px] border-[#15042d] flex items-center justify-center shadow-[0_3px_0_#15042d]">
                <Coins className="h-5 w-5 text-slate-950" />
              </span>
            </button>
          </div>

          {/* Left Floating Cyan Arcade Dock (Shop, Settings, Cups, Records) */}
          <div className="fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('collection');
              }}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-cyan-400 text-slate-950 arcade-btn flex items-center justify-center hover:brightness-105"
              aria-label="Shop"
              title="Shop"
            >
              <Store className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-[0_2px_0_#15042d]" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('settings');
              }}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-cyan-400 text-slate-950 arcade-btn flex items-center justify-center hover:brightness-105"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-[0_2px_0_#15042d]" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('tournaments');
              }}
              className="h-10 w-12 sm:h-11 sm:w-14 rounded-2xl bg-yellow-400 text-slate-950 arcade-btn flex items-center justify-center hover:brightness-105"
              aria-label="Cups"
              title="Tournament Cups"
            >
              <Trophy className="h-5 w-5 text-slate-950" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('records');
              }}
              className="h-10 w-12 sm:h-11 sm:w-14 rounded-2xl bg-emerald-400 text-slate-950 arcade-btn flex items-center justify-center hover:brightness-105"
              aria-label="Records"
              title="Records & Trophies"
            >
              <Award className="h-5 w-5 text-slate-950" />
            </button>
          </div>

          {/* Center Cartoon Sticker Logo + Mode Selector Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-5 my-auto pl-8 sm:pl-0">
            {/* 2 3 4 PLAYER GAMES Cartoon Logo */}
            <div className="flex flex-col items-center text-center select-none">
              <div className="flex items-end justify-center gap-1 sm:gap-2 leading-none -mb-2">
                <span className="font-display text-5xl sm:text-6xl font-black text-blue-500 cartoon-outline -rotate-6">
                  2
                </span>
                <span className="font-display text-5xl sm:text-6xl font-black text-emerald-400 cartoon-outline z-10 -translate-y-1">
                  3
                </span>
                <span className="font-display text-5xl sm:text-6xl font-black text-yellow-400 cartoon-outline rotate-6">
                  4
                </span>
              </div>
              <div className="font-display text-4xl sm:text-5xl font-black tracking-wide text-white cartoon-outline leading-[0.92]">
                PLAYER
              </div>
              <div className="font-display text-4xl sm:text-5xl font-black tracking-wide text-white cartoon-outline leading-[0.94]">
                GAMES
              </div>
              <div className="mt-1.5 text-xs sm:text-sm font-display font-black tracking-widest uppercase text-yellow-300 cartoon-outline-sm">
                NAIJA PARTY · {GAMES_CATALOG.length} GAMES
              </div>
            </div>

            {/* Split Action Buttons: [1 PLAYER] & [2 3 4 PLAYERS] */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {/* 1 PLAYER Red/Cyan Split Button */}
              <button
                type="button"
                onClick={() => enterGamesWithMode('1p_ai')}
                className="w-44 sm:w-52 rounded-2xl overflow-hidden arcade-btn flex flex-col hover:brightness-105"
              >
                <span className="w-full bg-red-500 py-1.5 sm:py-2 font-display text-3xl sm:text-4xl font-black text-white cartoon-outline-sm leading-none">
                  1
                </span>
                <span className="w-full bg-cyan-400 py-1 font-display text-base sm:text-lg font-black uppercase tracking-wide text-white cartoon-outline-sm border-t-[3px] border-[#1a0536]">
                  PLAYER
                </span>
              </button>

              {/* 2 3 4 PLAYERS Multi-Color Split Card */}
              <div className="w-48 sm:w-56 rounded-2xl overflow-hidden arcade-card flex flex-col bg-[#1a0536]">
                <div className="grid grid-cols-3">
                  <button
                    type="button"
                    onClick={() => enterGamesWithMode('2p')}
                    className="bg-blue-500 py-1.5 sm:py-2 font-display text-3xl sm:text-4xl font-black text-white cartoon-outline-sm leading-none hover:brightness-110 active:translate-y-0.5 transition"
                    aria-label="2 Players"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    onClick={() => enterGamesWithMode('3p')}
                    className="bg-emerald-500 py-1.5 sm:py-2 font-display text-3xl sm:text-4xl font-black text-white cartoon-outline-sm leading-none border-x-[2px] border-[#1a0536] hover:brightness-110 active:translate-y-0.5 transition"
                    aria-label="3 Players"
                  >
                    3
                  </button>
                  <button
                    type="button"
                    onClick={() => enterGamesWithMode('4p')}
                    className="bg-yellow-400 py-1.5 sm:py-2 font-display text-3xl sm:text-4xl font-black text-white cartoon-outline-sm leading-none hover:brightness-110 active:translate-y-0.5 transition"
                    aria-label="4 Players"
                  >
                    4
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    enterGamesWithMode(
                      selectedMode === '3p' || selectedMode === '4p' ? selectedMode : '2p'
                    )
                  }
                  className="w-full bg-cyan-400 py-1 font-display text-base sm:text-lg font-black uppercase tracking-wide text-white cartoon-outline-sm border-t-[3px] border-[#1a0536] hover:brightness-105"
                >
                  PLAYERS
                </button>
              </div>
            </div>

            {/* TEAM VS TEAM Split Button */}
            <div className="relative pt-3">
              <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-full bg-cyan-400 border-[3px] border-[#1a0536] px-3 py-0.5 font-display text-[11px] font-black uppercase tracking-wide text-white cartoon-outline-sm whitespace-nowrap">
                TEAM VS TEAM
              </div>
              <button
                type="button"
                onClick={() => enterGamesWithMode('2v2')}
                className="w-48 sm:w-56 rounded-2xl overflow-hidden arcade-btn flex flex-col hover:brightness-105"
              >
                <span className="w-full grid grid-cols-2">
                  <span className="bg-yellow-400 py-2 font-display text-2xl sm:text-3xl font-black text-white cartoon-outline-sm leading-none">
                    2
                  </span>
                  <span className="bg-[#3b0764] py-2 font-display text-2xl sm:text-3xl font-black text-white cartoon-outline-sm leading-none border-l-[2px] border-[#1a0536]">
                    2
                  </span>
                </span>
                <span className="w-full bg-cyan-400 py-1 font-display text-base sm:text-lg font-black uppercase tracking-wide text-white cartoon-outline-sm border-t-[3px] border-[#1a0536]">
                  PLAYERS
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Utility Strip */}
          <div className="w-full flex items-center justify-center gap-3 pb-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setHomeView('games');
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-2 text-xs sm:text-sm font-extrabold text-slate-950 arcade-btn"
            >
              <Gamepad2 className="h-4 w-4" />
              <span>Browse All {GAMES_CATALOG.length} Mini-Games</span>
            </button>
            <div className="hidden sm:block">
              <PWAInstallButton compact />
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Landscape Arcade Top Header (Games Grid & Sub-Tabs) */}
          <header className="sticky top-0 z-30 border-b-3 border-[#1a0536] bg-[#3b0764]/95 backdrop-blur-md">
            <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 h-14">
              {/* Back to Menu + 234 PLAYERS Cartoon Logo */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('home');
                    setHomeView('menu');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 arcade-btn"
                  aria-label="Main Menu"
                  title="Main Menu"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('home');
                    setHomeView('menu');
                  }}
                  className="flex items-center gap-2 shrink-0 group"
                >
                  <span className="flex items-center rounded-xl bg-[#220947] border-2 border-[#15042d] shadow-[0_3px_0_#15042d] px-2.5 py-0.5 group-hover:scale-105 transition-transform">
                    <span className="font-display text-xl sm:text-2xl font-black text-blue-400 leading-none">
                      2
                    </span>
                    <span className="font-display text-xl sm:text-2xl font-black text-emerald-400 leading-none">
                      3
                    </span>
                    <span className="font-display text-xl sm:text-2xl font-black text-yellow-400 leading-none">
                      4
                    </span>
                    <span className="ml-1.5 font-display text-xs sm:text-sm font-black tracking-wide text-white leading-none">
                      PLAYERS
                    </span>
                  </span>
                </button>
              </div>

              {/* Landscape Navigation Buttons */}
              <nav className="hidden sm:flex items-center gap-1.5">
                {(
                  [
                    ['home', 'Play', Gamepad2],
                    ['tournaments', 'Cups', Trophy],
                    ['collection', 'Shop', ShoppingBag],
                    ['records', 'Records', Award],
                    ['settings', 'Settings', Settings],
                  ] as const
                ).map(([tabId, label, Icon]) => {
                  const isActive = activeTab === tabId;
                  return (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab(tabId);
                        if (tabId === 'home') setHomeView('games');
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold arcade-btn whitespace-nowrap ${
                        isActive
                          ? 'bg-yellow-400 text-slate-950'
                          : 'bg-purple-800/90 text-white hover:bg-purple-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Currency Counters + Install */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('collection');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-yellow-400 border-2 border-[#15042d] shadow-[0_3px_0_#15042d] px-2.5 py-1 text-xs font-extrabold text-slate-950"
                  title="Party Coins — Open Shop"
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">{saveData.coins}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('collection');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-400 border-2 border-[#15042d] shadow-[0_3px_0_#15042d] px-2.5 py-1 text-xs font-extrabold text-slate-950"
                  title="Party Gems — Open Shop"
                >
                  <Gem className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">{saveData.gems ?? 15}</span>
                </button>
                <div className="hidden md:block">
                  <PWAInstallButton compact />
                </div>
              </div>
            </div>
          </header>

          {/* Main Full-Width Landscape Container */}
          <main className="relative z-10 w-full max-w-[1440px] mx-auto flex-1 px-3 sm:px-5 pt-3 sm:pt-4 space-y-4">
            {activeTab === 'home' && (
              <>
                {/* Main Menu Control Strip: Player Modes + Selected Game Spotlight */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                  {/* Left: Player Count & Team Selection */}
                  <div className="lg:col-span-7 rounded-3xl bg-[#220947]/92 arcade-card p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                      One Phone · Four Players · Endless Fun
                    </span>
                    <h1 className="text-xl sm:text-2xl font-display font-bold text-yellow-300 leading-tight">
                      Choose Players & Mode
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {saveData.playerPresets.map((p) => (
                        <div
                          key={p.id}
                          className={`transition-opacity ${
                            p.active ? 'opacity-100' : 'opacity-30'
                          }`}
                        >
                          <CharacterAvatar
                            characterId={p.character}
                            outfitId={p.outfit}
                            accessoryId={p.accessory}
                            colorKey={p.color}
                            size={34}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('collection');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-fuchsia-500 px-2.5 py-1.5 text-xs font-extrabold text-white arcade-btn"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Shop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('settings');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-purple-800 px-2.5 py-1.5 text-xs font-extrabold text-white arcade-btn"
                      aria-label="Settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1P / 2P / 3P / 4P / TEAM VS TEAM */}
                <div className="grid grid-cols-5 gap-2">
                  {MODE_OPTIONS.map((m) => {
                    const isActive = selectedMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMode(m.id)}
                        className={`rounded-2xl p-2 sm:p-2.5 text-center arcade-btn flex flex-col items-center justify-center gap-0.5 ${
                          isActive
                            ? `${m.bg} ring-3 ring-white scale-[1.02]`
                            : 'bg-purple-900/90 text-white hover:bg-purple-800'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-display text-sm sm:text-base font-black leading-none">
                          {m.id === '1p_ai' ? (
                            <User className="h-3.5 w-3.5 hidden sm:inline" />
                          ) : m.team ? (
                            <Swords className="h-3.5 w-3.5 hidden sm:inline" />
                          ) : (
                            <Users className="h-3.5 w-3.5 hidden sm:inline" />
                          )}
                          <span>{m.shortLabel}</span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-extrabold leading-tight">
                          {m.label}
                        </span>
                        <span
                          className={`text-[9px] hidden sm:block ${
                            isActive ? 'opacity-85 font-bold' : 'text-purple-200'
                          }`}
                        >
                          {m.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected Game Spotlight & Launch Actions */}
              <div className="lg:col-span-5 rounded-3xl bg-purple-900/95 arcade-card p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                {selectedGame ? (
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-32 shrink-0">
                      <GameArtwork
                        gameId={selectedGame.id}
                        className="w-full h-20 object-cover rounded-2xl border-3 border-slate-950"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-cyan-400 border border-slate-950 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 uppercase">
                          {CATEGORY_LABELS[selectedGame.category]}
                        </span>
                        <span className="text-[11px] font-extrabold text-yellow-300">
                          {selectedGame.minPlayers}–{selectedGame.maxPlayers}P
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg sm:text-xl font-display font-bold text-white truncate">
                        {selectedGame.title}
                      </h2>
                      <p className="text-xs text-purple-100 line-clamp-2">
                        {selectedGame.tagline}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="text-xs font-extrabold text-cyan-300 uppercase">
                        No Game Selected
                      </div>
                      <div className="text-base font-display font-bold text-white">
                        Tap any game card below or hit Random Game!
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {selectedGame && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleInstantPlay(selectedGame)}
                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-400 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 arcade-btn"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Play Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openGameSetup(selectedGame)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-cyan-400 px-3 py-2.5 text-xs font-extrabold text-slate-950 arcade-btn"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Setup</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleRandomGame}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-yellow-400 px-3 py-2.5 text-xs font-extrabold text-slate-950 arcade-btn"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Random Game</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-purple-800 px-3 py-2.5 text-xs font-extrabold text-white arcade-btn"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Playable Games Zone — 5-Column Landscape Grid */}
            <section className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-yellow-300">
                    Mini-Games ({filteredGames.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTournamentBuilderMode('party_cup');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 arcade-btn"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Party Cup</span>
                  </button>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setCategoryFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap shrink-0 ${
                      categoryFilter === 'all'
                        ? 'bg-yellow-400 text-slate-950'
                        : 'bg-purple-900/90 text-white hover:bg-purple-800'
                    }`}
                  >
                    All ({GAMES_CATALOG.length})
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as GameCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setCategoryFilter(cat);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-purple-900/90 text-white hover:bg-purple-800'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5-Column Landscape Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredGames.map((game) => {
                  const isSelected = selectedGameId === game.id;
                  return (
                    <div
                      key={game.id}
                      className={`group rounded-3xl p-2.5 text-left transition-all flex flex-col justify-between gap-2 arcade-card ${
                        isSelected
                          ? 'bg-gradient-to-b from-yellow-400 to-amber-300 text-slate-950 ring-4 ring-cyan-300 -translate-y-0.5'
                          : 'bg-indigo-950/95 text-white hover:bg-purple-900/95 hover:-translate-y-0.5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            openGameSetup(game);
                          } else {
                            soundEngine.playClick();
                            setSelectedGameId(game.id);
                          }
                        }}
                        className="w-full text-left block cursor-pointer focus:outline-none"
                      >
                        <span className="relative block">
                          <GameArtwork
                            gameId={game.id}
                            className="w-full h-24 object-cover rounded-2xl border-2 border-slate-950"
                          />
                          <span
                            className="absolute top-1.5 left-1.5 rounded-lg border-2 border-slate-950 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-sm"
                            style={{ backgroundColor: game.accentHex }}
                          >
                            {CATEGORY_LABELS[game.category]}
                          </span>
                          <span className="absolute top-1.5 right-1.5 rounded-lg bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-extrabold text-yellow-300">
                            {game.minPlayers}–{game.maxPlayers}P
                          </span>
                        </span>

                        <span
                          className={`block mt-2 text-sm sm:text-base font-display font-bold leading-tight truncate ${
                            isSelected ? 'text-slate-950' : 'text-white'
                          }`}
                        >
                          {game.title}
                        </span>
                        <span
                          className={`block mt-0.5 text-[11px] line-clamp-1 font-semibold ${
                            isSelected ? 'text-slate-800' : 'text-purple-200'
                          }`}
                        >
                          {game.tagline}
                        </span>
                      </button>

                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase ${
                            isSelected ? 'text-slate-900' : 'text-cyan-300'
                          }`}
                        >
                          {isSelected
                            ? 'Selected'
                            : game.supportsTeams
                            ? 'Teams & FFA'
                            : 'Free-For-All'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openGameSetup(game)}
                          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-extrabold border-2 border-slate-950 ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-yellow-400 text-slate-950'
                          }`}
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Play</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tournament Modes Strip */}
            <section className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-display font-bold text-cyan-300">
                  Tournaments & Championships
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('tournaments');
                  }}
                  className="text-xs font-extrabold text-yellow-300 hover:underline"
                >
                  View All Cups →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {TOURNAMENT_CARDS.map((card) => (
                  <button
                    key={card.mode}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTournamentBuilderMode(card.mode);
                    }}
                    className="rounded-2xl bg-indigo-950/90 arcade-btn p-3 text-left flex flex-col gap-2 hover:bg-purple-900"
                  >
                    <span
                      className="h-9 w-9 rounded-xl border-2 border-slate-950 flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: card.accent }}
                    >
                      {card.mode === 'red_vs_blue' ? (
                        <Swords className="h-4 w-4" />
                      ) : card.mode === 'survival_champ' ? (
                        <Flame className="h-4 w-4" />
                      ) : (
                        <Trophy className="h-4 w-4" />
                      )}
                    </span>
                    <span className="block">
                      <span className="block text-xs font-extrabold text-white leading-tight">
                        {card.title}
                      </span>
                      <span className="block mt-0.5 text-[10px] text-purple-200 line-clamp-2">
                        {card.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'tournaments' && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-yellow-300">
                  Tournament Arena
                </h1>
                <p className="text-xs text-purple-200 mt-1">
                  Pick a cup format, choose 5, 10, or 20 games, and battle for the NAIJA PARTY Trophy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setTournamentBuilderMode('party_cup');
                }}
                className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 arcade-btn whitespace-nowrap"
              >
                Create Cup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {TOURNAMENT_CARDS.map((card) => (
                <button
                  key={card.mode}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setTournamentBuilderMode(card.mode);
                  }}
                  className="rounded-3xl bg-indigo-950/90 arcade-btn p-4 text-left space-y-2 hover:bg-purple-900"
                >
                  <span
                    className="h-11 w-11 rounded-2xl border-2 border-slate-950 flex items-center justify-center text-white"
                    style={{ backgroundColor: card.accent }}
                  >
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="block text-base font-display font-bold text-yellow-300">
                    {card.title}
                  </span>
                  <span className="block text-xs text-purple-100 leading-relaxed">
                    {card.desc}
                  </span>
                  <span className="block pt-1 text-xs font-extrabold text-cyan-300">
                    Configure Cup →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'collection' && (
          <CollectionView saveData={saveData} onUpdateSave={handleUpdateSave} />
        )}

        {activeTab === 'records' && <RecordsView saveData={saveData} />}

        {activeTab === 'settings' && (
          <SettingsView saveData={saveData} onUpdateSave={handleUpdateSave} />
        )}
      </main>

          {/* Compact Mobile Bottom Tab Bar (for small screens) */}
          <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#3b0764]/95 backdrop-blur-md border-t-3 border-[#1a0536] grid grid-cols-5 items-center">
            {(
              [
                ['home', 'Play', Gamepad2],
                ['tournaments', 'Cups', Trophy],
                ['collection', 'Shop', ShoppingBag],
                ['records', 'Records', Award],
                ['settings', 'Settings', Settings],
              ] as const
            ).map(([tabId, label, Icon]) => {
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab(tabId);
                    if (tabId === 'home') setHomeView('games');
                  }}
                  className={`flex flex-col items-center justify-center h-full gap-0.5 ${
                    isActive ? 'text-yellow-300' : 'text-purple-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-extrabold">{label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Player & Match Setup Modal */}
      {setupGame && (
        <PlayerSetupModal
          game={setupGame}
          initialConfig={buildConfigForMode(setupGame, selectedMode)}
          saveData={saveData}
          onClose={() => setSetupGame(null)}
          onStart={handleStartMatch}
        />
      )}

      {/* Tournament Builder Modal */}
      {tournamentBuilderMode && (
        <TournamentBuilderModal
          initialMode={tournamentBuilderMode}
          saveData={saveData}
          onClose={() => setTournamentBuilderMode(null)}
          onStartTournament={handleStartTournament}
        />
      )}

      {/* Tournament Standings Between Games */}
      {tournament && showTournamentStandings && (
        <TournamentStandingsScreen
          tournament={tournament}
          onPlayNext={() => launchTournamentGame(tournament, tournament.currentIndex)}
          onQuit={() => {
            setShowTournamentStandings(false);
            setTournament(null);
          }}
        />
      )}
    </div>
  );
}
