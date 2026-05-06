import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { REWRITE_SYSTEM } from '@/lib/prompts/genie';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * スタッフが吹き込んだメモを、ご家族向けの連絡帳の文章に書き直す。
 * モデル: claude-opus-4-7 + adaptive thinking。
 * 失敗した場合はエラーを投げる(呼び出し側で raw を保持する想定)。
 */
export async function rewriteWithGenie(rawText: string): Promise<string> {
  const stream = client().messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: REWRITE_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: rawText }],
  });

  const final = await stream.finalMessage();

  const text = final.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) {
    throw new Error('Empty response from Claude');
  }

  return text;
}
