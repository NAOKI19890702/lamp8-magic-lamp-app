import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreateDailyPack,
} from '@/lib/ai/daily-questions';
import { FIXED_QUESTION_1 } from '@/lib/prompts/genie';
import { RegenerateButton } from './regenerate-button';

export async function DailyCard({ facilityId }: { facilityId: string }) {
  const supabase = await createClient();

  let pack;
  try {
    pack = await getOrCreateDailyPack(supabase, facilityId);
  } catch (e) {
    console.error('[DailyCard] failed', e);
    return null;
  }

  const questions = [FIXED_QUESTION_1, pack.question_2, pack.question_3];

  return (
    <section className="mt-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 p-5 shadow-md">
      <div className="flex items-start gap-3">
        <Image
          src="/genie.jpg"
          alt="ジーニー"
          width={56}
          height={56}
          className="rounded-full shadow-sm"
          priority
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-amber-700">
              ジーニーから今日のひとこと
            </p>
            <RegenerateButton />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            {pack.principal_message}
          </p>
        </div>
      </div>

      <ol className="mt-4 grid gap-2">
        {questions.map((q, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-amber-900 shadow-sm"
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-bold">
              {i + 1}
            </span>
            <span className="leading-relaxed">{q}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DailyCardSkeleton() {
  return (
    <section className="mt-6 rounded-3xl bg-amber-100/50 p-5 shadow-md">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 animate-pulse rounded-full bg-amber-200" />
        <div className="flex-1">
          <div className="h-3 w-40 animate-pulse rounded-full bg-amber-200" />
          <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-amber-200" />
          <div className="mt-1 h-3 w-3/4 animate-pulse rounded-full bg-amber-200" />
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-amber-700/70">
        ✨ ジーニーが今日の問いかけを準備しています…
      </p>
    </section>
  );
}
