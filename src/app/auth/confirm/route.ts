import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Magic Link / OTP の確認エンドポイント。
 *
 * Supabase のメールテンプレートで、リンク先を以下にしておく:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/home
 *
 * `verifyOtp` を使うことで、PKCE と違って **メアド入力した端末と
 * メールリンクを開く端末が違っても** ログインを成立させられる。
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const nextRaw = url.searchParams.get('next') ?? '/home';
  const next = nextRaw.startsWith('/') ? nextRaw : '/home';

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/auth/auth-error', url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('[auth/confirm] verifyOtp failed', error);
    return NextResponse.redirect(new URL('/auth/auth-error', url));
  }

  return NextResponse.redirect(new URL(next, url));
}
