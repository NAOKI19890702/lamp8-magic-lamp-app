import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { getOrCreateDailyPack } from '@/lib/ai/daily-questions';
import { FIXED_QUESTION_1 } from '@/lib/prompts/genie';
import { NewRecordForm } from './new-record-form';

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireFacilityUser();

  const { data: child } = await supabase
    .from('children')
    .select('id, name, birthdate, notes')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (!child) {
    notFound();
  }

  const { data: records } = await supabase
    .from('records')
    .select('id, question, raw_text, rewritten, occurred_at')
    .eq('child_id', id)
    .order('occurred_at', { ascending: false })
    .limit(30);

  let questions: [string, string, string] | null = null;
  try {
    const pack = await getOrCreateDailyPack(supabase, profile.facility_id);
    questions = [FIXED_QUESTION_1, pack.question_2, pack.question_3];
  } catch (e) {
    console.error('[ChildDetailPage] failed to load daily pack', e);
  }

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/home"
          className="text-sm text-amber-700 hover:text-amber-900"
        >
          ← おともだち一覧
        </Link>

        <header className="mt-3 rounded-3xl bg-white/80 px-6 py-5 shadow-md backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-900">
                {child.name}
              </h1>
              {child.birthdate && (
                <p className="mt-1 text-xs text-amber-700/70">
                  誕生日: {child.birthdate}
                </p>
              )}
            </div>
            <Link
              href={(() => {
                const now = new Date();
                return `/children/${child.id}/analysis/${now.getFullYear()}/${now.getMonth() + 1}`;
              })()}
              className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              📖 今月の成長
            </Link>
          </div>
          {child.notes && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-amber-800/80">
              {child.notes}
            </p>
          )}
        </header>

        <section className="mt-6 rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur">
          <h2 className="text-base font-bold text-amber-900">
            ✨ 今日のことを書き留める
          </h2>
          <p className="mt-1 text-xs text-amber-800/70">
            ジーニーが連絡帳の言葉に書き直します。
          </p>
          <div className="mt-4">
            <NewRecordForm childId={child.id} questions={questions} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="px-1 text-base font-bold text-amber-900">
            これまでの記録
          </h2>
          {records && records.length > 0 ? (
            <ul className="mt-3 grid gap-3">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur"
                >
                  <p className="text-xs text-amber-700/70">
                    {format(new Date(r.occurred_at), 'M月d日(E) HH:mm', {
                      locale: ja,
                    })}
                  </p>
                  {r.question && (
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {r.question}
                    </p>
                  )}
                  {r.rewritten ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                      {r.rewritten}
                    </p>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                      {r.raw_text}
                    </p>
                  )}
                  {r.rewritten && r.raw_text !== r.rewritten && (
                    <details className="mt-3 text-xs text-amber-700/70">
                      <summary className="cursor-pointer">元のメモ</summary>
                      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-amber-50 p-3">
                        {r.raw_text}
                      </p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-2xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
              <p className="text-3xl">📝</p>
              <p className="mt-2 text-sm text-amber-800/80">
                まだ記録がありません。
                <br />
                上のフォームから書き留めてみましょう。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
