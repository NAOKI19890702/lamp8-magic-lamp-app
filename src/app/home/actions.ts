'use server';

import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { generateDailyQuestions } from '@/lib/ai/daily-questions';

/**
 * 今日の問いかけを再生成して上書きする。
 */
export async function regenerateDailyPack(): Promise<{
  ok: true;
} | {
  ok: false;
  message: string;
}> {
  const { supabase, profile } = await requireFacilityUser();
  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    const generated = await generateDailyQuestions(new Date());

    // 上書き(=削除→挿入)。upsert は primary key 衝突を更新で扱える
    const { error } = await supabase
      .from('daily_questions')
      .upsert(
        {
          facility_id: profile.facility_id,
          date: today,
          principal_message: generated.principal_message,
          question_1: generated.question_1,
          question_2: generated.question_2,
          question_3: generated.question_3,
        },
        { onConflict: 'facility_id,date' },
      );

    if (error) {
      console.error('[regenerateDailyPack] upsert failed', error);
      return { ok: false, message: error.message };
    }

    revalidatePath('/home');
    return { ok: true };
  } catch (e) {
    console.error('[regenerateDailyPack] failed', e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : '不明なエラー',
    };
  }
}
