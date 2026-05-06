'use client';

import { useState, useTransition } from 'react';
import { regenerateDailyPack } from './actions';

export function RegenerateButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label="今日の問いかけを生成し直す"
        title="今日の問いかけを生成し直す"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await regenerateDailyPack();
            if (!res.ok) setError(res.message);
          });
        }}
        className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-base text-amber-700 shadow-sm transition hover:bg-white disabled:opacity-50"
      >
        <span className={pending ? 'inline-block animate-spin' : ''}>↻</span>
      </button>
      {error && (
        <p className="text-[10px] text-red-600 max-w-[140px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}
