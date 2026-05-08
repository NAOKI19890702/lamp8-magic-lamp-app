import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcceptForm } from './accept-form';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // RPC で SECURITY DEFINER で取得(まだ事業所に所属していない人でも見れるようにするため)
  const { data: preview, error: previewError } = await supabase.rpc(
    'get_invitation_preview',
    { p_token: token },
  );

  const row = Array.isArray(preview) ? preview[0] : preview;
  const facilityName = row?.facility_name as string | undefined;
  const role = row?.role as 'admin' | 'staff' | undefined;
  const isValid = row?.is_valid as boolean | undefined;
  const expiresAt = row?.expires_at as string | undefined;

  // 招待が見つからない or RPC 失敗
  if (previewError || !row) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <p className="text-3xl">🔍</p>
          <h1 className="mt-3 text-xl font-bold text-amber-900">
            招待が見つかりません
          </h1>
          <p className="mt-2 text-sm text-amber-800/80">
            リンクが正しいか、招待主にもう一度確認してみてください。
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            トップへ
          </Link>
        </div>
      </main>
    );
  }

  if (!isValid) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <p className="text-3xl">⏳</p>
          <h1 className="mt-3 text-xl font-bold text-amber-900">
            この招待は使えません
          </h1>
          <p className="mt-2 text-sm text-amber-800/80">
            すでに使われたか、期限が切れています。
            <br />
            招待主にもう一度発行してもらってください。
          </p>
        </div>
      </main>
    );
  }

  // 認証状態を確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン → ログイン後にこのページへ戻ってくる
  if (!user) {
    const next = `/invite/${token}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // すでに事業所に所属している場合
  const { data: profile } = await supabase
    .from('profiles')
    .select('facility_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.facility_id) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <p className="text-3xl">✨</p>
          <h1 className="mt-3 text-xl font-bold text-amber-900">
            すでに別の事業所に参加しています
          </h1>
          <p className="mt-2 text-sm text-amber-800/80">
            事業所の引っ越しが必要な場合は、現在の事業所のオーナーにご相談ください。
          </p>
          <Link
            href="/home"
            className="mt-6 inline-block rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            ホームへ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
        <p className="text-3xl">🪔</p>
        <h1 className="mt-3 text-xl font-bold text-amber-900">
          {facilityName} へようこそ
        </h1>
        <p className="mt-2 text-sm text-amber-800/80">
          {role === 'admin' ? '管理者' : 'スタッフ'} として参加します。
          {expiresAt && (
            <span className="mt-1 block text-xs text-amber-700/70">
              この招待は {new Date(expiresAt).toLocaleString('ja-JP')} まで有効
            </span>
          )}
        </p>

        <div className="mt-6">
          <AcceptForm token={token} />
        </div>
      </div>
    </main>
  );
}
