'use client';

import { useState, useTransition } from 'react';
import { archiveRecord, updateRecord } from './actions';

type Props = {
  recordId: string;
  initialText: string;
  rawText: string;
  occurredAtLabel: string;
  question: string | null;
};

export function RecordCard({
  recordId,
  initialText,
  rawText,
  occurredAtLabel,
  question,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [displayText, setDisplayText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateRecord(recordId, text);
      if (res.ok) {
        setDisplayText(text.trim());
        setEditing(false);
      } else {
        setError(res.message);
      }
    });
  };

  const handleCancel = () => {
    setText(displayText);
    setError(null);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm('この記録を削除しますか?(後で必要なら開発者に復元を依頼できます)')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await archiveRecord(recordId);
      if (!res.ok) {
        setError(res.message);
      }
      // 成功時は revalidatePath でリストから消える
    });
  };

  return (
    <li className="rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-amber-700/70">{occurredAtLabel}</p>
        {!editing && (
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="rounded-full px-2 py-1 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              ✏️ 編集
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-full px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              🗑 削除
            </button>
          </div>
        )}
      </div>

      {question && (
        <p className="mt-1 text-xs font-medium text-amber-800">{question}</p>
      )}

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={4000}
            disabled={pending}
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !text.trim()}
              className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
            >
              {pending ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
            {displayText}
          </p>
          {rawText && rawText !== displayText && (
            <details className="mt-3 text-xs text-amber-700/70">
              <summary className="cursor-pointer">元のメモ</summary>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-amber-50 p-3">
                {rawText}
              </p>
            </details>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </>
      )}
    </li>
  );
}
