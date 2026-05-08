import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('facility_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.facility_id) {
    redirect('/home');
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="魔法のランプnote"
            width={560}
            height={315}
            className="h-auto w-full max-w-sm"
            priority
          />
          <h2 className="mt-2 text-xl font-bold tracking-tight text-amber-900">
            事業所をはじめましょう
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-800/80">
            あなたのお勤め先の名前を教えてください。
            <br />
            ここから、ジーニーとの記録の旅がはじまります。
          </p>
        </div>

        <div className="mt-6">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
