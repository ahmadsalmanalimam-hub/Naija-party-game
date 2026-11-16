'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Award, Check, Play, Trophy, Users, X } from 'lucide-react';
import { GAMES_CATALOG, PLAYER_COLORS } from '@/lib/naija/catalog';
import { createTournamentConfig } from '@/lib/naija/storage';
import { soundEngine } from '@/lib/naija/sound';
import {
  PlayerSlot,
  SaveData,
  TournamentConfig,
  TournamentMode,
  TournamentState,
} from '@/lib/naija/types';
import { CharacterAvatar } from '@/components/naija/CharacterAvatar';

interface TournamentBuilderModalProps {
  initialMode: TournamentMode;
  saveData: SaveData;
  onClose: () => void;
  onStartTournament: (config: TournamentConfig) => void;
}

const TOURNAMENT_MODES: Array<{ id: TournamentMode; label: string; desc: string }> = [
  { id: 'party_cup', label: 'Party Cup', desc: 'Mixed party rotation across top games' },
  { id: 'red_vs_blue', label: 'Red vs Blue', desc: 'Team points showdown (combine team scores)' },
  { id: 'survival_champ', label: 'Survival Champ', desc: 'Elimination & last-standing battles' },
  { id: 'game_night', label: 'Game Night', desc: 'All-genre marathon with friends & family' },
  { id: 'winner_stays', label: 'Winner Stays Champion', desc: 'Track reigning champion win streaks' },
  { id: 'random', label: 'Random Mode', desc: 'Surprise shuffle order every match' },
  { id: 'custom', label: 'Custom Cup', desc: 'Hand-pick your favorite mini-games' },
];

export function TournamentBuilderModal({
  initialMode,
  saveData,
  onClose,
  onStartTournament,
}: TournamentBuilderModalProps) {
  const [mode, setMode] = useState<TournamentMode>(initialMode);
  const [length, setLength] = useState<5 | 10 | 20>(5);
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [customGameIds, setCustomGameIds] = useState<string[]>([
    'danfo_rush',
    'bumper_cars',
    'jollof_master',
    'street_football',
    'fastest_finger',
  ]);
  const [players, setPlayers] = useState<PlayerSlot[]>(() =>
    saveData.playerPresets.map((p, idx) => ({
      ...p,
      active: idx < 2 ? true : p.active,
    }))
  );

  const activeCount = players.filter((p) => p.active).length;

  const togglePlayerActive = (id: number) => {
    soundEngine.playClick();
    const target = players.find((p) => p.id === id);
    if (!target) return;
    if (target.active && activeCount <= 2) return;
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const toggleCustomGame = (id: string) => {
    soundEngine.playClick();
    setCustomGameIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((g) => g !== id) : prev) : [...prev, id]
    );
  };

  const handleLaunch = () => {
    soundEngine.playCountdownGo();
    const cfg = createTournamentConfig(
      mode,
      length,
      bestOf,
      players,
      saveData.settings.preferredArena,
      customGameIds
    );
    onStartTournament(cfg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/85 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl bg-indigo-950 text-white arcade-card flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-purple-800/80 bg-purple-950/95 backdrop-blur px-4 sm:px-6 py-3.5">
          <div>
            <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              Multi-Game Championship
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-yellow-300">
              Tournament Setup
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white arcade-btn"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Mode Picker */}
          <div>
            <div className="text-xs font-extrabold text-purple-200 uppercase mb-2">
              Tournament Format
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {TOURNAMENT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setMode(m.id);
                  }}
                  className={`rounded-2xl p-3 text-left arcade-btn ${
                    mode === m.id
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-purple-900/90 text-white hover:bg-purple-800'
                  }`}
                >
                  <span className="block text-xs font-extrabold">{m.label}</span>
                  <span
                    className={`block text-[11px] mt-0.5 leading-snug ${
                      mode === m.id ? 'text-slate-800 font-semibold' : 'text-purple-200'
                    }`}
                  >
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Length & Best-of */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-extrabold text-purple-200 uppercase mb-2">
                Tournament Length
              </div>
              <div className="flex gap-2">
                {([5, 10, 20] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setLength(len);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold arcade-btn ${
                      length === len
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-purple-900 text-white'
                    }`}
                  >
                    {len} Games
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold text-purple-200 uppercase mb-2">
                Round Format
              </div>
              <div className="flex gap-2">
                {([1, 3, 5] as const).map((bo) => (
                  <button
                    key={bo}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setBestOf(bo);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold arcade-btn ${
                      bestOf === bo
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-purple-900 text-white'
                    }`}
                  >
                    {bo === 1 ? 'Single Round' : `Best of ${bo}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Games Selector */}
          {mode === 'custom' && (
            <div className="rounded-2xl bg-purple-900/60 border-2 border-purple-700/80 p-3.5">
              <div className="text-xs font-extrabold text-yellow-300 mb-2">
                Pick Games for Rotation ({customGameIds.length} selected)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GAMES_CATALOG.map((g) => {
                  const selected = customGameIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleCustomGame(g.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 ${
                        selected
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-purple-800 text-white'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {g.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Competitors */}
          <div>
            <div className="text-xs font-extrabold text-purple-200 uppercase mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-300" />
              Competitors ({activeCount} active)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl p-3 flex flex-col gap-2 arcade-card ${
                    p.active ? 'bg-purple-900/95' : 'bg-purple-950/50 opacity-55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-white truncate">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => togglePlayerActive(p.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border-2 border-slate-950 ${
                        p.active
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-purple-800 text-purple-200'
                      }`}
                    >
                      {p.active ? 'IN' : 'JOIN'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <CharacterAvatar
                      characterId={p.character}
                      outfitId={p.outfit}
                      accessoryId={p.accessory}
                      colorKey={p.color}
                      size={40}
                    />
                    <div className="flex flex-col gap-1 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setPlayers((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, isAI: !x.isAI } : x))
                          );
                        }}
                        className={`rounded-lg border-2 border-slate-950 px-2 py-0.5 text-[10px] font-extrabold ${
                          p.isAI
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-cyan-400 text-slate-950'
                        }`}
                      >
                        {p.isAI ? 'AI Bot' : 'Human'}
                      </button>
                      {mode === 'red_vs_blue' && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setPlayers((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, team: x.team === 'red' ? 'blue' : 'red' }
                                  : x
                              )
                            );
                          }}
                          className={`rounded-lg border-2 border-slate-950 px-2 py-0.5 text-[10px] font-extrabold text-white ${
                            p.team === 'red' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                        >
                          {p.team.toUpperCase()}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t-2 border-purple-800/80 bg-purple-950/95 backdrop-blur px-4 sm:px-6 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={handleLaunch}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-6 py-3 text-sm font-extrabold text-slate-950 arcade-btn"
          >
            <Trophy className="h-4 w-4" />
            <span>Start {length}-Game Championship</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface TournamentStandingsScreenProps {
  tournament: TournamentState;
  onPlayNext: () => void;
  onQuit: () => void;
}

export function TournamentStandingsScreen({
  tournament,
  onPlayNext,
  onQuit,
}: TournamentStandingsScreenProps) {
  const activePlayers = tournament.config.players.filter((p) => p.active);
  const sortedPlayers = [...activePlayers].sort(
    (a, b) => (tournament.playerPoints[b.id] || 0) - (tournament.playerPoints[a.id] || 0)
  );
  const nextGameDef = GAMES_CATALOG.find(
    (g) => g.id === tournament.config.gameIds[tournament.currentIndex]
  );

  const isTeam = tournament.config.teamMode;
  const winningTeamText =
    tournament.teamPoints.red > tournament.teamPoints.blue
      ? 'Red Team Champions!'
      : tournament.teamPoints.blue > tournament.teamPoints.red
      ? 'Blue Team Champions!'
      : 'Tied Championship!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/92 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-indigo-950 text-white p-5 sm:p-6 arcade-card my-auto">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="h-16 w-16 rounded-2xl overflow-hidden arcade-card relative shrink-0">
            <Image
              src="/images/trophy_cup.jpg"
              alt="Naija Party Trophy"
              fill
              sizes="64px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              {tournament.config.title} ·{' '}
              {tournament.finished
                ? 'Final Championship Podium'
                : `Completed ${tournament.currentIndex} of ${tournament.config.gameIds.length}`}
            </div>
            <h2 className="mt-0.5 text-2xl sm:text-3xl font-display font-bold text-yellow-300 truncate">
              {tournament.finished
                ? isTeam
                  ? winningTeamText
                  : `${sortedPlayers[0]?.name} is Champion!`
                : 'Current Cup Standings'}
            </h2>
          </div>
        </div>

        {isTeam && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-red-500 border-3 border-slate-950 p-3 text-center">
              <div className="text-xs font-extrabold text-red-100">RED TEAM</div>
              <div className="font-mono text-2xl font-extrabold text-white tabular-nums">
                {tournament.teamPoints.red}
              </div>
            </div>
            <div className="rounded-2xl bg-blue-500 border-3 border-slate-950 p-3 text-center">
              <div className="text-xs font-extrabold text-blue-100">BLUE TEAM</div>
              <div className="font-mono text-2xl font-extrabold text-white tabular-nums">
                {tournament.teamPoints.blue}
              </div>
            </div>
          </div>
        )}

        {tournament.config.mode === 'winner_stays' && tournament.championStreakId && (
          <div className="mt-3 rounded-xl bg-amber-400 border-2 border-slate-950 px-3 py-2 text-center text-xs font-extrabold text-slate-950">
            Reigning King:{' '}
            {activePlayers.find((p) => p.id === tournament.championStreakId)?.name} (
            {tournament.championStreakCount} win streak)
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sortedPlayers.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-2xl border-2 border-slate-950 p-3 ${
                idx === 0 ? 'bg-yellow-400 text-slate-950' : 'bg-purple-900/90 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-6 text-center font-mono text-sm font-extrabold shrink-0 ${
                    idx === 0 ? 'text-slate-950' : 'text-yellow-300'
                  }`}
                >
                  #{idx + 1}
                </span>
                <CharacterAvatar
                  characterId={p.character}
                  outfitId={p.outfit}
                  accessoryId={p.accessory}
                  colorKey={p.color}
                  mood={idx === 0 ? 'victory' : 'happy'}
                  size={42}
                />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">{p.name}</div>
                  <div
                    className="text-[11px] font-bold"
                    style={{
                      color: idx === 0 ? '#0F172A' : PLAYER_COLORS[p.color].hex,
                    }}
                  >
                    {isTeam
                      ? `${p.team.toUpperCase()} Team`
                      : p.isAI
                      ? 'AI Challenger'
                      : 'Player'}
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-extrabold tabular-nums shrink-0">
                {tournament.playerPoints[p.id] || 0} pts
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          {!tournament.finished && nextGameDef ? (
            <button
              type="button"
              onClick={onPlayNext}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 px-5 text-sm font-extrabold text-slate-950 arcade-btn"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Up Next: {nextGameDef.title}</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 border-3 border-slate-950 py-3.5 px-5 text-sm font-extrabold text-slate-950">
              <Award className="h-5 w-5" />
              <span>Cup Complete!</span>
            </div>
          )}

          <button
            type="button"
            onClick={onQuit}
            className="rounded-2xl bg-purple-800 py-3.5 px-5 text-sm font-extrabold text-white arcade-btn"
          >
            {tournament.finished ? 'Finish & Return' : 'Exit Cup'}
          </button>
        </div>
      </div>
    </div>
  );
}
