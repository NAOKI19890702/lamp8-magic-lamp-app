'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lamp.tour.seen.v1';

type Step = {
  emoji: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    emoji: '🪔',
    title: 'ようこそ、魔法のランプnoteへ',
    body: 'はじめまして、ぼくはジーニーです。\nこのアプリで、子どもたちの今日を一緒に書き留めていきましょう。',
  },
  {
    emoji: '✨',
    title: '毎日3つの問いかけが届きます',
    body: 'ジーニーが今日の文脈に合わせた問いかけをそっと用意します。\n気が向いた問いだけ答えてもらってOKです。',
  },
  {
    emoji: '🎙',
    title: '声で吹き込んで、連絡帳に',
    body: '子どもページから、スマホに話しかけるだけでメモが取れます。\n「整える」で誤字を直し、「連絡帳にする」でご家族向けの文章にします。',
  },
  {
    emoji: '📤',
    title: '連絡帳をすぐ届けられます',
    body: '各記録カードの「📤 共有」から、コピー / LINE / メール / 印刷 で\nご家族にすぐ届けられます。',
  },
  {
    emoji: '👥',
    title: '事業所の仲間と一緒に',
    body: '右上の「👥 スタッフ」から招待リンクを発行できます。\n受け取った先生が Google でログインすれば、自動で同じ事業所に参加します。',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  // マウント後にローカル状態を確認(SSR時は何も出さない)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/40 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {/* スキップ */}
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 text-xs text-amber-700/70 hover:text-amber-900"
        >
          スキップ
        </button>

        {/* 進捗ドット */}
        <div className="mb-6 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-amber-500'
                  : i < step
                    ? 'w-1.5 bg-amber-300'
                    : 'w-1.5 bg-amber-100'
              }`}
            />
          ))}
        </div>

        {/* 中身 */}
        <div className="text-center">
          <div className="mb-3 text-5xl" aria-hidden>
            {current.emoji}
          </div>
          <h2
            id="onboarding-title"
            className="text-lg font-bold text-amber-900"
          >
            {current.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-800/80">
            {current.body}
          </p>
        </div>

        {/* ナビ */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs text-amber-700 disabled:invisible"
          >
            ← 戻る
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                close();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600"
          >
            {isLast ? '✨ はじめる' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
