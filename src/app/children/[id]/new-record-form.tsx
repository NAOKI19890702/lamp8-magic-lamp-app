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

function AnswerInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const [listening, setListening] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [cleaning, startCleaning] = useTransition();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

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

    const baseText = valueRef.current.trim();
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
      onChange(baseText + separator + finalBuffer + interim);
    };

    recognition.onerror = (e) => {
      setSupportError(`音声認識エラー: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      onChange((baseText + separator + finalBuffer).trim());
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setSupportError(null);
    setListening(true);
    recognition.start();
  }, [onChange]);

  const handleClean = () => {
    setCleanError(null);
    const current = valueRef.current;
    startCleaning(async () => {
      const res = await cleanTextAction(current);
      if (res.ok) {
        onChange(res.cleaned);
      } else {
        setCleanError(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <textarea
          rows={4}
          maxLength={800}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="話して入力するか、ここに直接書き込んでください(空欄のままスキップもOK)"
          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 pr-14 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        />
        <button
          type="button"
          aria-label={listening ? '音声入力を止める' : '音声入力を始める'}
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          className={`absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full shadow-md transition disabled:opacity-50 ${
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
          disabled={cleaning || listening || disabled || !value.trim()}
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
    </div>
  );
}

function ProgressList({
  questions,
  answers,
  upTo,
}: {
  questions: [string, string, string];
  answers: [string, string, string];
  upTo: number;
}) {
  const filled: { q: string; a: string; idx: number }[] = [];
  for (let i = 0; i < upTo; i++) {
    if (answers[i].trim()) {
      filled.push({ q: questions[i], a: answers[i], idx: i });
    }
  }
  if (filled.length === 0) return null;

  return (
    <details className="mt-2 rounded-2xl bg-amber-50/80 p-3 text-xs text-amber-900">
      <summary className="cursor-pointer font-semibold">
        📝 ここまでの回答({filled.length}件)
      </summary>
      <ul className="mt-2 grid gap-2">
        {filled.map(({ q, a, idx }) => (
          <li key={idx}>
            <p className="font-medium text-amber-800">
              {idx + 1}. {q}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{a}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function NewRecordForm({
  childId,
  questions,
}: {
  childId: string;
  questions: [string, string, string] | null;
}) {
  const [state, action, pending] = useActionState(createRecord, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState(0);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [a3, setA3] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  // 成功時(送信完了後 state が undefined)はリセット
  useEffect(() => {
    if (!pending && !state) {
      setStep(0);
      setA1('');
      setA2('');
      setA3('');
      formRef.current?.reset();
    }
  }, [pending, state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!questions) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800">
        ジーニーの問いかけを準備中です。少し時間をおいてからこの画面を再読み込みしてください。
      </p>
    );
  }

  const answers: [string, string, string] = [a1, a2, a3];
  const setters = [setA1, setA2, setA3];
  const totalAnswered = answers.filter((a) => a.trim()).length;
  const canRecord = totalAnswered >= 1;
  const currentQuestion = questions[step];
  const currentAnswer = answers[step];
  const setCurrentAnswer = setters[step];

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="q1" value={questions[0]} />
      <input type="hidden" name="q2" value={questions[1]} />
      <input type="hidden" name="q3" value={questions[2]} />
      <input type="hidden" name="a1" value={a1} />
      <input type="hidden" name="a2" value={a2} />
      <input type="hidden" name="a3" value={a3} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-700">
          ジーニーからの問いかけ {step + 1} / 3
        </p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 w-8 rounded-full ${
                i <= step ? 'bg-amber-500' : 'bg-amber-200'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold leading-relaxed text-amber-900">
        {currentQuestion}
      </p>

      <AnswerInput
        value={currentAnswer}
        onChange={setCurrentAnswer}
        disabled={pending}
      />

      <ProgressList questions={questions} answers={answers} upTo={step} />

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

      <div className="flex flex-col gap-2">
        {step < 2 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={pending}
            className="h-11 w-full rounded-full border border-amber-300 bg-white text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
          >
            次の問いへ →
          </button>
        )}

        {step >= 1 && (
          <button
            type="submit"
            disabled={pending || !canRecord}
            className="h-12 w-full rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
          >
            {pending
              ? 'ジーニーが書き直しています…'
              : step === 2
                ? '✨ 連絡帳にする'
                : `✨ ここまでで連絡帳にする(${totalAnswered}件)`}
          </button>
        )}

        {step > 0 && !pending && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-xs text-amber-700 hover:text-amber-900"
          >
            ← 前の問いに戻る
          </button>
        )}
      </div>
    </form>
  );
}
