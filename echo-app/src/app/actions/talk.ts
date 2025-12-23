'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyPartner, notifyFamily } from './notifications'

export async function scheduleTalk(familyId: string, theme: string, scheduledAt: Date) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await (supabase.from('scheduled_talks') as any).insert({
        family_id: familyId,
        initiator_id: user.id,
        theme,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending'
    })

    if (error) {
        console.error('Failed to schedule talk:', error)
        throw new Error(`Could not schedule talk: ${error.message}`)
    }

    // 4. Send Notification
    const dateStr = scheduledAt.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    await notifyPartner(
        familyId,
        `🗣️ Let's Talk: ${theme}`,
        `Proposed time: ${dateStr}`,
        '/'
    )

    revalidatePath('/')
}

export async function cancelTalk(talkId: string) {
    const supabase = await createClient()

    const { error } = await (supabase.from('scheduled_talks') as any)
        .delete()
        .eq('id', talkId)

    if (error) {
        console.error('Failed to cancel talk:', error)
        throw new Error('Could not cancel talk')
    }

    revalidatePath('/')
}

export async function notifyTalkDueAction(talkId: string) {
    console.log(`[TalkAction] Received trigger for talk: ${talkId}`)
    const supabase = await createClient()

    // Atomic update to 'started' only if it was 'pending'
    // This prevents multiple devices from triggering the same notification
    const { data: updated, error: updateError } = await (supabase.from('scheduled_talks') as any)
        .update({ status: 'started' })
        .eq('id', talkId)
        .eq('status', 'pending')
        .select()
        .single()

    if (updateError || !updated) {
        console.log(`[TalkAction] Update failed for ${talkId}. Status might already be 'happening' or record missing.`, updateError?.message)
        return { success: false, reason: 'Already notified or not found' }
    }

    console.log(`[TalkAction] Claimed notification for talk: ${updated.theme} (${talkId})`)

    // Since we successfully claimed the notification, send it
    await notifyFamily(
        updated.family_id,
        "⏰ It's time to talk!",
        `Theme: "${updated.theme}"`,
        '/'
    )

    return { success: true }
}
