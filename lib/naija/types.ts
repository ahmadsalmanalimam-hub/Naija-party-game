export type PlayerId = 1 | 2 | 3 | 4;

export type TeamId = 'red' | 'blue' | 'none';

export type PlayerColorKey = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' | 'pink';

export type CharacterId =
  | 'chidi'
  | 'amaka'
  | 'tunde'
  | 'zainab'
  | 'kola'
  | 'sade'
  | 'bola'
  | 'femi';

export type OutfitId = 'casual' | 'ankara' | 'danfo_vest' | 'jersey' | 'agbada' | 'royal_robe';

export type AccessoryId = 'none' | 'shades' | 'cap' | 'headphones' | 'whistle' | 'crown';

export type ArenaThemeId = 'lagos_plaza' | 'third_mainland' | 'festac_night' | 'abujaroyal' | 'beach_party';

export type AIDifficulty = 'easy' | 'normal' | 'pro';

export type MatchPresetMode =
  | '1p_ai'
  | '2p'
  | '3p'
  | '4p'
  | '1v1'
  | '1v2'
  | '1v3'
  | '2v2'
  | 'custom_teams';

export type RuleMode =
  | 'points'
  | 'elimination'
  | 'lives'
  | 'racing'
  | 'survival'
  | 'timed'
  | 'turn_based'
  | 'rounds';

export type TimerSecondsOption = 30 | 60 | 90 | 120 | 180 | 300 | 600 | 0; // 0 = Unlimited

export type GameCategory =
  | 'naija_originals'
  | 'racing'
  | 'battle'
  | 'sports'
  | 'board'
  | 'card_brain'
  | 'funny';

export interface PlayerSlot {
  id: PlayerId;
  active: boolean;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  name: string;
  color: PlayerColorKey;
  team: TeamId;
  character: CharacterId;
  outfit: OutfitId;
  accessory: AccessoryId;
}

export interface MatchConfig {
  gameId: string;
  presetMode: MatchPresetMode;
  players: PlayerSlot[];
  ruleMode: RuleMode;
  timerSeconds: TimerSecondsOption;
  turnTimerSeconds: 0 | 15 | 30; // optional turn timer for board games
  livesCount: number; // 1..5
  roundsTarget: 1 | 3 | 5; // Best of 1, 3, or 5
  teamScoring: boolean;
  arenaTheme: ArenaThemeId;
  allowSuddenDeath: boolean;
}

export interface PlayerStanding {
  playerId: PlayerId;
  name: string;
  color: PlayerColorKey;
  team: TeamId;
  character: CharacterId;
  outfit: OutfitId;
  accessory: AccessoryId;
  isAI: boolean;
  score: number;
  eliminated: boolean;
  rank: number; // 1 = winner
}

export interface MatchResult {
  gameId: string;
  winningPlayerIds: PlayerId[];
  winningTeam: TeamId | 'draw' | 'none';
  standings: PlayerStanding[];
  durationSeconds: number;
  isSuddenDeath?: boolean;
  summaryText: string;
}

export interface GameDefinition {
  id: string;
  title: string;
  category: GameCategory;
  secondaryCategory?: GameCategory;
  tagline: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  supportsTeams: boolean;
  supportsAI: boolean;
  supportedRules: RuleMode[];
  defaultRule: RuleMode;
  defaultTimer: TimerSecondsOption;
  forceNoGameTimer?: boolean; // e.g. Ludo, Ayo
  supportsTurnTimer?: boolean;
  landscapeRecommended: boolean;
  controlsSummary: string;
  tutorialSteps: string[];
  accentHex: string;
}

export type TournamentMode =
  | 'party_cup'
  | 'red_vs_blue'
  | 'survival_champ'
  | 'game_night'
  | 'custom'
  | 'random'
  | 'winner_stays';

export interface TournamentConfig {
  id: string;
  mode: TournamentMode;
  title: string;
  gameIds: string[];
  bestOf: 1 | 3 | 5;
  teamMode: boolean;
  players: PlayerSlot[];
  arenaTheme: ArenaThemeId;
}

export interface TournamentState {
  config: TournamentConfig;
  currentIndex: number;
  playerPoints: Record<PlayerId, number>;
  teamPoints: { red: number; blue: number };
  roundWins: Record<PlayerId, number>;
  championStreakId: PlayerId | null;
  championStreakCount: number;
  completedGames: Array<{
    gameId: string;
    winnerNames: string[];
    winningTeam: TeamId | 'draw' | 'none';
  }>;
  finished: boolean;
}

export interface PlayerProfileStats {
  name: string;
  matchesPlayed: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  tournamentsWon: number;
  favoriteCharacter: CharacterId;
}

export interface RivalryRecord {
  wins: number;
  losses: number;
}

export interface GameSettings {
  sfxEnabled: boolean;
  sfxVolume: number; // 0..1
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  touchScale: 'compact' | 'standard' | 'large';
  lowRamMode: boolean;
  preferredArena: ArenaThemeId;
}

export interface SaveData {
  version: number;
  coins: number;
  gems: number;
  totalMatches: number;
  totalTournaments: number;
  unlockedCharacters: CharacterId[];
  unlockedOutfits: OutfitId[];
  unlockedAccessories: AccessoryId[];
  unlockedArenas: ArenaThemeId[];
  unlockedAchievements: string[];
  playerPresets: PlayerSlot[];
  statsByName: Record<string, PlayerProfileStats>;
  rivalries: Record<string, RivalryRecord>; // key: "NameA__vs__NameB"
  settings: GameSettings;
}

export interface MiniGameProps {
  config: MatchConfig;
  isPaused: boolean;
  touchScale: 'compact' | 'standard' | 'large';
  lowRamMode: boolean;
  onScoreUpdate: (scores: Partial<Record<PlayerId, number>>, eliminated?: Partial<Record<PlayerId, boolean>>) => void;
  onFinish: (result: MatchResult) => void;
  timeRemaining: number;
  elapsedSeconds: number;
  isSuddenDeath: boolean;
}
