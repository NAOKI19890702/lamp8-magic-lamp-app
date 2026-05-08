import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { InviteSection } from './invite-section';

export default async function TeamPage() {
  const { supabase, user, profile } = await requireFacilityUser();

  const isAdmin = profile.role === 'owner' || profile.role === 'admin';

  const [{ data: facility }, { data: staff }, { data: invitations }] =
    await Promise.all([
      supabase
        .from('facilities')
        .select('name')
        .eq('id', profile.facility_id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, display_name, role, created_at')
        .eq('facility_id', profile.facility_id)
        .order('created_at', { ascending: true }),
      isAdmin
        ? supabase
            .from('invitations')
            .select(
              'id, email, role, token, expires_at, accepted_at, created_at',
            )
            .eq('facility_id', profile.facility_id)
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const roleLabel: Record<string, string> = {
    owner: 'オーナー',
    admin: '管理者',
    staff: 'スタッフ',
  };

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/home"
          className="text-sm text-amber-700 hover:text-amber-900"
        >
          ← ホームへ戻る
        </Link>

        <header className="mt-3 rounded-3xl bg-white/80 px-6 py-5 shadow-md backdrop-blur">
          <h1 className="text-2xl font-bold text-amber-900">スタッフ</h1>
          <p className="mt-1 text-xs text-amber-700/70">{facility?.name}</p>
        </header>

        <section className="mt-6 rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur">
          <h2 className="text-base font-bold text-amber-900">
            ✨ メンバー({staff?.length ?? 0}名)
          </h2>
          <ul className="mt-3 grid gap-2">
            {(staff ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl bg-amber-50/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {s.display_name ?? '(名前未設定)'}
                    {s.id === user.id && (
                      <span className="ml-2 text-xs text-amber-700/70">
                        (あなた)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-amber-700/70">
                    {format(new Date(s.created_at), 'yyyy年M月d日に参加', {
                      locale: ja,
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    s.role === 'owner'
                      ? 'bg-amber-200 text-amber-900'
                      : s.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {roleLabel[s.role] ?? s.role}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && <InviteSection invitations={invitations ?? []} />}
      </div>
    </main>
  );
}
