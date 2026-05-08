import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ANALYSIS_SYSTEM } from '@/lib/prompts/genie';
import type { AnalysisData } from '@/types/database';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  required: [
    'summary_period',
    'developmental_evidence',
    'five_domains',
    'family_story',
  ],
  additionalProperties: false,
  properties: {
    summary_period: {
      type: 'string',
      description: '分析対象期間(例: 2026年5月)',
    },
    developmental_evidence: {
      type: 'object',
      required: ['current_stage', 'stage_progression', 'evidence_quotes'],
      additionalProperties: false,
      properties: {
        current_stage: {
          type: 'string',
          description: '発達ピラミッドの現在の主な段階(感覚統合〜学習能力)',
        },
        stage_progression: {
          type: 'string',
          description: '1ヶ月でどう進んだかの説明',
        },
        evidence_quotes: {
          type: 'array',
          description: '具体的なエピソード(1〜8件程度)',
          items: {
            type: 'object',
            required: ['date', 'observation', 'interpretation'],
            additionalProperties: false,
            properties: {
              date: { type: 'string', description: '記録の日付(MM/DD)' },
              observation: { type: 'string', description: '観察された事実' },
              interpretation: {
                type: 'string',
                description: '専門的な解釈',
              },
            },
          },
        },
      },
    },
    five_domains: {
      type: 'object',
      required: [
        'health_life',
        'motor_sense',
        'cognition_behavior',
        'language_communication',
        'social_relations',
      ],
      additionalProperties: false,
      properties: {
        health_life: { type: 'string' },
        motor_sense: { type: 'string' },
        cognition_behavior: { type: 'string' },
        language_communication: { type: 'string' },
        social_relations: { type: 'string' },
      },
    },
    family_story: {
      type: 'string',
      description:
        'ご家族向けの温かい成長物語(2〜3段落、専門用語は使わない)',
    },
  },
} as const;

export type RecordForAnalysis = {
  occurred_at: string;
  question: string | null;
  raw_text: string;
  rewritten: string | null;
};

export type AnalyzeResult = {
  data: AnalysisData;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
};

export async function analyzeChildMonth(
  childName: string,
  year: number,
  month: number,
  records: RecordForAnalysis[],
): Promise<AnalyzeResult> {
  if (records.length === 0) {
    throw new Error('対象期間に記録がありません');
  }

  const periodLabel = `${year}年${month}月`;
  const recordsText = records
    .map((r) => {
      const date = format(parseISO(r.occurred_at), 'M月d日(E)', {
        locale: ja,
      });
      const body = (r.rewritten || r.raw_text).trim();
      return `- ${date}: ${body}`;
    })
    .join('\n');

  const userPrompt = `対象: ${childName} さん
期間: ${periodLabel}
記録数: ${records.length}件

【記録一覧】
${recordsText}

上記の記録から、発達と成長を3観点(発達ピラミッド・5領域・家族向け物語)で分析してください。記録に書かれていない出来事は絶対に作らないでください。`;

  const model = 'claude-opus-4-7';
  const response = await client().messages.create({
    model,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: ANALYSIS_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: ANALYSIS_SCHEMA,
      },
    },
  });

  const block = response.content.find((b) => b.type === 'text') as
    | Anthropic.TextBlock
    | undefined;
  if (!block) throw new Error('No text content in analysis response');

  const data = JSON.parse(block.text) as AnalysisData;

  return {
    data,
    inputTokens: response.usage.input_tokens ?? null,
    outputTokens: response.usage.output_tokens ?? null,
    model,
  };
}
