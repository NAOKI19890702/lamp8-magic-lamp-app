import { redirect } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type FacilityUserContext = {
  supabase: SupabaseClient<Database>;
  user: User;
  profile: {
    facility_id: string;
    display_name: string | null;
    role: 'owner' | 'admin' | 'staff';
  };
};

/**
 * 認証 + facility 紐付けが完了しているユーザーのみ通すヘルパー。
 * 未ログインなら /login、未オンボーディングなら /onboarding に飛ばす。
 */
export async function requireFacilityUser(): Promise<FacilityUserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('facility_id, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.facility_id) {
    redirect('/onboarding');
  }

  return {
    supabase,
    user,
    profile: {
      facility_id: profile.facility_id,
      display_name: profile.display_name,
      role: profile.role,
    },
  };
}
