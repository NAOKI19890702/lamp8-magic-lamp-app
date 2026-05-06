import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { findMatchingTerms } from '@/lib/glossary';

/**
 * 与えられたテキストから用語を検出し、ユーザーごとのカウントを上書き更新する。
 * 1回の記録で同じ用語は1回だけカウント。
 */
export async function bumpTermCounts(
  supabase: SupabaseClient<Database>,
  userId: string,
  text: string,
): Promise<void> {
  const terms = findMatchingTerms(text);
  if (terms.length === 0) return;

  // 既存カウントを取得
  const { data: existing } = await supabase
    .from('term_counts')
    .select('term_name, count')
    .eq('user_id', userId)
    .in('term_name', terms);

  const currentMap = new Map(
    (existing ?? []).map((row) => [row.term_name, row.count]),
  );

  const now = new Date().toISOString();
  const rows = terms.map((name) => ({
    user_id: userId,
    term_name: name,
    count: (currentMap.get(name) ?? 0) + 1,
    last_seen_at: now,
  }));

  const { error } = await supabase
    .from('term_counts')
    .upsert(rows, { onConflict: 'user_id,term_name' });

  if (error) {
    console.error('[term-tracking] upsert failed', error);
  }
}
