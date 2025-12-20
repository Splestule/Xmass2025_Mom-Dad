'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // Type-casting here for simplicity, but in a real app you'd want validation
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const familyId = formData.get('familyId') as string
    const displayName = formData.get('displayName') as string

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        },
    })

    if (authError) {
        return redirect('/signup?error=Could not create user')
    }

    if (authData.user && !authData.session) {
        // Email verification is likely enabled
        return redirect('/login?message=Check your email to verify your account')
    }

    if (authData.user && authData.session) {
        // 2. Create the profile link
        // We need to handle the case where familyId is new or existing.
        // For this MVP, we will assume if familyId is provided it exists, 
        // or if they want to create a new one we might need a separate flow/checkbox.
        // Simplified: Just try to update the profile that trigger automatically created? 
        // Or insert if the trigger didn't run? 
        // Best practice with Supabase is usually to use a trigger for profiles, 
        // but here we might need to manually insert if we have custom fields like family_id right away.

        // Let's assume we update the profile found by ID, or insert if not present.
        // Actually, we can just UPSERT to be safe.

        // If familyId is "create_new", we create a family first.
        let targetFamilyId = familyId;

        if (familyId === 'create_new') {
            const { data: familyData, error: familyError } = await supabase
                .from('families')
                // @ts-expect-error - Types inference issue with manual schema
                .insert({ name: `${displayName}'s Family` })
                .select()
                .single()

            if (familyError) {
                return redirect('/signup?error=Could not create family')
            }
            targetFamilyId = familyData.id
        }

        const { error: profileError } = await supabase
            .from('profiles')
            // @ts-expect-error - Types inference issue with manual schema
            .upsert({
                id: authData.user.id,
                family_id: targetFamilyId,
                display_name: displayName,
                current_vibe: 'Neutral'
            })

        if (profileError) {
            // In a real app we might want to rollback the user creation or retry
            console.error('Profile creation error:', profileError)
            return redirect('/signup?error=Error creating profile')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
