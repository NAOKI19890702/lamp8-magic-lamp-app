import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginButton } from './login-button';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // 安全なパスのみ許可(外部URL遷移を防ぐ)
  const safeNext = next && next.startsWith('/') ? next : '/home';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center">
          {/* タイトル(魔法のランプnote)はロゴに含まれているため、視覚的には非表示。SEO/スクリーンリーダー用に残す */}
          <h1 className="sr-only">魔法のランプnote</h1>
          <Image
            src="/logo.png"
            alt="魔法のランプnote"
            width={560}
            height={315}
            className="h-auto w-full max-w-sm"
            priority
          />
          <p className="mt-2 text-center text-sm leading-relaxed text-amber-800/80">
            子どもたちの今日を、ぼくと一緒に
            <br />
            そっと書き留めていきましょう。
          </p>
        </div>

        <div className="mt-8">
          <LoginButton next={safeNext} />
          <p className="mt-6 text-center text-xs text-amber-700/70">
            ログインすることで、
            <br />
            利用規約とプライバシーポリシーに同意したことになります。
          </p>
        </div>
      </div>
    </main>
  );
}
