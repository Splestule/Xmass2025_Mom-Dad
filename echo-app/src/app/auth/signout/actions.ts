'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signout() {
    const supabase = createClient()
    await (await supabase).auth.signOut()
    redirect('/login')
}
