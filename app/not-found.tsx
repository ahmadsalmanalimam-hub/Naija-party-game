import Link from 'next/link';
import { Gamepad2, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full rounded-3xl bg-indigo-950/90 border-2 border-purple-400/40 p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950 shadow-lg">
          <Gamepad2 className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-display font-bold text-yellow-300">
          Arena Not Found
        </h1>
        <p className="mt-2 text-sm text-purple-100/85">
          That route does not exist. Jump back into the Naija Party arcade hub to play all 26 mini-games.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-base font-extrabold text-slate-950 border-b-4 border-emerald-700 hover:bg-emerald-400 active:translate-y-0.5 transition-all"
        >
          <Home className="h-5 w-5" />
          <span>Back to Naija Party</span>
        </Link>
      </div>
    </main>
  );
}
