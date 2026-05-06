import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { requireFacilityUser } from '@/lib/db/auth-context';
import {
  GLOSSARY,
  categoryLabel,
  termByName,
} from '@/lib/glossary';

export default async function LearningPage() {
  const { supabase, user } = await requireFacilityUser();

  const { data: counts } = await supabase
    .from('term_counts')
    .select('term_name, count, last_seen_at')
    .eq('user_id', user.id)
    .order('count', { ascending: false });

  const totalTerms = GLOSSARY.terms.length;
  const learnedTerms = counts?.length ?? 0;
  const totalUses =
    counts?.reduce((sum, c) => sum + c.count, 0) ?? 0;

  // カテゴリごとにグループ化
  const byCategory = new Map<
    string,
    { term_name: string; count: number; last_seen_at: string }[]
  >();
  for (const c of counts ?? []) {
    const term = termByName(c.term_name);
    if (!term) continue;
    const list = byCategory.get(term.category) ?? [];
    list.push(c);
    byCategory.set(term.category, list);
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
          <p className="text-3xl">🌟</p>
          <h1 className="mt-1 text-2xl font-bold text-amber-900">
            私の学び
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-amber-800/80">
            記録を重ねるごとに、専門のことばがあなたの中で育っていきます。
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat label="出会った用語" value={`${learnedTerms} / ${totalTerms}`} />
            <Stat label="のべ出現回数" value={`${totalUses}`} />
            <Stat
              label="達成率"
              value={`${Math.round((learnedTerms / totalTerms) * 100)}%`}
            />
          </div>
        </header>

        {learnedTerms === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
            <p className="text-3xl">📚</p>
            <p className="mt-2 text-sm text-amber-800/80">
              記録を重ねていくと、ジーニーが書き直した文章から
              <br />
              発達科学の用語が自動で集まっていきます。
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {Array.from(byCategory.entries()).map(([cat, items]) => (
              <section
                key={cat}
                className="rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur"
              >
                <h2 className="text-sm font-bold text-amber-900">
                  {categoryLabel(cat)}
                </h2>
                <ul className="mt-3 grid gap-2">
                  {items.map((c) => {
                    const term = termByName(c.term_name)!;
                    return (
                      <li
                        key={c.term_name}
                        className="rounded-2xl bg-amber-50/50 p-4"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold text-amber-900">
                            {term.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                            ×{c.count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-amber-800/80">
                          {term.short}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-amber-900/70">
                          {term.detail}
                        </p>
                        <p className="mt-2 text-[10px] text-amber-700/60">
                          最後の出現:{' '}
                          {format(new Date(c.last_seen_at), 'M月d日(E)', {
                            locale: ja,
                          })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 px-3 py-3">
      <p className="text-[10px] text-amber-700/70">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-amber-900">{value}</p>
    </div>
  );
}
