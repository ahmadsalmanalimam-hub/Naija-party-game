import { ACHIEVEMENTS, DEFAULT_PLAYERS, GAMES_CATALOG } from './catalog';
import {
  AccessoryId,
  ArenaThemeId,
  CharacterId,
  MatchConfig,
  MatchPresetMode,
  MatchResult,
  OutfitId,
  PlayerSlot,
  SaveData,
  TournamentConfig,
  TournamentMode,
} from './types';

const STORAGE_KEY = 'naija_party_save_v1';

export function getDefaultSaveData(): SaveData {
  return {
    version: 1,
    coins: 100,
    gems: 15,
    totalMatches: 0,
    totalTournaments: 0,
    unlockedCharacters: ['chidi', 'amaka', 'tunde', 'zainab'],
    unlockedOutfits: ['casual', 'jersey'],
    unlockedAccessories: ['none'],
    unlockedArenas: ['lagos_plaza', 'third_mainland'],
    unlockedAchievements: [],
    playerPresets: DEFAULT_PLAYERS.map((p) => ({ ...p })),
    statsByName: {},
    rivalries: {},
    settings: {
      sfxEnabled: true,
      sfxVolume: 0.75,
      musicEnabled: false,
      vibrationEnabled: true,
      touchScale: 'standard',
      lowRamMode: false,
      preferredArena: 'lagos_plaza',
    },
  };
}

export function loadSaveData(): SaveData {
  if (typeof window === 'undefined') return getDefaultSaveData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = getDefaultSaveData();
    return {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
      },
      playerPresets:
        Array.isArray(parsed.playerPresets) && parsed.playerPresets.length === 4
          ? parsed.playerPresets
          : defaults.playerPresets,
      unlockedCharacters: Array.isArray(parsed.unlockedCharacters)
        ? parsed.unlockedCharacters
        : defaults.unlockedCharacters,
      unlockedOutfits: Array.isArray(parsed.unlockedOutfits)
        ? parsed.unlockedOutfits
        : defaults.unlockedOutfits,
      unlockedAccessories: Array.isArray(parsed.unlockedAccessories)
        ? parsed.unlockedAccessories
        : defaults.unlockedAccessories,
      unlockedArenas: Array.isArray(parsed.unlockedArenas)
        ? parsed.unlockedArenas
        : defaults.unlockedArenas,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
      statsByName: parsed.statsByName || {},
      rivalries: parsed.rivalries || {},
    };
  } catch {
    return getDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(): SaveData {
  const fresh = getDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}

export function applyPresetToPlayers(base: PlayerSlot[], mode: MatchPresetMode): PlayerSlot[] {
  const players = base.map((p) => ({ ...p }));
  if (mode === '1p_ai') {
    players[0].active = true;
    players[0].isAI = false;
    players[0].team = 'red';
    players[1].active = true;
    players[1].isAI = true;
    players[1].team = 'blue';
    players[2].active = true;
    players[2].isAI = true;
    players[2].team = 'red';
    players[3].active = true;
    players[3].isAI = true;
    players[3].team = 'blue';
  } else if (mode === '2p' || mode === '1v1') {
    players[0].active = true;
    players[0].isAI = false;
    players[0].team = 'red';
    players[1].active = true;
    players[1].isAI = false;
    players[1].team = 'blue';
    players[2].active = false;
    players[3].active = false;
  } else if (mode === '3p') {
    players[0].active = true;
    players[0].isAI = false;
    players[0].team = 'red';
    players[1].active = true;
    players[1].isAI = false;
    players[1].team = 'blue';
    players[2].active = true;
    players[2].isAI = false;
    players[2].team = 'red';
    players[3].active = false;
  } else if (mode === '4p') {
    players.forEach((p, idx) => {
      p.active = true;
      p.isAI = false;
      p.team = idx % 2 === 0 ? 'red' : 'blue';
    });
  } else if (mode === '1v2') {
    players[0].active = true;
    players[0].isAI = false;
    players[0].team = 'red';
    players[1].active = true;
    players[1].isAI = false;
    players[1].team = 'blue';
    players[2].active = true;
    players[2].isAI = false;
    players[2].team = 'blue';
    players[3].active = false;
  } else if (mode === '1v3') {
    players[0].active = true;
    players[0].isAI = false;
    players[0].team = 'red';
    [1, 2, 3].forEach((i) => {
      players[i].active = true;
      players[i].team = 'blue';
    });
  } else if (mode === '2v2') {
    players.forEach((p, idx) => {
      p.active = true;
      p.team = idx < 2 ? 'red' : 'blue';
    });
  }
  return players;
}

export function buildDefaultMatchConfig(gameId: string, save: SaveData): MatchConfig {
  const game = GAMES_CATALOG.find((g) => g.id === gameId) || GAMES_CATALOG[0];
  const players = save.playerPresets.map((p) => ({ ...p }));
  const activeCount = players.filter((p) => p.active).length;
  if (activeCount < game.minPlayers) {
    for (let i = 0; i < game.minPlayers; i++) {
      players[i].active = true;
    }
  }
  return {
    gameId: game.id,
    presetMode: activeCount === 2 ? '2p' : activeCount === 3 ? '3p' : activeCount === 4 ? '4p' : '1p_ai',
    players,
    ruleMode: game.defaultRule,
    timerSeconds: game.forceNoGameTimer ? 0 : game.defaultTimer,
    turnTimerSeconds: game.supportsTurnTimer ? 0 : 0,
    livesCount: 3,
    roundsTarget: 3,
    teamScoring: false,
    arenaTheme: save.settings.preferredArena,
    allowSuddenDeath: true,
  };
}

export function recordMatchCompletion(
  currentSave: SaveData,
  config: MatchConfig,
  result: MatchResult,
  isTournamentComplete = false
): { updatedSave: SaveData; newlyUnlockedAchievements: string[]; coinsEarned: number; gemsEarned: number } {
  const next: SaveData = {
    ...currentSave,
    totalMatches: currentSave.totalMatches + 1,
    totalTournaments: currentSave.totalTournaments + (isTournamentComplete ? 1 : 0),
    statsByName: { ...currentSave.statsByName },
    rivalries: { ...currentSave.rivalries },
    unlockedAchievements: [...currentSave.unlockedAchievements],
  };

  let coinsEarned = 35 + result.standings.length * 10;
  let gemsEarned = isTournamentComplete ? 5 : 2;

  // Update per-player stats
  result.standings.forEach((s) => {
    const key = s.name.trim() || `Player ${s.playerId}`;
    const prev = next.statsByName[key] || {
      name: key,
      matchesPlayed: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      tournamentsWon: 0,
      favoriteCharacter: s.character,
    };
    const won = result.winningPlayerIds.includes(s.playerId);
    const streak = won ? prev.currentStreak + 1 : 0;
    next.statsByName[key] = {
      ...prev,
      matchesPlayed: prev.matchesPlayed + 1,
      wins: prev.wins + (won ? 1 : 0),
      currentStreak: streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      favoriteCharacter: s.character,
    };
  });

  // Update rivalries between winners and non-winners
  const winners = result.standings.filter((s) => result.winningPlayerIds.includes(s.playerId));
  const losers = result.standings.filter((s) => !result.winningPlayerIds.includes(s.playerId));
  winners.forEach((w) => {
    losers.forEach((l) => {
      const wName = w.name.trim() || `Player ${w.playerId}`;
      const lName = l.name.trim() || `Player ${l.playerId}`;
      if (wName === lName) return;
      const winKey = `${wName}__vs__${lName}`;
      const loseKey = `${lName}__vs__${wName}`;
      const prevW = next.rivalries[winKey] || { wins: 0, losses: 0 };
      const prevL = next.rivalries[loseKey] || { wins: 0, losses: 0 };
      next.rivalries[winKey] = { wins: prevW.wins + 1, losses: prevW.losses };
      next.rivalries[loseKey] = { wins: prevL.wins, losses: prevL.losses + 1 };
    });
  });

  // Check achievements
  const newlyUnlockedAchievements: string[] = [];
  const tryUnlock = (id: string) => {
    if (!next.unlockedAchievements.includes(id)) {
      next.unlockedAchievements.push(id);
      newlyUnlockedAchievements.push(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) coinsEarned += def.rewardCoins;
    }
  };

  tryUnlock('first_party');
  if (result.standings.length === 4) tryUnlock('four_squad');
  if (config.teamScoring && (result.winningTeam === 'red' || result.winningTeam === 'blue')) {
    tryUnlock('red_blue_champ');
  }
  if (Object.values(next.statsByName).some((st) => st.bestStreak >= 3)) tryUnlock('streak_3');
  if (result.gameId === 'danfo_rush') tryUnlock('danfo_king');
  if (result.gameId === 'jollof_master') tryUnlock('jollof_chef');
  if (result.gameId === 'ludo') tryUnlock('ludo_master');
  if (result.gameId === 'ayo') tryUnlock('ayo_sage');
  if (isTournamentComplete) tryUnlock('cup_winner');
  if (next.totalMatches >= 10) tryUnlock('marathon_10');

  if (newlyUnlockedAchievements.length > 0) {
    gemsEarned += newlyUnlockedAchievements.length * 2;
  }

  next.coins += coinsEarned;
  next.gems = (next.gems ?? 15) + gemsEarned;
  persistSaveData(next);

  return { updatedSave: next, newlyUnlockedAchievements, coinsEarned, gemsEarned };
}

export function unlockItem(
  save: SaveData,
  type: 'character' | 'outfit' | 'accessory' | 'arena',
  id: string,
  cost: number,
  currency: 'coins' | 'gems' = 'coins'
): SaveData | null {
  if (currency === 'gems') {
    if ((save.gems ?? 0) < cost) return null;
  } else if (save.coins < cost) {
    return null;
  }
  const next: SaveData = {
    ...save,
    coins: currency === 'coins' ? save.coins - cost : save.coins,
    gems: currency === 'gems' ? (save.gems ?? 0) - cost : (save.gems ?? 15),
  };
  if (type === 'character') {
    const cid = id as CharacterId;
    if (next.unlockedCharacters.includes(cid)) return save;
    next.unlockedCharacters = [...next.unlockedCharacters, cid];
  } else if (type === 'outfit') {
    const oid = id as OutfitId;
    if (next.unlockedOutfits.includes(oid)) return save;
    next.unlockedOutfits = [...next.unlockedOutfits, oid];
  } else if (type === 'accessory') {
    const aid = id as AccessoryId;
    if (next.unlockedAccessories.includes(aid)) return save;
    next.unlockedAccessories = [...next.unlockedAccessories, aid];
  } else if (type === 'arena') {
    const arid = id as ArenaThemeId;
    if (next.unlockedArenas.includes(arid)) return save;
    next.unlockedArenas = [...next.unlockedArenas, arid];
  }
  persistSaveData(next);
  return next;
}

export function buildTournamentGameList(
  mode: TournamentMode,
  length: 5 | 10 | 20,
  customIds?: string[]
): string[] {
  const allIds = GAMES_CATALOG.map((g) => g.id);
  let pool = [...allIds];

  if (mode === 'survival_champ') {
    pool = [
      'bumper_cars',
      'rising_lava',
      'sumo_battle',
      'battle_tank',
      'king_of_hill',
      'hot_potato',
      'lagos_crossing',
      'danfo_rush',
      'boat_race',
    ];
  } else if (mode === 'red_vs_blue') {
    pool = [
      'street_football',
      'air_hockey',
      'penalty_shootout',
      'basketball',
      'tug_of_war',
      'bumper_cars',
      'battle_tank',
      'rising_lava',
      'jollof_master',
      'suya_chef',
      'quick_quiz',
      'math_battle',
      'sumo_battle',
    ];
  } else if (mode === 'custom' && customIds && customIds.length > 0) {
    pool = customIds;
  }

  const list: string[] = [];
  for (let i = 0; i < length; i++) {
    if (mode === 'random' || mode === 'party_cup' || mode === 'game_night') {
      const idx = (i * 5 + Math.floor(Math.random() * pool.length)) % pool.length;
      list.push(pool[idx]);
    } else {
      list.push(pool[i % pool.length]);
    }
  }
  return list;
}

export function createTournamentConfig(
  mode: TournamentMode,
  length: 5 | 10 | 20,
  bestOf: 1 | 3 | 5,
  players: PlayerSlot[],
  arenaTheme: ArenaThemeId,
  customIds?: string[]
): TournamentConfig {
  const titles: Record<TournamentMode, string> = {
    party_cup: 'Party Championship Cup',
    red_vs_blue: 'Red vs Blue Championship',
    survival_champ: 'Survival Championship',
    game_night: 'Naija Game Night',
    custom: 'Custom Tournament',
    random: 'Random Shuffle Cup',
    winner_stays: 'Winner Stays Champion',
  };

  return {
    id: `t_${mode}_${length}_${bestOf}`,
    mode,
    title: titles[mode],
    gameIds: buildTournamentGameList(mode, length, customIds),
    bestOf,
    teamMode: mode === 'red_vs_blue',
    players: players.map((p) => ({ ...p })),
    arenaTheme,
  };
}
