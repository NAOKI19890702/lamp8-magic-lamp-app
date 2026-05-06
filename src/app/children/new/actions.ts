'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { requireFacilityUser } from '@/lib/db/auth-context';

const ChildSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'お名前を入力してください')
    .max(40, 'お名前は40文字以内で入力してください'),
  birthdate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
      '誕生日の形式が正しくありません',
    ),
  notes: z
    .string()
    .trim()
    .max(800, 'メモは800文字以内で入力してください')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateChildState =
  | {
      errors?: {
        name?: string[];
        birthdate?: string[];
        notes?: string[];
      };
      message?: string;
    }
  | undefined;

export async function createChild(
  _prev: CreateChildState,
  formData: FormData,
): Promise<CreateChildState> {
  const parsed = ChildSchema.safeParse({
    name: formData.get('name'),
    birthdate: formData.get('birthdate'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { supabase, profile } = await requireFacilityUser();

  const { error } = await supabase.from('children').insert({
    facility_id: profile.facility_id,
    name: parsed.data.name,
    birthdate: parsed.data.birthdate ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    console.error('[children/new] insert failed', error);
    return {
      message: `登録に失敗しました: ${error.message}`,
    };
  }

  revalidatePath('/home');
  redirect('/home');
}
