import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { SignOutButton } from './sign-out-button';
import { DailyCard, DailyCardSkeleton } from './daily-card';

export default async function HomePage() {
  const { supabase, user, profile } = await requireFacilityUser();

  const [{ data: facility }, { data: children }] = await Promise.all([
    supabase
      .from('facilities')
      .select('name')
      .eq('id', profile.facility_id)
      .maybeSingle(),
    supabase
      .from('children')
      .select('id, name, birthdate')
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
  ]);

  const displayName =
    profile.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    'ようこそ';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between rounded-3xl bg-white/80 px-5 py-4 shadow-md backdrop-blur">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-200 text-base">
                ✨
              </div>
            )}
            <div className="leading-tight">
              <p className="text-xs text-amber-700/70">{facility?.name}</p>
              <p className="text-sm font-semibold text-amber-900">
                {displayName} さん
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/team"
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
            >
              👥 スタッフ
            </Link>
            <Link
              href="/learning"
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
            >
              🌟 私の学び
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <Suspense fallback={<DailyCardSkeleton />}>
          <DailyCard facilityId={profile.facility_id} />
        </Suspense>
      </div>

      <section className="mx-auto mt-6 w-full max-w-2xl">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-amber-900">おともだち</h2>
          <Link
            href="/children/new"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            + 追加
          </Link>
        </div>

        {children && children.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {children.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/children/${c.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <div>
                    <p className="text-base font-semibold text-amber-900">
                      {c.name}
                    </p>
                    {c.birthdate && (
                      <p className="text-xs text-amber-700/70">
                        誕生日: {c.birthdate}
                      </p>
                    )}
                  </div>
                  <span className="text-amber-500">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-2xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
            <p className="text-3xl">🌱</p>
            <p className="mt-2 text-sm text-amber-800/80">
              まだおともだちが登録されていません。
              <br />
              「+ 追加」から登録してみましょう。
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
