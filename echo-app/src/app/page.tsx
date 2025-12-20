import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { VibeDashboard } from '@/components/features/vibes/VibeDashboard'
import { signout } from './auth/signout/actions'

import { SetupForm } from '@/components/features/auth/SetupForm'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to get family_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    // @ts-expect-error - Types inference issue with manual schema
    .eq('id', user.id)
    .single()

  // @ts-expect-error - Types inference issue with manual schema
  if (!profile || !profile.family_id) {
    // Handle edge case: User has no family yet (shouldn't happen with current signup flow but good to be safe)
    // Maybe redirect to a 'setup profile' or 'join family' page if we had one separate from signup
    // For now, let's assume valid state or show a message.
    // Use the SetupForm component to handle client-side switching
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-stone-50 font-sans p-6 text-center space-y-4"
        suppressHydrationWarning
      >
        <SetupForm userEmail={user.email || ''} />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-6 bg-stone-50">
      <header className="w-full max-w-md flex justify-between items-center mb-12">
        <h1 className="text-xl font-serif font-bold text-stone-800">Echo</h1>
        <form action={signout}>
          {/* We need a signout action, defaulting to simple button that might strictly not work without the action file, 
               but I'll add a signout button for now and I might need to implement the signout action action. 
               Wait, I haven't implemented signout action yet. I'll just put a placeholder or link to api. 
               actually, I can make a button usage with a server action inline if I was using a form, 
               or just a client component button. Let's keep it simple: */}
          <button className="text-xs text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-widest">
            Sign Out
          </button>
        </form>
      </header>

      <VibeDashboard
        userId={user.id}
        // @ts-expect-error - Types inference issue
        familyId={profile.family_id}
        // @ts-expect-error - Types inference issue
        initialMyVibe={profile.current_vibe || 'Neutral'}
      />
    </main>
  )
}
