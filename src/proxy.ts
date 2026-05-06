import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除外:
     * - _next 配下(静的ファイル・画像)
     * - 拡張子を持つアセット(画像・JSON・SVG など)
     * - favicon
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|json|webmanifest)).*)',
  ],
};
