'use client';

import React, { useState } from 'react';
import { Check, Coins, Gem, Lock, Palette, Sparkles } from 'lucide-react';
import { ACCESSORIES, ARENA_THEMES, CHARACTERS, OUTFITS, PLAYER_COLORS } from '@/lib/naija/catalog';
import { soundEngine } from '@/lib/naija/sound';
import { unlockItem } from '@/lib/naija/storage';
import { PlayerId, SaveData } from '@/lib/naija/types';
import { CharacterAvatar } from '@/components/naija/CharacterAvatar';

interface CollectionViewProps {
  saveData: SaveData;
  onUpdateSave: (next: SaveData) => void;
}

export function CollectionView({ saveData, onUpdateSave }: CollectionViewProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<PlayerId>(1);
  const [notice, setNotice] = useState<string>('');

  const slot = saveData.playerPresets.find((p) => p.id === selectedSlotId) || saveData.playerPresets[0];

  const updateSlotLook = (patch: Partial<typeof slot>) => {
    soundEngine.playClick();
    const next: SaveData = {
      ...saveData,
      playerPresets: saveData.playerPresets.map((p) =>
        p.id === selectedSlotId ? { ...p, ...patch } : p
      ),
    };
    onUpdateSave(next);
  };

  const handleUnlock = (
    type: 'character' | 'outfit' | 'accessory' | 'arena',
    id: string,
    cost: number,
    name: string,
    currency: 'coins' | 'gems' = 'coins'
  ) => {
    const res = unlockItem(saveData, type, id, cost, currency);
    if (!res) {
      soundEngine.playHit();
      setNotice(
        currency === 'gems'
          ? `Need ${cost} Party Gems to unlock ${name}. Win matches to earn Gems!`
          : `Need ${cost} Party Coins to unlock ${name}. Play matches to earn more!`
      );
      return;
    }
    soundEngine.playVictory();
    onUpdateSave(res);
    setNotice(`Unlocked ${name}!`);
  };

  return (
    <div className="space-y-5">
      {/* Header & Currency Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-indigo-950/90 arcade-card p-5">
        <div>
          <h2 className="text-2xl font-display font-bold text-yellow-300">
            Arcade Shop & Squad Locker
          </h2>
          <p className="text-xs text-purple-200 mt-0.5">
            Customize all 4 player slots and unlock items with earned Party Coins or Party Gems.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 rounded-2xl bg-yellow-400 border-2 border-slate-950 px-3.5 py-2 text-sm font-extrabold text-slate-950">
            <Coins className="h-4 w-4" />
            <span className="font-mono tabular-nums">{saveData.coins}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-cyan-400 border-2 border-slate-950 px-3.5 py-2 text-sm font-extrabold text-slate-950">
            <Gem className="h-4 w-4" />
            <span className="font-mono tabular-nums">{saveData.gems ?? 15}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl bg-emerald-400 text-slate-950 border-2 border-slate-950 px-4 py-2.5 text-xs font-extrabold">
          {notice}
        </div>
      )}

      {/* 4 Player Slot Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {saveData.playerPresets.map((p) => {
          const isSelected = p.id === selectedSlotId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSelectedSlotId(p.id);
              }}
              className={`rounded-2xl p-3 flex items-center gap-3 text-left arcade-btn ${
                isSelected ? 'bg-yellow-400 text-slate-950' : 'bg-purple-900/90 text-white'
              }`}
            >
              <CharacterAvatar
                characterId={p.character}
                outfitId={p.outfit}
                accessoryId={p.accessory}
                colorKey={p.color}
                size={46}
              />
              <span className="block min-w-0">
                <span className="block text-sm font-extrabold truncate">{p.name}</span>
                <span
                  className={`block text-[11px] font-bold ${
                    isSelected ? 'text-slate-800' : 'text-cyan-300'
                  }`}
                >
                  Player Slot {p.id}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Slot Name & Signature Color */}
      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 flex flex-col md:flex-row md:items-center gap-5">
        <CharacterAvatar
          characterId={slot.character}
          outfitId={slot.outfit}
          accessoryId={slot.accessory}
          colorKey={slot.color}
          mood="victory"
          size={80}
        />
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-extrabold text-cyan-300">
            Player {slot.id} Name
          </label>
          <input
            type="text"
            maxLength={14}
            value={slot.name}
            onChange={(e) => updateSlotLook({ name: e.target.value })}
            className="w-full max-w-xs rounded-xl border-2 border-slate-950 bg-purple-900 px-3.5 py-2.5 text-sm font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>
        <div>
          <div className="text-xs font-extrabold text-cyan-300 mb-2 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Signature Color
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLAYER_COLORS) as Array<keyof typeof PLAYER_COLORS>).map((ck) => (
              <button
                key={ck}
                type="button"
                onClick={() => updateSlotLook({ color: ck })}
                className={`h-9 w-9 rounded-full border-[3px] flex items-center justify-center transition-transform ${
                  slot.color === ck ? 'border-yellow-300 scale-115' : 'border-slate-950'
                }`}
                style={{ backgroundColor: PLAYER_COLORS[ck].hex }}
                aria-label={PLAYER_COLORS[ck].label}
              >
                {slot.color === ck && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Characters Grid */}
      <div className="space-y-3">
        <h3 className="text-lg font-display font-bold text-yellow-300">Cartoon Characters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CHARACTERS.map((char) => {
            const unlocked = saveData.unlockedCharacters.includes(char.id);
            const equipped = slot.character === char.id;
            const gemCost = Math.max(5, Math.round(char.cost / 15));
            return (
              <div
                key={char.id}
                className={`rounded-3xl p-4 flex flex-col items-center text-center gap-2.5 arcade-card ${
                  equipped ? 'bg-emerald-900/90' : 'bg-indigo-950/90'
                }`}
              >
                <CharacterAvatar
                  characterId={char.id}
                  outfitId={slot.outfit}
                  accessoryId={slot.accessory}
                  colorKey={slot.color}
                  size={68}
                />
                <div>
                  <div className="text-base font-display font-bold text-white">{char.name}</div>
                  <div className="text-[11px] font-semibold text-cyan-300">{char.title}</div>
                </div>
                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => updateSlotLook({ character: char.id })}
                    className={`w-full rounded-xl py-2 text-xs font-extrabold arcade-btn ${
                      equipped
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-purple-800 text-white hover:bg-purple-700'
                    }`}
                  >
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <div className="flex w-full gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUnlock('character', char.id, char.cost, char.name, 'coins')}
                      className="flex-1 rounded-xl bg-yellow-400 py-2 text-xs font-extrabold text-slate-950 arcade-btn flex items-center justify-center gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      <span>{char.cost}c</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnlock('character', char.id, gemCost, char.name, 'gems')}
                      className="rounded-xl bg-cyan-400 px-2.5 py-2 text-xs font-extrabold text-slate-950 arcade-btn flex items-center justify-center gap-1"
                    >
                      <Gem className="h-3 w-3" />
                      <span>{gemCost}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Outfits, Accessories & Arenas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 space-y-3">
          <h3 className="text-lg font-display font-bold text-yellow-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Outfits
          </h3>
          <div className="space-y-2">
            {OUTFITS.map((o) => {
              const unlocked = saveData.unlockedOutfits.includes(o.id);
              const equipped = slot.outfit === o.id;
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-slate-950 bg-purple-900/80 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-6 w-6 rounded-lg border-2 border-slate-950"
                      style={{ backgroundColor: o.primary }}
                    />
                    <span className="text-xs font-extrabold text-white">{o.name}</span>
                  </div>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => updateSlotLook({ outfit: o.id })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold arcade-btn ${
                        equipped ? 'bg-emerald-400 text-slate-950' : 'bg-purple-800 text-white'
                      }`}
                    >
                      {equipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnlock('outfit', o.id, o.cost, o.name, 'coins')}
                      className="px-3.5 py-1.5 rounded-xl bg-yellow-400 text-slate-950 text-xs font-extrabold arcade-btn"
                    >
                      Unlock {o.cost}c
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 space-y-3">
          <h3 className="text-lg font-display font-bold text-yellow-300">
            Accessories & Arena Themes
          </h3>
          <div className="space-y-2">
            {ACCESSORIES.map((a) => {
              const unlocked = saveData.unlockedAccessories.includes(a.id);
              const equipped = slot.accessory === a.id;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-slate-950 bg-purple-900/80 px-3.5 py-2.5"
                >
                  <span className="text-xs font-extrabold text-white">{a.name}</span>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => updateSlotLook({ accessory: a.id })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold arcade-btn ${
                        equipped ? 'bg-emerald-400 text-slate-950' : 'bg-purple-800 text-white'
                      }`}
                    >
                      {equipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnlock('accessory', a.id, a.cost, a.name, 'coins')}
                      className="px-3.5 py-1.5 rounded-xl bg-yellow-400 text-slate-950 text-xs font-extrabold arcade-btn"
                    >
                      Unlock {a.cost}c
                    </button>
                  )}
                </div>
              );
            })}

            <div className="pt-2 text-xs font-extrabold text-cyan-300">Arena Themes</div>
            {ARENA_THEMES.map((ar) => {
              const unlocked = saveData.unlockedArenas.includes(ar.id);
              const active = saveData.settings.preferredArena === ar.id;
              return (
                <div
                  key={ar.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-slate-950 bg-purple-900/80 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white"
                      style={{ backgroundColor: ar.accentHex }}
                    />
                    <span className="text-xs font-extrabold text-white">{ar.name}</span>
                  </div>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSave({
                          ...saveData,
                          settings: { ...saveData.settings, preferredArena: ar.id },
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold arcade-btn ${
                        active ? 'bg-cyan-400 text-slate-950' : 'bg-purple-800 text-white'
                      }`}
                    >
                      {active ? 'Default' : 'Set Default'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnlock('arena', ar.id, ar.cost, ar.name, 'coins')}
                      className="px-3.5 py-1.5 rounded-xl bg-yellow-400 text-slate-950 text-xs font-extrabold arcade-btn"
                    >
                      Unlock {ar.cost}c
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
