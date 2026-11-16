'use client';

import React, { useState } from 'react';
import { Bot, Check, Play, Shield, Timer, Trophy, User, Users, X } from 'lucide-react';
import {
  ACCESSORIES,
  ARENA_THEMES,
  CHARACTERS,
  OUTFITS,
  PLAYER_COLORS,
  TIMER_OPTIONS,
} from '@/lib/naija/catalog';
import { applyPresetToPlayers } from '@/lib/naija/storage';
import { soundEngine } from '@/lib/naija/sound';
import {
  AIDifficulty,
  GameDefinition,
  MatchConfig,
  MatchPresetMode,
  PlayerColorKey,
  PlayerId,
  PlayerSlot,
  RuleMode,
  SaveData,
} from '@/lib/naija/types';
import { CharacterAvatar } from './CharacterAvatar';

interface PlayerSetupModalProps {
  game: GameDefinition;
  initialConfig: MatchConfig;
  saveData: SaveData;
  onClose: () => void;
  onStart: (config: MatchConfig) => void;
}

const RULE_LABELS: Record<RuleMode, string> = {
  points: 'Points',
  elimination: 'Elimination',
  lives: 'Lives',
  racing: 'Race Finish',
  survival: 'Last Standing',
  timed: 'Timed Challenge',
  turn_based: 'Turn-Based',
  rounds: 'Best of Rounds',
};

const PRESET_BUTTONS: Array<{ id: MatchPresetMode; label: string; team: boolean }> = [
  { id: '1p_ai', label: '1P vs AI', team: false },
  { id: '2p', label: '2 Players', team: false },
  { id: '3p', label: '3 Players', team: false },
  { id: '4p', label: '4 Players', team: false },
  { id: '1v1', label: '1 vs 1', team: true },
  { id: '1v2', label: '1 vs 2', team: true },
  { id: '1v3', label: '1 vs 3', team: true },
  { id: '2v2', label: '2 vs 2', team: true },
];

export function PlayerSetupModal({
  game,
  initialConfig,
  saveData,
  onClose,
  onStart,
}: PlayerSetupModalProps) {
  const [config, setConfig] = useState<MatchConfig>(initialConfig);
  const [editingSlotId, setEditingSlotId] = useState<PlayerId | null>(null);

  const activePlayers = config.players.filter((p) => p.active);
  const canStart = activePlayers.length >= game.minPlayers && activePlayers.length <= game.maxPlayers;

  const handlePreset = (preset: MatchPresetMode, isTeam: boolean) => {
    soundEngine.playClick();
    let updated = applyPresetToPlayers(config.players, preset);
    if (game.maxPlayers === 2) {
      updated = updated.map((p, idx) => ({ ...p, active: idx < 2 }));
    }
    setConfig((prev) => ({
      ...prev,
      presetMode: preset,
      players: updated,
      teamScoring: game.supportsTeams ? isTeam : false,
    }));
  };

  const updateSlot = (id: PlayerId, patch: Partial<PlayerSlot>) => {
    setConfig((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const toggleSlotActive = (id: PlayerId) => {
    soundEngine.playClick();
    const target = config.players.find((p) => p.id === id);
    if (!target) return;
    if (target.active && activePlayers.length <= game.minPlayers) return;
    if (!target.active && activePlayers.length >= game.maxPlayers) return;
    updateSlot(id, { active: !target.active });
  };

  const editingSlot = config.players.find((p) => p.id === editingSlotId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/85 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl bg-indigo-950 text-white arcade-card flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b-2 border-purple-800/80 bg-purple-950/95 backdrop-blur px-4 sm:px-6 py-3.5">
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              Match Setup · {game.minPlayers}–{game.maxPlayers} Players
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-yellow-300 truncate">
              {game.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white arcade-btn shrink-0"
            aria-label="Close setup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Quick Mode Presets */}
          <div className="rounded-2xl bg-purple-900/60 border-2 border-purple-700/80 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-sm font-extrabold text-yellow-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-300" />
                Player & Team Mode
              </span>
              {game.supportsTeams && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConfig((prev) => ({
                      ...prev,
                      presetMode: 'custom_teams',
                      teamScoring: !prev.teamScoring,
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold arcade-btn whitespace-nowrap ${
                    config.teamScoring
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-purple-800 text-purple-100'
                  }`}
                >
                  {config.teamScoring ? 'Red vs Blue Teams: ON' : 'Free-For-All Mode'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_BUTTONS.filter((b) => {
                if (
                  game.maxPlayers === 2 &&
                  (b.id === '3p' ||
                    b.id === '4p' ||
                    b.id === '1v2' ||
                    b.id === '1v3' ||
                    b.id === '2v2')
                ) {
                  return false;
                }
                if (!game.supportsTeams && b.team) return false;
                if (!game.supportsAI && b.id === '1p_ai') return false;
                return true;
              }).map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handlePreset(btn.id, btn.team)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold arcade-btn whitespace-nowrap shrink-0 ${
                    config.presetMode === btn.id
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-purple-800/90 text-white hover:bg-purple-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Player Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {config.players.map((slot) => {
              const pCol = PLAYER_COLORS[slot.color];
              const isOverMax = slot.id > game.maxPlayers;
              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl p-3 transition-all arcade-card ${
                    slot.active
                      ? 'bg-purple-900/95'
                      : 'bg-purple-950/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-950"
                        style={{ backgroundColor: pCol.hex }}
                      />
                      Slot {slot.id}
                    </span>
                    <button
                      type="button"
                      disabled={isOverMax}
                      onClick={() => toggleSlotActive(slot.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border-2 border-slate-950 min-h-[30px] whitespace-nowrap ${
                        isOverMax
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : slot.active
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-purple-800 text-purple-200'
                      }`}
                    >
                      {isOverMax ? '2P Max' : slot.active ? 'Active' : 'Join'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEditingSlotId(slot.id);
                      }}
                      className="relative shrink-0 rounded-full hover:scale-105 transition-transform"
                      title="Customize Character"
                    >
                      <CharacterAvatar
                        characterId={slot.character}
                        outfitId={slot.outfit}
                        accessoryId={slot.accessory}
                        colorKey={slot.color}
                        size={52}
                      />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        type="text"
                        maxLength={14}
                        value={slot.name}
                        onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                        className="w-full rounded-xl border-2 border-slate-950 bg-indigo-950 px-2.5 py-1 text-sm font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder={`Player ${slot.id}`}
                      />

                      <div className="flex items-center gap-1.5">
                        {game.supportsAI && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              updateSlot(slot.id, { isAI: !slot.isAI });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 px-2 text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap ${
                              slot.isAI
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-cyan-400 text-slate-950'
                            }`}
                          >
                            {slot.isAI ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : (
                              <User className="h-3.5 w-3.5" />
                            )}
                            {slot.isAI ? 'AI Bot' : 'Human'}
                          </button>
                        )}

                        {config.teamScoring && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              updateSlot(slot.id, {
                                team: slot.team === 'red' ? 'blue' : 'red',
                              });
                            }}
                            className={`rounded-lg py-1 px-2.5 text-xs font-extrabold text-white border-2 border-slate-950 whitespace-nowrap ${
                              slot.team === 'red' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                          >
                            {slot.team === 'red' ? 'RED' : 'BLUE'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {slot.active && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setEditingSlotId(slot.id);
                      }}
                      className="mt-2.5 w-full rounded-xl bg-purple-800 border-2 border-slate-950 py-1.5 text-xs font-extrabold text-cyan-200 hover:bg-purple-700"
                    >
                      Customize Look & Color
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline Character Customizer Drawer */}
          {editingSlot && (
            <div className="rounded-2xl bg-purple-900/95 arcade-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-yellow-300">
                  Customizing {editingSlot.name || `Player ${editingSlot.id}`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setEditingSlotId(null);
                  }}
                  className="rounded-xl bg-emerald-400 px-3 py-1 text-xs font-extrabold text-slate-950 arcade-btn"
                >
                  Done
                </button>
              </div>

              {/* Colors */}
              <div>
                <div className="text-xs font-bold text-purple-200 mb-1.5">Player Color</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PLAYER_COLORS) as PlayerColorKey[]).map((ck) => (
                    <button
                      key={ck}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        updateSlot(editingSlot.id, { color: ck });
                      }}
                      className={`h-9 w-9 rounded-full border-3 flex items-center justify-center transition-transform ${
                        editingSlot.color === ck
                          ? 'border-yellow-300 scale-110'
                          : 'border-slate-950'
                      }`}
                      style={{ backgroundColor: PLAYER_COLORS[ck].hex }}
                      aria-label={PLAYER_COLORS[ck].label}
                    >
                      {editingSlot.color === ck && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Characters */}
              <div>
                <div className="text-xs font-bold text-purple-200 mb-1.5">Character</div>
                <div className="flex flex-wrap gap-2">
                  {CHARACTERS.map((c) => {
                    const unlocked = saveData.unlockedCharacters.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          soundEngine.playClick();
                          updateSlot(editingSlot.id, { character: c.id });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap ${
                          editingSlot.character === c.id
                            ? 'bg-yellow-400 text-slate-950'
                            : unlocked
                            ? 'bg-purple-800 text-white hover:bg-purple-700'
                            : 'bg-purple-950/60 text-purple-400 cursor-not-allowed'
                        }`}
                      >
                        {c.name} {!unlocked ? '(Locked)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outfits & Accessories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-purple-200 mb-1.5">Outfit</div>
                  <div className="flex flex-wrap gap-1.5">
                    {OUTFITS.map((o) => {
                      const unlocked = saveData.unlockedOutfits.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            soundEngine.playClick();
                            updateSlot(editingSlot.id, { outfit: o.id });
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 border-slate-950 ${
                            editingSlot.outfit === o.id
                              ? 'bg-cyan-400 text-slate-950'
                              : unlocked
                              ? 'bg-purple-800 text-white'
                              : 'bg-purple-950/60 text-purple-400'
                          }`}
                        >
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-purple-200 mb-1.5">Accessory</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCESSORIES.map((a) => {
                      const unlocked = saveData.unlockedAccessories.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            soundEngine.playClick();
                            updateSlot(editingSlot.id, { accessory: a.id });
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 border-slate-950 ${
                            editingSlot.accessory === a.id
                              ? 'bg-cyan-400 text-slate-950'
                              : unlocked
                              ? 'bg-purple-800 text-white'
                              : 'bg-purple-950/60 text-purple-400'
                          }`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {editingSlot.isAI && (
                <div>
                  <div className="text-xs font-bold text-purple-200 mb-1.5">AI Difficulty</div>
                  <div className="flex gap-2">
                    {(['easy', 'normal', 'pro'] as AIDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          updateSlot(editingSlot.id, { aiDifficulty: diff });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize border-2 border-slate-950 ${
                          editingSlot.aiDifficulty === diff
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-purple-800 text-white'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rules, Timer & Arena Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t-2 border-purple-800/80 pt-4">
            {/* Rules */}
            <div>
              <div className="text-xs font-extrabold text-yellow-300 mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                Game Rule System
              </div>
              <div className="flex flex-wrap gap-1.5">
                {game.supportedRules.map((rule) => (
                  <button
                    key={rule}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setConfig((prev) => ({ ...prev, ruleMode: rule }));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap ${
                      config.ruleMode === rule
                        ? 'bg-yellow-400 text-slate-950'
                        : 'bg-purple-800 text-white hover:bg-purple-700'
                    }`}
                  >
                    {RULE_LABELS[rule]}
                  </button>
                ))}
              </div>

              {config.ruleMode === 'lives' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-200">Lives:</span>
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConfig((prev) => ({ ...prev, livesCount: n }));
                      }}
                      className={`h-8 w-8 rounded-lg text-xs font-extrabold border-2 border-slate-950 ${
                        config.livesCount === n
                          ? 'bg-red-500 text-white'
                          : 'bg-purple-800 text-purple-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {config.ruleMode === 'rounds' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-200">Match Format:</span>
                  {([3, 5] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConfig((prev) => ({ ...prev, roundsTarget: r }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border-2 border-slate-950 ${
                        config.roundsTarget === r
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-purple-800 text-purple-100'
                      }`}
                    >
                      Best of {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Timer */}
            <div>
              <div className="text-xs font-extrabold text-cyan-300 mb-2 flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-cyan-300" />
                {game.forceNoGameTimer ? 'Optional Turn Timer' : 'Match Timer'}
              </div>

              {game.forceNoGameTimer ? (
                <div className="flex flex-wrap gap-1.5">
                  {([0, 15, 30] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConfig((prev) => ({ ...prev, turnTimerSeconds: t }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-slate-950 ${
                        config.turnTimerSeconds === t
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-purple-800 text-white'
                      }`}
                    >
                      {t === 0 ? 'No Turn Limit' : `${t}s per Turn`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setConfig((prev) => ({ ...prev, timerSeconds: opt.value }));
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap ${
                        config.timerSeconds === opt.value
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-purple-800 text-white hover:bg-purple-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Arena Theme */}
            <div>
              <div className="text-xs font-extrabold text-emerald-300 mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-300" />
                Arena Theme
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARENA_THEMES.map((theme) => {
                  const unlocked = saveData.unlockedArenas.includes(theme.id);
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        soundEngine.playClick();
                        setConfig((prev) => ({ ...prev, arenaTheme: theme.id }));
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 border-slate-950 whitespace-nowrap ${
                        config.arenaTheme === theme.id
                          ? 'bg-emerald-400 text-slate-950'
                          : unlocked
                          ? 'bg-purple-800 text-white hover:bg-purple-700'
                          : 'bg-purple-950/60 text-purple-400 cursor-not-allowed'
                      }`}
                    >
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Start Action */}
        <div className="sticky bottom-0 border-t-2 border-purple-800/80 bg-purple-950/95 backdrop-blur px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-purple-200 min-w-0 truncate">
            {game.controlsSummary}
          </div>
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              soundEngine.playCountdownGo();
              onStart(config);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-extrabold text-slate-950 arcade-btn disabled:opacity-50 whitespace-nowrap shrink-0 min-h-[46px]"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Start Match</span>
          </button>
        </div>
      </div>
    </div>
  );
}
