import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GENIE_SYSTEM } from '@/lib/prompts/genie';
import type { Database } from '@/types/database';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

export type DailyQuestionPack = {
  principal_message: string;
  question_2: string;
  question_3: string;
};

const SCHEMA = {
  type: 'object',
  required: ['principal_message', 'question_2', 'question_3'],
  additionalProperties: false,
  properties: {
    principal_message: {
      type: 'string',
      description: 'ジーニーからの今日の一言メッセージ。50〜80文字。',
    },
    question_2: {
      type: 'string',
      description: '感覚・運動領域のカジュアルな問いかけ。25〜45文字。',
    },
    question_3: {
      type: 'string',
      description:
        '社会性・コミュニケーション領域の専門的問いかけ。25〜45文字。',
    },
  },
} as const;

/**
 * その日のジーニーからの3つの問いかけ + 一言メッセージを生成する。
 * Claude Opus 4.7 + structured output (json_schema) を使用。
 */
export async function generateDailyQuestions(
  date: Date,
): Promise<DailyQuestionPack> {
  const dateLabel = format(date, 'yyyy年M月d日(E)', { locale: ja });

  const userPrompt = `今日は ${dateLabel} です。
この日の文脈(季節・曜日・気候・行事など)を踏まえて、以下を生成してください:

- principal_message: ジーニーからスタッフへの今日の一言(50〜80文字、専門的着眼点を添える)
- question_2: ライトな入口の問いかけ(感覚・運動、25〜45文字)
- question_3: 専門的な観察問いかけ(社会性・コミュニケーション、25〜45文字)

注:
- 1問目は固定の「今日の1日の様子はどうでしたか?」なので生成不要
- 文末は「です・ます」調
- 同じパターン・同じ用語を繰り返さない
- 専門用語は保育士が現場で観察できる行動に必ず翻訳する`;

  const response = await client().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: GENIE_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: SCHEMA,
      },
    },
  });

  const block = response.content.find((b) => b.type === 'text') as
    | Anthropic.TextBlock
    | undefined;
  if (!block) throw new Error('No text content in daily questions response');

  return JSON.parse(block.text) as DailyQuestionPack;
}

/**
 * その日の問いかけを取得(無ければ Claude で生成してキャッシュ)。
 * 1事業所 1日 1パック。
 */
export async function getOrCreateDailyPack(
  supabase: SupabaseClient<Database>,
  facilityId: string,
): Promise<DailyQuestionPack> {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: existing } = await supabase
    .from('daily_questions')
    .select('principal_message, question_2, question_3')
    .eq('facility_id', facilityId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    return {
      principal_message: existing.principal_message,
      question_2: existing.question_2,
      question_3: existing.question_3,
    };
  }

  const generated = await generateDailyQuestions(new Date());

  // INSERT は競合(ほぼ同時にもう1スタッフが開いた)時だけ無視
  const { error } = await supabase.from('daily_questions').insert({
    facility_id: facilityId,
    date: today,
    principal_message: generated.principal_message,
    question_2: generated.question_2,
    question_3: generated.question_3,
  });

  if (error && error.code !== '23505') {
    console.error('[daily-questions] insert failed', error);
  }

  return generated;
}

