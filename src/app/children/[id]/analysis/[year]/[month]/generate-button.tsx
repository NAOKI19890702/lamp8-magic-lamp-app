'use client';

import { useState, useTransition } from 'react';
import { generateAnalysis } from './actions';

export function GenerateButton({
  childId,
  year,
  month,
}: {
  childId: string;
  year: number;
  month: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await generateAnalysis(childId, year, month);
            if (!res.ok) setError(res.message);
          });
        }}
        className="h-12 w-full max-w-xs rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending
          ? '✨ ジーニーが読み解いています…'
          : '✨ 今月の成長物語を読み解く'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
