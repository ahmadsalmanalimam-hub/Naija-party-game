'use client';

import React from 'react';
import { Award, Flame, Swords, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '@/lib/naija/catalog';
import { SaveData } from '@/lib/naija/types';

export function RecordsView({ saveData }: { saveData: SaveData }) {
  const players = Object.values(saveData.statsByName).sort((a, b) => b.wins - a.wins);
  const rivalryEntries = Object.entries(saveData.rivalries);

  return (
    <div className="space-y-5">
      {/* Top Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-4">
          <div className="text-xs font-bold text-cyan-300">Total Matches</div>
          <div className="mt-1 font-mono text-3xl font-extrabold text-white tabular-nums">
            {saveData.totalMatches}
          </div>
        </div>
        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-4">
          <div className="text-xs font-bold text-cyan-300">Tournaments</div>
          <div className="mt-1 font-mono text-3xl font-extrabold text-white tabular-nums">
            {saveData.totalTournaments}
          </div>
        </div>
        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-4">
          <div className="text-xs font-bold text-cyan-300">Achievements</div>
          <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-400 tabular-nums">
            {saveData.unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </div>
        </div>
        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-4">
          <div className="text-xs font-bold text-cyan-300">Coins / Gems</div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-yellow-300 tabular-nums">
            {saveData.coins}c · {saveData.gems ?? 15}g
          </div>
        </div>
      </div>

      {/* Player Leaderboard & Win Streaks */}
      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5">
        <h3 className="text-lg font-display font-bold text-yellow-300 flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Local Player Records & Win Streaks
        </h3>
        {players.length === 0 ? (
          <p className="text-sm text-purple-200 py-3">
            No matches played yet. Finish a game to record wins, streaks, and rivalries!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-purple-800 text-xs font-extrabold text-cyan-300">
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 px-3">Matches</th>
                  <th className="py-2 px-3">Wins</th>
                  <th className="py-2 px-3">Win Rate</th>
                  <th className="py-2 pl-3">Best Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900">
                {players.map((p) => {
                  const rate = p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) : 0;
                  return (
                    <tr key={p.name}>
                      <td className="py-2.5 pr-4 font-extrabold text-white">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-purple-100">
                        {p.matchesPlayed}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums font-extrabold text-emerald-400">
                        {p.wins}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-purple-100">{rate}%</td>
                      <td className="py-2.5 pl-3 font-mono tabular-nums text-yellow-300 font-extrabold">
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" />
                          {p.bestStreak}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Personal Rivalry Records */}
      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5">
        <h3 className="text-lg font-display font-bold text-yellow-300 flex items-center gap-2 mb-3">
          <Swords className="h-5 w-5 text-red-400" />
          Personal Rivalry Records
        </h3>
        {rivalryEntries.length === 0 ? (
          <p className="text-sm text-purple-200 py-2">
            Play head-to-head matches with named players to build your rivalry record.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {rivalryEntries.slice(0, 12).map(([key, rec]) => {
              const [a, b] = key.split('__vs__');
              return (
                <div
                  key={key}
                  className="rounded-2xl border-2 border-slate-950 bg-purple-900/90 px-3.5 py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-extrabold text-white truncate">
                    {a} vs {b}
                  </span>
                  <span className="font-mono font-extrabold text-yellow-300 tabular-nums shrink-0 ml-2">
                    {rec.wins}W – {rec.losses}L
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trophies & Achievements */}
      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5">
        <h3 className="text-lg font-display font-bold text-yellow-300 flex items-center gap-2 mb-3">
          <Award className="h-5 w-5 text-emerald-400" />
          Trophies & Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const done = saveData.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-2xl border-2 border-slate-950 p-3.5 flex items-center justify-between gap-3 ${
                  done ? 'bg-emerald-500 text-slate-950' : 'bg-purple-900/80 text-white opacity-80'
                }`}
              >
                <div>
                  <div className="text-sm font-extrabold">{ach.title}</div>
                  <div className={`text-xs ${done ? 'text-slate-900 font-semibold' : 'text-purple-200'}`}>
                    {ach.description}
                  </div>
                </div>
                <div className="text-right shrink-0 text-xs font-extrabold">
                  {done ? 'Unlocked' : `+${ach.rewardCoins}c`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
