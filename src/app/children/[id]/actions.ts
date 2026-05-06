'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { rewriteWithGenie } from '@/lib/ai/rewrite';
import { cleanTranscript } from '@/lib/ai/clean-transcript';
import { bumpTermCounts } from '@/lib/learning/term-tracking';
import { FIXED_QUESTION_1 } from '@/lib/prompts/genie';

const RecordSchema = z.object({
  childId: z.string().uuid(),
  rawText: z
    .string()
    .trim()
    .min(1, 'メモを入力してください')
    .max(2000, 'メモは2000文字以内で入力してください'),
  question: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : FIXED_QUESTION_1)),
});

export type CreateRecordState =
  | {
      errors?: { rawText?: string[]; question?: string[] };
      message?: string;
    }
  | undefined;

export async function createRecord(
  _prev: CreateRecordState,
  formData: FormData,
): Promise<CreateRecordState> {
  const parsed = RecordSchema.safeParse({
    childId: formData.get('childId'),
    rawText: formData.get('rawText'),
    question: formData.get('question'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { supabase, user, profile } = await requireFacilityUser();

  // ジーニーに連絡帳の言葉へ書き直してもらう
  let rewritten: string | null = null;
  try {
    rewritten = await rewriteWithGenie(parsed.data.rawText);
  } catch (e) {
    // リライト失敗時は raw のまま保存する(機能継続性を優先)
    console.error('[record] rewrite failed', e);
  }

  const { error } = await supabase.from('records').insert({
    facility_id: profile.facility_id,
    child_id: parsed.data.childId,
    author_id: user.id,
    question: parsed.data.question,
    raw_text: parsed.data.rawText,
    rewritten,
  });

  if (error) {
    console.error('[record] insert failed', error);
    return { message: `記録の保存に失敗しました: ${error.message}` };
  }

  // リライト済みテキストから専門用語を検出してカウント
  if (rewritten) {
    await bumpTermCounts(supabase, user.id, rewritten);
  }

  revalidatePath(`/children/${parsed.data.childId}`);
  revalidatePath('/learning');
  return undefined;
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
