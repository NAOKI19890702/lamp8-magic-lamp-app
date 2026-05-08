'use client';

import { useActionState, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  createInvitation,
  revokeInvitation,
  type CreateInvitationState,
} from './actions';

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const initialState: CreateInvitationState = undefined;

export function InviteSection({
  invitations,
}: {
  invitations: Invitation[];
}) {
  const [state, action, pending] = useActionState(
    createInvitation,
    initialState,
  );

  const inviteUrl = (token: string) => {
    if (typeof window === 'undefined') return `/invite/${token}`;
    return `${window.location.origin}/invite/${token}`;
  };

  return (
    <section className="mt-6 rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur">
      <h2 className="text-base font-bold text-amber-900">📩 招待する</h2>
      <p className="mt-1 text-xs text-amber-800/70">
        URLを発行してLINE/メール等で渡してください。受け取った人がGoogleでログインすると、この事業所に参加できます。
      </p>

      <form action={action} className="mt-4 grid gap-3">
        <div>
          <label className="block text-xs font-semibold text-amber-900">
            宛先メモ(任意)
          </label>
          <input
            name="email"
            type="text"
            placeholder="例: tanaka@example.com / 田中先生"
            maxLength={200}
            className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <p className="mt-1 text-[10px] text-amber-700/60">
            管理用メモ。誰宛か思い出すために使います(なくてもOK)。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-amber-900">
              役割
            </label>
            <select
              name="role"
              defaultValue="staff"
              className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="staff">スタッフ</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-900">
              有効期限
            </label>
            <select
              name="expiresInDays"
              defaultValue="14"
              className="mt-1 h-10 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="3">3日</option>
              <option value="7">1週間</option>
              <option value="14">2週間</option>
              <option value="30">1ヶ月</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-full bg-amber-500 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? '発行中…' : '✨ 招待リンクを発行する'}
        </button>

        {state?.ok === false && (
          <p className="text-center text-xs text-red-600">{state.message}</p>
        )}
      </form>

      {state?.ok && (
        <CopyableInvite
          url={inviteUrl(state.token)}
          message="招待リンクを発行しました ✨ 下のURLをコピーして渡してください"
        />
      )}

      <h3 className="mt-6 text-sm font-semibold text-amber-900">
        発行済みの招待({invitations.length}件)
      </h3>
      {invitations.length === 0 ? (
        <p className="mt-2 text-xs text-amber-700/70">
          まだ未使用の招待はありません。
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {invitations.map((inv) => (
            <InvitationRow
              key={inv.id}
              invitation={inv}
              url={inviteUrl(inv.token)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function InvitationRow({
  invitation,
  url,
}: {
  invitation: Invitation;
  url: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showUrl, setShowUrl] = useState(false);

  const handleRevoke = () => {
    if (!window.confirm('この招待を取り消しますか?(リンクは無効になります)')) {
      return;
    }
    startTransition(async () => {
      await revokeInvitation(invitation.id);
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setShowUrl(true);
      setTimeout(() => setShowUrl(false), 2000);
    } catch {
      setShowUrl(true);
    }
  };

  const expired = new Date(invitation.expires_at) < new Date();

  return (
    <li className="rounded-2xl bg-amber-50/60 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-amber-900">
            {invitation.email || '(宛先メモなし)'}
          </p>
          <p className="text-[10px] text-amber-700/70">
            {invitation.role === 'admin' ? '管理者' : 'スタッフ'} · 期限:{' '}
            {format(new Date(invitation.expires_at), 'M月d日 HH:mm', {
              locale: ja,
            })}
            {expired && (
              <span className="ml-1 text-red-600">(期限切れ)</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full bg-white px-2 py-1 font-semibold text-amber-800 shadow-sm hover:bg-amber-50"
          >
            {showUrl ? 'コピー済' : '📋 コピー'}
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={pending}
            className="rounded-full px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            🗑
          </button>
        </div>
      </div>
    </li>
  );
}

function CopyableInvite({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">{message}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[11px]"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-amber-600"
        >
          {copied ? 'OK ✓' : 'コピー'}
        </button>
      </div>
    </div>
  );
}
