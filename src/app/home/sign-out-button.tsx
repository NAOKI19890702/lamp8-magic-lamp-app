'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="h-11 w-full rounded-full border border-amber-200 bg-white text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 disabled:opacity-60"
    >
      {pending ? 'ログアウト中…' : 'ログアウト'}
    </button>
  );
}
