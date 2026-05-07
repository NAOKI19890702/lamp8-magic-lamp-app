'use client';

import { useState, useTransition } from 'react';
import { regenerateDailyPack } from './actions';

export function RegenerateButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await regenerateDailyPack();
            if (!res.ok) setError(res.message);
          });
        }}
        className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-white disabled:opacity-50"
      >
        <span className={pending ? 'inline-block animate-spin' : ''}>↻</span>
        {pending ? '新しい問いかけを呼んでいます…' : '新しい問いかけに変える'}
      </button>
      {error && (
        <p className="text-[10px] text-red-600 max-w-[240px] text-center">
          {error}
        </p>
      )}
    </div>
  );
}
