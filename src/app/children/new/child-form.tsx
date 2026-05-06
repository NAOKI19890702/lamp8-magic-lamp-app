'use client';

import { useActionState } from 'react';
import { createChild, type CreateChildState } from './actions';

const initialState: CreateChildState = undefined;

export function ChildForm() {
  const [state, action, pending] = useActionState(createChild, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-amber-900"
        >
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={40}
          placeholder="例: たろう / ○○ちゃん"
          className="mt-1.5 h-11 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {state?.errors?.name?.[0] && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="birthdate"
          className="block text-sm font-semibold text-amber-900"
        >
          誕生日(任意)
        </label>
        <input
          id="birthdate"
          name="birthdate"
          type="date"
          className="mt-1.5 h-11 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {state?.errors?.birthdate?.[0] && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.birthdate[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-semibold text-amber-900"
        >
          メモ(任意)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={800}
          placeholder="好きなもの・苦手なもの・配慮することなど"
          className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {state?.errors?.notes?.[0] && (
          <p className="mt-1 text-xs text-red-600">{state.errors.notes[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="text-center text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? '登録中…' : '登録する'}
      </button>
    </form>
  );
}
