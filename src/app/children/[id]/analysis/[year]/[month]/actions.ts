'use server';

import { revalidatePath } from 'next/cache';
import { endOfMonth, startOfMonth } from 'date-fns';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { analyzeChildMonth } from '@/lib/ai/analyze';

export async function generateAnalysis(
  childId: string,
  year: number,
  month: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase, user, profile } = await requireFacilityUser();

  // 子どもの情報を取得
  const { data: child } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', childId)
    .maybeSingle();

  if (!child) {
    return { ok: false, message: '子どもが見つかりません' };
  }

  // 月の範囲で記録を取得
  const target = new Date(year, month - 1, 1);
  const fromIso = startOfMonth(target).toISOString();
  const toIso = endOfMonth(target).toISOString();

  const { data: records, error: recError } = await supabase
    .from('records')
    .select('occurred_at, question, raw_text, rewritten')
    .eq('child_id', childId)
    .gte('occurred_at', fromIso)
    .lte('occurred_at', toIso)
    .order('occurred_at', { ascending: true });

  if (recError) {
    return { ok: false, message: `記録の取得に失敗: ${recError.message}` };
  }
  if (!records || records.length === 0) {
    return { ok: false, message: 'この月の記録がまだありません' };
  }

  try {
    const result = await analyzeChildMonth(child.name, year, month, records);

    const { error: upsertError } = await supabase
      .from('analyses')
      .upsert(
        {
          facility_id: profile.facility_id,
          child_id: childId,
          period_year: year,
          period_month: month,
          record_count: records.length,
          data: result.data,
          generated_by_id: user.id,
          model: result.model,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
        },
        { onConflict: 'child_id,period_year,period_month' },
      );

    if (upsertError) {
      console.error('[analysis] upsert failed', upsertError);
      return { ok: false, message: upsertError.message };
    }

    revalidatePath(`/children/${childId}/analysis/${year}/${month}`);
    return { ok: true };
  } catch (e) {
    console.error('[analysis] generate failed', e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : '分析の生成に失敗しました',
    };
  }
}
