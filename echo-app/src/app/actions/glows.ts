'use server'

import { createClient } from '@/utils/supabase/server'
import { notifyPartner } from './notifications'

export async function sendGlowAction(message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Get User Profile to know Family ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('family_id, display_name')
        .eq('id', user.id)
        .single() // Use .single() correctly here since 'id' is PK

    // @ts-ignore
    const familyId = profile?.family_id
    // @ts-ignore
    const senderName = profile?.display_name || 'Partner'

    if (!familyId) throw new Error('No family found')

    // 2. Insert Glow
    const { data: glow, error } = await (supabase.from('glows') as any)
        .insert({
            family_id: familyId,
            sender_id: user.id,
            message: message,
            is_read: false,
            is_saved: false
        })
        .select()
        .single()

    if (error) throw new Error(error.message)

    // 3. Send Notification
    await notifyPartner(
        familyId,
        `✨ New Glow from ${senderName}`,
        message,
        '/'
    )

    return glow
}
