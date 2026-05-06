import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-amber-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">
        <h1 className="text-xl font-bold text-amber-900">ログインに失敗しました</h1>
        <p className="mt-3 text-sm text-amber-800/80">
          もう一度お試しください。問題が続く場合は、ブラウザのCookieをご確認ください。
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          ログイン画面に戻る
        </Link>
      </div>
    </main>
  );
}
