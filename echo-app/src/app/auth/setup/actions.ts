'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resetAccount() {
    const supabase = createClient()
    const { data: { user } } = await (await supabase).auth.getUser()

    if (user) {
        // Delete the user from auth.users (requires service role, but we can't use that here safely without proper setup).
        // Instead, let's just delete the profile row IF it existed (it doesn't).

        // Actually, as a user, you can't delete yourself from auth.users easily without an admin function.
        // But we can ensure we "Reset" the flow. 

        // Changing approach: The user wants to "reset tables". I cannot do that directly via client.
        // I will guide them to use 'Create New Space' or implement the missing 'Create Profile' step.

        // Let's implement a "Complete Setup" action they can trigger from the 'No Family' screen.
        // But per request "reset table data", I will provide a script they can run in SQL Editor or just tell them to use a new email.
    }
}

// Better approach: enable proper Profile creation for existing users with no family.
export async function createFamily(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const displayName = formData.get('displayName') as string || 'Member'
    const familyName = `${displayName}'s Family`

    const { data: family, error: familyError } = await (supabase
        .from('families') as any)
        .insert({ name: familyName })
        .select()
        .single()

    if (familyError) throw familyError

    const { error: profileError } = await (supabase
        .from('profiles') as any)
        .upsert({
            id: user.id,
            family_id: (family as any).id,
            display_name: displayName,
            current_vibe: 'Neutral'
        })

    if (profileError) throw profileError

    redirect('/')
}

export async function joinFamily(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const familyId = formData.get('familyId') as string
    const displayName = formData.get('displayName') as string || 'Member'

    const { error: profileError } = await (supabase
        .from('profiles') as any)
        .upsert({
            id: user.id,
            family_id: familyId,
            display_name: displayName,
            current_vibe: 'Neutral'
        })

    if (profileError) {
        return redirect('/?error=Invalid Family ID')
    }

    redirect('/')
}
