'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { archiveRecord, updateRecord } from './actions';

type Props = {
  recordId: string;
  initialText: string;
  rawText: string;
  occurredAtLabel: string;
  question: string | null;
  authorName: string | null;
  canManage: boolean;
};

function buildShareText({
  occurredAtLabel,
  question,
  body,
}: {
  occurredAtLabel: string;
  question: string | null;
  body: string;
}): string {
  const header = question ? `${occurredAtLabel}\n${question}` : occurredAtLabel;
  return `${header}\n\n${body}\n\n— 魔法のランプnote`;
}

function ShareMenu({
  shareText,
  onClose,
}: {
  shareText: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setHasWebShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const encoded = encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleWebShare = async () => {
    try {
      await navigator.share({ text: shareText });
      onClose();
    } catch {
      // ユーザーがキャンセルした等。何もしない
    }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-2xl border border-amber-200 bg-white text-left text-xs shadow-lg"
    >
      <button
        type="button"
        onClick={handleCopy}
        className="block w-full px-3 py-2 text-left text-amber-900 hover:bg-amber-50"
      >
        📋 {copied ? 'コピーしました' : 'コピー'}
      </button>
      <a
        href={`https://line.me/R/share?text=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="block w-full px-3 py-2 text-left text-amber-900 hover:bg-amber-50"
      >
        💬 LINE で送る
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent('連絡帳のおしらせ')}&body=${encoded}`}
        onClick={onClose}
        className="block w-full px-3 py-2 text-left text-amber-900 hover:bg-amber-50"
      >
        ✉️ メールで送る
      </a>
      {hasWebShare && (
        <button
          type="button"
          onClick={handleWebShare}
          className="block w-full px-3 py-2 text-left text-amber-900 hover:bg-amber-50"
        >
          📤 デバイスで共有
        </button>
      )}
    </div>
  );
}

export function RecordCard({
  recordId,
  initialText,
  rawText,
  occurredAtLabel,
  question,
  authorName,
  canManage,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
    });
  };

  const shareText = buildShareText({
    occurredAtLabel,
    question,
    body: displayText,
  });

  return (
    <li className="record-card relative overflow-hidden rounded-2xl border-l-4 border-amber-400 bg-gradient-to-br from-amber-50/90 to-orange-50/70 p-5 pl-6 shadow-sm backdrop-blur">
      {/* 連絡帳らしい右上の小さな飾り */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 text-amber-300/50"
      >
        ✿
      </span>

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <p className="inline-flex items-center gap-1 text-xs font-medium text-amber-800/80">
            <span aria-hidden>📅</span>
            {occurredAtLabel}
          </p>
          {authorName && (
            <p className="mt-0.5 text-[10px] text-amber-700/60">
              ✍️ {authorName}
            </p>
          )}
        </div>
        {!editing && (
          <div className="record-actions relative flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              disabled={pending}
              className="rounded-full px-2 py-1 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              📤 共有
            </button>
            {shareOpen && (
              <ShareMenu
                shareText={shareText}
                onClose={() => setShareOpen(false)}
              />
            )}
            {canManage && (
              <>
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
              </>
            )}
          </div>
        )}
      </div>

      {question && (
        <p className="mt-2 inline-block rounded-md bg-white/60 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {question}
        </p>
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
            <details className="record-raw-details mt-3 text-xs text-amber-700/70">
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

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
    >
      🖨 印刷 / PDF保存
    </button>
  );
}
