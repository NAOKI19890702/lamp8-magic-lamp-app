'use server';

import { createClient } from '@/lib/supabase/server';

export async function acceptInvitation(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!token || typeof token !== 'string') {
    return { ok: false, message: '招待トークンが正しくありません' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'ログインが切れています' };
  }

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token: token,
  });

  if (error) {
    console.error('[acceptInvitation] failed', error);
    return { ok: false, message: error.message };
  }

  const result = (data ?? {}) as { error?: string; ok?: boolean };
  if (result.error === 'invalid_or_expired') {
    return { ok: false, message: 'この招待は使えません(期限切れ等)' };
  }
  if (result.error === 'not_authenticated') {
    return { ok: false, message: 'ログインが切れています' };
  }
  if (!result.ok) {
    return { ok: false, message: '参加に失敗しました' };
  }

  return { ok: true };
}
