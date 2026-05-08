'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from './actions';

export function AcceptForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitation(token);
      if (res.ok) {
        router.push('/home');
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="h-12 w-full rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? '参加中…' : '✨ 参加する'}
      </button>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </>
  );
}
