'use client';

import { type FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginButton({ next = '/home' }: { next?: string }) {
  const [googlePending, setGooglePending] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');

  function buildCallbackUrl() {
    const url = new URL('/auth/callback', location.origin);
    url.searchParams.set('next', next);
    return url.toString();
  }

  async function handleGoogle() {
    setGooglePending(true);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildCallbackUrl() },
    });
    if (e) {
      setError(e.message);
      setGooglePending(false);
    }
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setOtpPending(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: buildCallbackUrl() },
    });
    setOtpPending(false);
    if (err) {
      setError(err.message);
    } else {
      setOtpSent(true);
    }
  }

  const anyPending = googlePending || otpPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={anyPending}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-amber-200 bg-white text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-amber-50 disabled:opacity-60"
      >
        <GoogleIcon />
        {googlePending ? 'ログイン中…' : 'Google でログイン'}
      </button>

      {/* Divider */}
      <div className="my-1 flex items-center" role="separator" aria-hidden>
        <div className="flex-1 border-t border-amber-200" />
        <span className="mx-3 text-xs text-amber-700/60">または</span>
        <div className="flex-1 border-t border-amber-200" />
      </div>

      {/* Magic Link */}
      {otpSent ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-900">
          <p className="text-base">✉️ お手紙を送りました</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-800/80">
            受信箱(または迷惑メールフォルダ)を開いて、
            <br />
            ジーニーからの「ランプに灯をともす」リンクをタップしてください。
          </p>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setEmail('');
            }}
            className="mt-3 text-xs text-amber-700 underline hover:text-amber-900"
          >
            別のメールアドレスで送り直す
          </button>
        </div>
      ) : (
        <form onSubmit={handleOtp} className="flex flex-col gap-2">
          <label
            htmlFor="login-email"
            className="text-xs font-semibold text-amber-900"
          >
            メールでログイン(パスワード不要)
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={anyPending}
            className="h-11 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={anyPending || !email.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
          >
            {otpPending ? '送信中…' : '✉️ メールでリンクを送る'}
          </button>
        </form>
      )}

      {error && (
        <p className="text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
