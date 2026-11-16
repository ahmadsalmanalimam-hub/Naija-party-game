'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { MiniGameProps } from '@/lib/naija/types';

function GameLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <div className="text-sm font-bold text-slate-300">Loading Arena...</div>
      </div>
    </div>
  );
}

// Dynamic lazy-loading ensures only 1 mini-game stays in RAM at any moment (ideal for 2GB RAM Android)
export const GAME_COMPONENTS: Record<string, React.ComponentType<MiniGameProps>> = {
  danfo_rush: dynamic(() => import('./DanfoRushGame'), { ssr: false, loading: GameLoadingFallback }),
  lagos_crossing: dynamic(() => import('./LagosCrossingGame'), { ssr: false, loading: GameLoadingFallback }),
  jollof_master: dynamic(() => import('./JollofMasterGame'), { ssr: false, loading: GameLoadingFallback }),
  bumper_cars: dynamic(() => import('./BumperArenaGame'), { ssr: false, loading: GameLoadingFallback }),
  rising_lava: dynamic(() => import('./RisingLavaGame'), { ssr: false, loading: GameLoadingFallback }),
  sumo_battle: dynamic(() => import('./SumoBattleGame'), { ssr: false, loading: GameLoadingFallback }),
  air_hockey: dynamic(() => import('./AirHockeyGame'), { ssr: false, loading: GameLoadingFallback }),
  street_football: dynamic(() => import('./StreetFootballGame'), { ssr: false, loading: GameLoadingFallback }),
  ludo: dynamic(() => import('./LudoGame'), { ssr: false, loading: GameLoadingFallback }),
  ayo: dynamic(() => import('./AyoGame'), { ssr: false, loading: GameLoadingFallback }),
  fastest_finger: dynamic(() => import('./FastestFingerGame'), { ssr: false, loading: GameLoadingFallback }),
  quick_quiz: dynamic(() => import('./QuickQuizGame'), { ssr: false, loading: GameLoadingFallback }),
  suya_chef: dynamic(() => import('./SuyaChefGame'), { ssr: false, loading: GameLoadingFallback }),
  drum_master: dynamic(() => import('./DrumMasterGame'), { ssr: false, loading: GameLoadingFallback }),
  gokart_race: dynamic(() => import('./GoKartRaceGame'), { ssr: false, loading: GameLoadingFallback }),
  boat_race: dynamic(() => import('./BoatRaceGame'), { ssr: false, loading: GameLoadingFallback }),
  battle_tank: dynamic(() => import('./BattleTankGame'), { ssr: false, loading: GameLoadingFallback }),
  king_of_hill: dynamic(() => import('./KingOfHillGame'), { ssr: false, loading: GameLoadingFallback }),
  penalty_shootout: dynamic(() => import('./PenaltyShootoutGame'), { ssr: false, loading: GameLoadingFallback }),
  basketball: dynamic(() => import('./BasketballGame'), { ssr: false, loading: GameLoadingFallback }),
  connect_four: dynamic(() => import('./ConnectFourGame'), { ssr: false, loading: GameLoadingFallback }),
  snake_and_ladders: dynamic(() => import('./SnakeAndLaddersGame'), { ssr: false, loading: GameLoadingFallback }),
  memory_match: dynamic(() => import('./MemoryMatchGame'), { ssr: false, loading: GameLoadingFallback }),
  math_battle: dynamic(() => import('./MathBattleGame'), { ssr: false, loading: GameLoadingFallback }),
  tug_of_war: dynamic(() => import('./TugOfWarGame'), { ssr: false, loading: GameLoadingFallback }),
  hot_potato: dynamic(() => import('./HotPotatoGame'), { ssr: false, loading: GameLoadingFallback }),
};
