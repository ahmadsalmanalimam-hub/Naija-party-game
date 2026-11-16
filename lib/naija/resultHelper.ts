import { MatchConfig, MatchResult, PlayerId, PlayerSlot, PlayerStanding, TeamId } from './types';

export function buildMatchResult(
  config: MatchConfig,
  scores: Partial<Record<PlayerId, number>>,
  eliminatedMap: Partial<Record<PlayerId, boolean>>,
  durationSeconds: number,
  options?: {
    isSuddenDeath?: boolean;
    summaryOverride?: string;
    winnerOverride?: PlayerId[];
  }
): MatchResult {
  const activePlayers: PlayerSlot[] = config.players.filter((p) => p.active);

  const sorted = [...activePlayers].sort((a, b) => {
    const aElim = !!eliminatedMap[a.id];
    const bElim = !!eliminatedMap[b.id];
    if (config.ruleMode === 'elimination' || config.ruleMode === 'survival') {
      if (aElim !== bElim) return aElim ? 1 : -1;
    }
    return (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
  });

  const standings: PlayerStanding[] = sorted.map((p, idx) => ({
    playerId: p.id,
    name: p.name,
    color: p.color,
    team: p.team,
    character: p.character,
    outfit: p.outfit,
    accessory: p.accessory,
    isAI: p.isAI,
    score: Math.round(scores[p.id] ?? 0),
    eliminated: !!eliminatedMap[p.id],
    rank: idx + 1,
  }));

  let winningTeam: TeamId | 'draw' | 'none' = 'none';
  let winningPlayerIds: PlayerId[] = [];

  if (options?.winnerOverride && options.winnerOverride.length > 0) {
    winningPlayerIds = options.winnerOverride;
  } else if (config.teamScoring) {
    const redPlayers = standings.filter((s) => s.team === 'red');
    const bluePlayers = standings.filter((s) => s.team === 'blue');

    if (config.ruleMode === 'elimination' || config.ruleMode === 'survival') {
      const redAlive = redPlayers.some((p) => !p.eliminated);
      const blueAlive = bluePlayers.some((p) => !p.eliminated);
      if (redAlive && !blueAlive) winningTeam = 'red';
      else if (blueAlive && !redAlive) winningTeam = 'blue';
      else {
        const redSum = redPlayers.reduce((acc, s) => acc + s.score, 0);
        const blueSum = bluePlayers.reduce((acc, s) => acc + s.score, 0);
        winningTeam = redSum > blueSum ? 'red' : blueSum > redSum ? 'blue' : 'draw';
      }
    } else {
      const redSum = redPlayers.reduce((acc, s) => acc + s.score, 0);
      const blueSum = bluePlayers.reduce((acc, s) => acc + s.score, 0);
      winningTeam = redSum > blueSum ? 'red' : blueSum > redSum ? 'blue' : 'draw';
    }

    if (winningTeam === 'red') {
      winningPlayerIds = redPlayers.map((p) => p.playerId);
    } else if (winningTeam === 'blue') {
      winningPlayerIds = bluePlayers.map((p) => p.playerId);
    } else {
      winningPlayerIds = standings.map((p) => p.playerId);
    }
  } else {
    const top = standings[0];
    if (top) {
      winningPlayerIds = standings
        .filter((s) => s.score === top.score && s.eliminated === top.eliminated)
        .map((s) => s.playerId);
    }
  }

  const summaryText =
    options?.summaryOverride ||
    (config.teamScoring
      ? winningTeam === 'draw'
        ? 'Draw Match!'
        : `${winningTeam === 'red' ? 'Red Team' : 'Blue Team'} Wins!`
      : winningPlayerIds.length > 1
      ? 'Shared Victory!'
      : `${standings[0]?.name || 'Player 1'} Wins!`);

  return {
    gameId: config.gameId,
    winningPlayerIds,
    winningTeam,
    standings,
    durationSeconds,
    isSuddenDeath: options?.isSuddenDeath,
    summaryText,
  };
}
