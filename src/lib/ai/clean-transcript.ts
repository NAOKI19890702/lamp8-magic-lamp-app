import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { CLEAN_TRANSCRIPT_SYSTEM } from '@/lib/prompts/genie';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * 音声認識テキストの最小限の校正(誤字・句読点・改行など)。
 * 意味は変えない。書き直しではない。
 */
export async function cleanTranscript(rawText: string): Promise<string> {
  const stream = client().messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: CLEAN_TRANSCRIPT_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: rawText }],
  });

  const final = await stream.finalMessage();
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) throw new Error('Empty response from Claude');
  return text;
}
