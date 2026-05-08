'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { rewriteWithGenie } from '@/lib/ai/rewrite';
import { cleanTranscript } from '@/lib/ai/clean-transcript';
import { bumpTermCounts } from '@/lib/learning/term-tracking';

const QA_MAX = 800;

const RecordSchema = z
  .object({
    childId: z.string().uuid(),
    q1: z.string().trim().max(200),
    q2: z.string().trim().max(200),
    q3: z.string().trim().max(200),
    a1: z.string().trim().max(QA_MAX),
    a2: z.string().trim().max(QA_MAX),
    a3: z.string().trim().max(QA_MAX),
  })
  .refine((d) => [d.a1, d.a2, d.a3].some((a) => a.length > 0), {
    message: '少なくとも1つの問いに回答してください',
    path: ['rawText'],
  });

export type CreateRecordState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

export async function createRecord(
  _prev: CreateRecordState,
  formData: FormData,
): Promise<CreateRecordState> {
  const parsed = RecordSchema.safeParse({
    childId: formData.get('childId'),
    q1: formData.get('q1'),
    q2: formData.get('q2'),
    q3: formData.get('q3'),
    a1: formData.get('a1'),
    a2: formData.get('a2'),
    a3: formData.get('a3'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { childId, q1, q2, q3, a1, a2, a3 } = parsed.data;
  const pairs: { q: string; a: string }[] = [
    { q: q1, a: a1 },
    { q: q2, a: a2 },
    { q: q3, a: a3 },
  ].filter((p) => p.a.length > 0);

  // 連絡帳リライト用に Q&A をまとめる
  const rawText = pairs
    .map(({ q, a }) => `Q: ${q}\nA: ${a}`)
    .join('\n\n');

  // 履歴一覧に出すラベルは最初に答えた問いを採用
  const questionLabel = pairs[0]?.q || 'ジーニーからの問いかけ';

  const { supabase, user, profile } = await requireFacilityUser();

  let rewritten: string | null = null;
  try {
    rewritten = await rewriteWithGenie(rawText);
  } catch (e) {
    console.error('[record] rewrite failed', e);
  }

  const { error } = await supabase.from('records').insert({
    facility_id: profile.facility_id,
    child_id: childId,
    author_id: user.id,
    question: questionLabel,
    raw_text: rawText,
    rewritten,
  });

  if (error) {
    console.error('[record] insert failed', error);
    return { message: `記録の保存に失敗しました: ${error.message}` };
  }

  if (rewritten) {
    await bumpTermCounts(supabase, user.id, rewritten);
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath('/learning');
  return undefined;
}

/**
 * 既存記録の連絡帳テキスト(rewritten)を編集する。
 * 編集できるのは作成者本人のみ(RLS)。
 */
export async function updateRecord(
  recordId: string,
  newRewritten: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = newRewritten.trim();
  if (!trimmed) {
    return { ok: false, message: '本文を入力してください' };
  }
  if (trimmed.length > 4000) {
    return { ok: false, message: '本文が長すぎます(4000文字以内)' };
  }

  const { supabase } = await requireFacilityUser();

  const { data, error } = await supabase
    .from('records')
    .update({ rewritten: trimmed })
    .eq('id', recordId)
    .select('child_id')
    .maybeSingle();

  if (error) {
    console.error('[updateRecord] failed', error);
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: '記録が見つからないか、編集権限がありません' };
  }

  revalidatePath(`/children/${data.child_id}`);
  return { ok: true };
}

/**
 * 記録の論理削除(archived_at に現在時刻を入れる)。
 * 削除できるのは作成者本人のみ(RLS)。
 */
export async function archiveRecord(
  recordId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await requireFacilityUser();

  const { data, error } = await supabase
    .from('records')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', recordId)
    .is('archived_at', null)
    .select('child_id')
    .maybeSingle();

  if (error) {
    console.error('[archiveRecord] failed', error);
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: '記録が見つからないか、削除権限がありません' };
  }

  revalidatePath(`/children/${data.child_id}`);
  return { ok: true };
}

/**
 * 音声認識テキストを整える(誤字・句読点だけ最小限に修正)。
 * フォームの textarea を上書きするのに使う。
 */
export async function cleanTextAction(rawText: string): Promise<{
  ok: true;
  cleaned: string;
} | {
  ok: false;
  message: string;
}> {
  const trimmed = rawText.trim();
  if (!trimmed) return { ok: false, message: 'テキストが空です' };
  if (trimmed.length > 2000) {
    return { ok: false, message: '2000文字を超えるため整えられません' };
  }

  await requireFacilityUser();

  try {
    const cleaned = await cleanTranscript(trimmed);
    return { ok: true, cleaned };
  } catch (e) {
    console.error('[cleanTextAction] failed', e);
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : '不明なエラーで整えられませんでした',
    };
  }
}
