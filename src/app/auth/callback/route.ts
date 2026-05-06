import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Google OAuth コールバック。
 * Supabase が `?code=...` を付けてリダイレクトしてくるので、
 * exchangeCodeForSession でセッション Cookie を確立する。
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/home';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-error', url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/auth/auth-error', url));
  }

  return NextResponse.redirect(new URL(next, url));
}
