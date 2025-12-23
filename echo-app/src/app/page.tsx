import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { VibeDashboard } from '@/components/features/vibes/VibeDashboard'
import { signout } from './auth/signout/actions'
import { SetupForm } from '@/components/features/auth/SetupForm'
import { Button } from '@/components/ui/Button'
import { NotificationBell } from '@/components/layout/NotificationBell'

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
    .eq('id', user.id)
    .single()

  if (!profile || !(profile as any).family_id) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-background font-sans p-6 text-center space-y-4"
        suppressHydrationWarning
      >
        <SetupForm userEmail={user.email || ''} />
      </div>
    )
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-background text-foreground relative">
      <VibeDashboard
        userId={user.id}
        // @ts-expect-error - Types inference issue
        familyId={profile.family_id}
        // @ts-expect-error - Types inference issue
        initialMyVibe={profile.current_vibe || 'Neutral'}
        signOutAction={signout}
      />
    </main>
  )
}
