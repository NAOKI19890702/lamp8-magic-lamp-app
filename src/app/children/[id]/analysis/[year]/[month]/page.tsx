import Link from 'next/link';
import { notFound } from 'next/navigation';
import { endOfMonth, startOfMonth } from 'date-fns';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { GenerateButton } from './generate-button';
import type { AnalysisData } from '@/types/database';

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string; year: string; month: string }>;
}) {
  const { id, year: y, month: m } = await params;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    notFound();
  }

  const { supabase } = await requireFacilityUser();

  const { data: child } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (!child) notFound();

  const { data: analysis } = await supabase
    .from('analyses')
    .select('data, record_count, created_at')
    .eq('child_id', id)
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle();

  // 月内の記録数を取得(分析がない時の表示用)
  const target = new Date(year, month - 1, 1);
  const { count: recordCount } = await supabase
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', id)
    .gte('occurred_at', startOfMonth(target).toISOString())
    .lte('occurred_at', endOfMonth(target).toISOString());

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={`/children/${id}`}
          className="text-sm text-amber-700 hover:text-amber-900"
        >
          ← {child.name} さんの記録に戻る
        </Link>

        <header className="mt-3 rounded-3xl bg-white/80 px-6 py-5 shadow-md backdrop-blur">
          <p className="text-xs text-amber-700/70">
            {year}年{month}月の歩み
          </p>
          <h1 className="mt-1 text-2xl font-bold text-amber-900">
            {child.name} さんの成長物語
          </h1>
          <p className="mt-1 text-xs text-amber-700/70">
            この月の記録: {recordCount ?? 0}件
            {analysis && ` / 分析対象: ${analysis.record_count}件`}
          </p>
        </header>

        {analysis ? (
          <AnalysisView data={analysis.data} />
        ) : (
          <section className="mt-6 rounded-3xl bg-white/80 p-8 text-center shadow-md backdrop-blur">
            {(recordCount ?? 0) === 0 ? (
              <>
                <p className="text-3xl">📝</p>
                <p className="mt-2 text-sm text-amber-800/80">
                  この月の記録がまだありません。
                  <br />
                  記録を重ねてから戻ってきてください。
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">✨</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-800/80">
                  {recordCount}件の記録から、
                  <br />
                  ジーニーが発達と成長を読み解きます。
                </p>
                <p className="mt-2 text-xs text-amber-700/60">
                  生成には30〜60秒ほどかかります。
                </p>
                <div className="mt-5">
                  <GenerateButton
                    childId={id}
                    year={year}
                    month={month}
                  />
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function AnalysisView({ data }: { data: AnalysisData }) {
  return (
    <div className="mt-6 grid gap-5">
      {/* ご家族向け物語 */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 p-6 shadow-md">
        <h2 className="text-sm font-bold text-amber-700">
          📖 ご家族へのお手紙
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
          {data.family_story}
        </p>
      </section>

      {/* 発達ピラミッド */}
      <section className="rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur">
        <h2 className="text-sm font-bold text-amber-700">
          🌱 発達ピラミッドでの位置
        </h2>
        <div className="mt-3 grid gap-2 rounded-2xl bg-amber-50/50 p-4">
          <p className="text-xs text-amber-700/70">いまの段階</p>
          <p className="text-sm font-semibold text-amber-900">
            {data.developmental_evidence.current_stage}
          </p>
        </div>
        <div className="mt-3 grid gap-2 rounded-2xl bg-amber-50/50 p-4">
          <p className="text-xs text-amber-700/70">この1ヶ月の進み</p>
          <p className="text-sm leading-relaxed text-amber-900">
            {data.developmental_evidence.stage_progression}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-amber-700">根拠の記録</p>
          <ul className="mt-2 grid gap-2">
            {data.developmental_evidence.evidence_quotes.map((q, i) => (
              <li
                key={i}
                className="rounded-2xl bg-amber-50/30 p-3 text-xs"
              >
                <p className="font-semibold text-amber-700">{q.date}</p>
                <p className="mt-1 text-amber-900">{q.observation}</p>
                <p className="mt-1 italic text-amber-700/80">
                  → {q.interpretation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5領域 */}
      <section className="rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur">
        <h2 className="text-sm font-bold text-amber-700">
          🏛️ 厚労省 5領域での評価
        </h2>
        <div className="mt-3 grid gap-3">
          <Domain label="健康・生活" value={data.five_domains.health_life} />
          <Domain label="運動・感覚" value={data.five_domains.motor_sense} />
          <Domain
            label="認知・行動"
            value={data.five_domains.cognition_behavior}
          />
          <Domain
            label="言語・コミュニケーション"
            value={data.five_domains.language_communication}
          />
          <Domain
            label="人間関係・社会性"
            value={data.five_domains.social_relations}
          />
        </div>
      </section>
    </div>
  );
}

function Domain({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-amber-50/50 p-4">
      <p className="text-xs font-semibold text-amber-700">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900">{value}</p>
    </div>
  );
}
