'use client';

import { useEffect, useState } from 'react';

/**
 * よくある「アプリ内ブラウザ」(WebView)を user agent から検知。
 * これらは Google OAuth で disallowed_useragent エラーを起こすため、
 * 検知時にユーザーへ別ブラウザ or Magic Link への誘導を表示する。
 */
function detectInAppBrowser(ua: string): string | null {
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('line/')) return 'LINE';
  if (uaLower.includes('fban') || uaLower.includes('fbav') || uaLower.includes('fb_iab')) return 'Facebook';
  if (uaLower.includes('instagram')) return 'Instagram';
  if (uaLower.includes('tiktok') || uaLower.includes('musical_ly') || uaLower.includes('bytedancewebview') || uaLower.includes('aweme')) return 'TikTok';
  if (uaLower.includes('twitter')) return 'X (Twitter)';
  if (uaLower.includes('kakaotalk')) return 'KakaoTalk';
  if (uaLower.includes('micromessenger')) return 'WeChat';
  // Android の汎用 WebView 標識
  if (uaLower.includes('; wv)')) return 'アプリ内ブラウザ';
  return null;
}

export function WebViewWarning() {
  const [appName, setAppName] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setAppName(detectInAppBrowser(navigator.userAgent));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!appName) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
    >
      <p className="font-semibold">
        📱 {appName} のアプリ内ブラウザでは Google ログインができません
      </p>
      <p className="mt-1.5 text-amber-800/90">
        右上の <span className="font-semibold">⋯</span> メニューから「
        <span className="font-semibold">Chrome で開く</span>
        」または「
        <span className="font-semibold">Safari で開く</span>
        」を選んでください。
      </p>
      <p className="mt-1.5 text-amber-800/90">
        または、下の「
        <span className="font-semibold">✉️ メールでリンクを送る</span>
        」を使えばこのままでも入れます(パスワード不要)。
      </p>
    </div>
  );
}
