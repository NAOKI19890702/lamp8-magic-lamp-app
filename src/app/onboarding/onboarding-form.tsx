'use client';

import { useActionState } from 'react';
import { createFacility, type CreateFacilityState } from './actions';

const initialState: CreateFacilityState = undefined;

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createFacility, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-amber-900"
        >
          事業所名 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="例: ひかり保育園 / こもれび児童発達支援"
          className="mt-1.5 h-11 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {state?.errors?.name?.[0] && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-semibold text-amber-900"
        >
          ひとこと(任意)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={400}
          placeholder="どんな場所なのか、簡単に書いてみてください"
          className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {state?.errors?.description?.[0] && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.description[0]}
          </p>
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
        {pending ? '作成中…' : 'はじめる'}
      </button>
    </form>
  );
}
