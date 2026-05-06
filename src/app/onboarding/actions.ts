'use server';

import { redirect } from 'next/navigation';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/server';

const FacilitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '事業所名を入力してください')
    .max(80, '事業所名は80文字以内で入力してください'),
  description: z
    .string()
    .trim()
    .max(400, '説明は400文字以内で入力してください')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateFacilityState =
  | {
      errors?: { name?: string[]; description?: string[] };
      message?: string;
    }
  | undefined;

export async function createFacility(
  _prev: CreateFacilityState,
  formData: FormData,
): Promise<CreateFacilityState> {
  const parsed = FacilitySchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'ログインが切れています。もう一度ログインしてください。' };
  }

  const { error: rpcError } = await supabase.rpc('create_facility_for_me', {
    facility_name: parsed.data.name,
    facility_description: parsed.data.description ?? null,
  });

  if (rpcError) {
    console.error('[onboarding] create_facility_for_me failed', {
      userId: user.id,
      error: rpcError,
    });
    return {
      message: `事業所の作成に失敗しました: ${rpcError.message}`,
    };
  }

  redirect('/home');
}
