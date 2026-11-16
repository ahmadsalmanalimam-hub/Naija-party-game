'use client';

import React, { useState } from 'react';
import { Cpu, Hand, Music, Smartphone, Trash2, Volume2 } from 'lucide-react';
import { soundEngine } from '@/lib/naija/sound';
import { resetSaveData } from '@/lib/naija/storage';
import { GameSettings, SaveData } from '@/lib/naija/types';
import { PWAInstallButton } from '@/components/pwa/PWAControls';

interface SettingsViewProps {
  saveData: SaveData;
  onUpdateSave: (next: SaveData) => void;
}

export function SettingsView({ saveData, onUpdateSave }: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const updateSettings = (patch: Partial<GameSettings>) => {
    const nextSettings = { ...saveData.settings, ...patch };
    soundEngine.configure({
      sfxEnabled: nextSettings.sfxEnabled,
      musicEnabled: nextSettings.musicEnabled,
      volume: nextSettings.sfxVolume,
    });
    onUpdateSave({
      ...saveData,
      settings: nextSettings,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 space-y-5">
        <h2 className="text-2xl font-display font-bold text-yellow-300">Audio & Music</h2>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-cyan-300" />
            <div>
              <div className="text-sm font-extrabold text-white">Sound Effects</div>
              <div className="text-xs text-purple-200">Synthesized offline Web Audio effects</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ sfxEnabled: !saveData.settings.sfxEnabled })}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold arcade-btn min-h-[42px] ${
              saveData.settings.sfxEnabled
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-purple-800 text-purple-200'
            }`}
          >
            {saveData.settings.sfxEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div>
          <div className="flex justify-between text-xs font-extrabold text-cyan-300 mb-1.5">
            <span>Master Volume</span>
            <span className="font-mono">{Math.round(saveData.settings.sfxVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={saveData.settings.sfxVolume}
            onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-yellow-300" />
            <div>
              <div className="text-sm font-extrabold text-white">Party Groove Music</div>
              <div className="text-xs text-purple-200">Lightweight offline Afrobeats marimba loop</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ musicEnabled: !saveData.settings.musicEnabled })}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold arcade-btn min-h-[42px] ${
              saveData.settings.musicEnabled
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-purple-800 text-purple-200'
            }`}
          >
            {saveData.settings.musicEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-indigo-950/90 arcade-card p-5 space-y-5">
        <h2 className="text-2xl font-display font-bold text-yellow-300">
          Touch Controls & 2GB RAM Mode
        </h2>

        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-white mb-2">
            <Hand className="h-4 w-4 text-cyan-300" />
            Touch Control Pad Size
          </div>
          <div className="flex gap-2">
            {(['compact', 'standard', 'large'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  updateSettings({ touchScale: sz });
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold capitalize arcade-btn ${
                  saveData.settings.touchScale === sz
                    ? 'bg-yellow-400 text-slate-950'
                    : 'bg-purple-800 text-white'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-cyan-300" />
            <div>
              <div className="text-sm font-extrabold text-white">Vibration Feedback</div>
              <div className="text-xs text-purple-200">Tactile buzz on goals & victories</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ vibrationEnabled: !saveData.settings.vibrationEnabled })}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold arcade-btn min-h-[42px] ${
              saveData.settings.vibrationEnabled
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-purple-800 text-purple-200'
            }`}
          >
            {saveData.settings.vibrationEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-sm font-extrabold text-white">2GB RAM Performance Mode</div>
              <div className="text-xs text-purple-200">
                Reduces extra particle effects for smooth FPS on low-end Android
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ lowRamMode: !saveData.settings.lowRamMode })}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold arcade-btn min-h-[42px] ${
              saveData.settings.lowRamMode
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-purple-800 text-purple-200'
            }`}
          >
            {saveData.settings.lowRamMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-purple-900">
          <PWAInstallButton />

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-extrabold text-white arcade-btn min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset Local Save</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const fresh = resetSaveData();
                  onUpdateSave(fresh);
                  setConfirmReset(false);
                }}
                className="rounded-xl bg-red-500 px-3.5 py-2 text-xs font-extrabold text-white arcade-btn"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl bg-purple-800 px-3 py-2 text-xs font-bold text-white arcade-btn"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
