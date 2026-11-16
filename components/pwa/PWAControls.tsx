'use client';

import React, { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '@/hooks/usePWAInstall';

export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker
        .getRegistrations()
        .then(async (regs) => {
          const hadRegs = regs.length > 0;
          await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
          if ('caches' in window) {
            const keys = await caches.keys().catch(() => [] as string[]);
            await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
          }
          if (hadController || hadRegs) {
            try {
              if (!window.sessionStorage.getItem('naija_dev_sw_reset')) {
                window.sessionStorage.setItem('naija_dev_sw_reset', '1');
                window.location.reload();
              }
            } catch {
              // Ignore sessionStorage restrictions in sandboxed iframes
            }
          }
        })
        .catch(() => undefined);
      return;
    }

    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (!hadController) return;
      try {
        if (!window.sessionStorage.getItem('naija_prod_sw_reloaded')) {
          window.sessionStorage.setItem('naija_prod_sw_reloaded', '1');
          window.location.reload();
        }
      } catch {
        // Ignore sessionStorage restrictions
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update().catch(() => undefined))
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);
  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline Ready · Local Play Active</span>
    </div>
  );
}

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white border-b-4 border-emerald-800 hover:bg-emerald-500 active:translate-y-0.5 active:border-b-2 transition-all whitespace-nowrap shrink-0 min-h-[44px] ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 min-h-[44px]"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Install NAIJA PARTY</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Play NAIJA PARTY full-screen offline on your phone:
              </p>
              <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> icon in your browser bar.</li>
                <li>Select <strong>Add to Home Screen</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white border-b-4 border-emerald-800"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
