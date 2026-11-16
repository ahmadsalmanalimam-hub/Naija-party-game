'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Maximize2, RotateCw } from 'lucide-react';

function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb);
  window.addEventListener('orientationchange', cb);
  return () => {
    window.removeEventListener('resize', cb);
    window.removeEventListener('orientationchange', cb);
  };
}

function getIsPortraitMobile() {
  return window.innerHeight > window.innerWidth && window.innerWidth < 768;
}

function getServerIsPortraitMobile() {
  return false;
}

export function LandscapeGuard() {
  const isPortraitMobile = useSyncExternalStore(
    subscribeResize,
    getIsPortraitMobile,
    getServerIsPortraitMobile
  );
  const [dismissed, setDismissed] = useState(false);

  if (!isPortraitMobile || dismissed) return null;

  const tryLandscapeLock = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orient = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orient && typeof orient.lock === 'function') {
        await orient.lock('landscape');
      }
    } catch {
      // Orientation lock not permitted in non-fullscreen browser tabs; fallback cleanly
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/95 backdrop-blur-md p-6 text-center text-white">
      <div className="w-full max-w-sm rounded-3xl bg-indigo-950 arcade-card p-6 space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950 arcade-card animate-float-slow">
          <RotateCw className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-yellow-300">Rotate for Landscape Fun!</h2>
        <p className="text-sm text-purple-100 leading-relaxed">
          Turn your phone sideways for the best 234 PLAYERS same-phone multiplayer arcade view.
        </p>
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={tryLandscapeLock}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 py-3 text-sm font-extrabold text-slate-950 arcade-btn"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Enter Landscape Fullscreen</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-full rounded-2xl bg-purple-800 py-2.5 text-xs font-bold text-purple-100 arcade-btn"
          >
            Play in Portrait Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
