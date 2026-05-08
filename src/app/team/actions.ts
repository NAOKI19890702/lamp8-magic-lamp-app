'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import * as z from 'zod';
import { requireFacilityUser } from '@/lib/db/auth-context';

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

const InviteSchema = z.object({
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  role: z.enum(['admin', 'staff']),
  expiresInDays: z.coerce.number().int().min(1).max(60).default(14),
});

export type CreateInvitationState =
  | { ok: true; token: string }
  | { ok: false; message: string }
  | undefined;

export async function createInvitation(
  _prev: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const parsed = InviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    expiresInDays: formData.get('expiresInDays'),
  });

  if (!parsed.success) {
    return { ok: false, message: '入力内容を確認してください' };
  }

  const { supabase, user, profile } = await requireFacilityUser();

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { ok: false, message: '招待の作成には管理者権限が必要です' };
  }

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
  );

  const { error } = await supabase.from('invitations').insert({
    facility_id: profile.facility_id,
    email: parsed.data.email ?? '',
    role: parsed.data.role,
    token,
    invited_by_id: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[createInvitation] failed', error);
    return { ok: false, message: error.message };
  }

  revalidatePath('/team');
  return { ok: true, token };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase, profile } = await requireFacilityUser();

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { ok: false, message: '管理者権限が必要です' };
  }

  // 物理削除でOK(招待は使い捨て、accept済みは別途データが残る)
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('facility_id', profile.facility_id);

  if (error) {
    console.error('[revokeInvitation] failed', error);
    return { ok: false, message: error.message };
  }

  revalidatePath('/team');
  return { ok: true };
}
