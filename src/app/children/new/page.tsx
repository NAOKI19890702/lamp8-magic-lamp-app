import Link from 'next/link';
import { requireFacilityUser } from '@/lib/db/auth-context';
import { ChildForm } from './child-form';

export default async function NewChildPage() {
  await requireFacilityUser();

  return (
    <main className="flex flex-1 items-start justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            className="text-sm text-amber-700 hover:text-amber-900"
          >
            ← 戻る
          </Link>
          <p className="text-2xl">🌱</p>
        </div>

        <div className="mt-2 text-center">
          <h1 className="text-xl font-bold text-amber-900">
            新しいおともだち
          </h1>
          <p className="mt-1 text-xs text-amber-800/70">
            記録するお子さんの情報を教えてください。
          </p>
        </div>

        <div className="mt-6">
          <ChildForm />
        </div>
      </div>
    </main>
  );
}
