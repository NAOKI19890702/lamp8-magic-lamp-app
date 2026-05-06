'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  createRecord,
  cleanTextAction,
  type CreateRecordState,
} from './actions';
import { FIXED_QUESTION_1 } from '@/lib/prompts/genie';

const initialState: CreateRecordState = undefined;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function NewRecordForm({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState(createRecord, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef('');

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [cleaning, startCleaning] = useTransition();

  const handleClean = () => {
    setCleanError(null);
    const current = text;
    startCleaning(async () => {
      const res = await cleanTextAction(current);
      if (res.ok) {
        setText(res.cleaned);
      } else {
        setCleanError(res.message);
      }
    });
  };

  // text と ref を同期(認識ハンドラで最新値を参照するため)
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // 成功時(state が undefined)はテキストエリアをクリア
  useEffect(() => {
    if (!pending && !state) {
      setText('');
      formRef.current?.reset();
    }
  }, [pending, state]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupportError(
        'お使いのブラウザは音声入力に対応していません。Chrome / Safari でお試しください。',
      );
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    // 認識開始時点のテキストを起点とし、認識結果は常にこの起点に積み上げる
    const baseText = textRef.current.trim();
    const separator = baseText ? '\n' : '';
    let finalBuffer = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalBuffer += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setText(baseText + separator + finalBuffer + interim);
    };

    recognition.onerror = (e) => {
      setSupportError(`音声認識エラー: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      // 終了時は確定分だけ残し、暫定文字列を消す
      setText((baseText + separator + finalBuffer).trim());
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setSupportError(null);
    setListening(true);
    recognition.start();
  }, []);

  // アンマウント時に止める
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="question" value={FIXED_QUESTION_1} />

      <p className="text-sm font-semibold text-amber-900">
        今日の1日の様子はどうでしたか?
      </p>

      <div className="relative">
        <textarea
          ref={textareaRef}
          name="rawText"
          required
          rows={4}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="話して入力するか、ここに直接書き込んでください"
          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 pr-14 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="button"
          aria-label={listening ? '音声入力を止める' : '音声入力を始める'}
          onClick={listening ? stopListening : startListening}
          className={`absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full shadow-md transition ${
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {listening ? '■' : '🎤'}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClean}
          disabled={cleaning || listening || pending || !text.trim()}
          className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
        >
          {cleaning ? '整えています…' : '✏️ 整える'}
        </button>
      </div>

      {listening && (
        <p className="text-center text-xs text-red-600">
          🎙️ 聞いています…(もう一度ボタンで停止)
        </p>
      )}
      {supportError && (
        <p className="text-center text-xs text-red-600">{supportError}</p>
      )}
      {cleanError && (
        <p className="text-center text-xs text-red-600">{cleanError}</p>
      )}
      {state?.errors?.rawText?.[0] && (
        <p className="text-center text-xs text-red-600">
          {state.errors.rawText[0]}
        </p>
      )}
      {state?.message && (
        <p className="text-center text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || listening}
        className="h-12 w-full rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? 'ジーニーが書き直しています…' : '✨ 記録する'}
      </button>
    </form>
  );
}
