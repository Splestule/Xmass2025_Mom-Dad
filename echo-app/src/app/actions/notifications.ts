'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import webpush from 'web-push'

// Configure Web Push (Global)
webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

export async function subscribeUser(sub: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Save sub to DB
    console.log('[subscribeUser] Saving for:', user.id)
    const { error } = await (supabase.from('push_subscriptions') as any).upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: 'browser' // Simplified
    }, { onConflict: 'endpoint' })

    if (error) {
        console.error('[subscribeUser] DB Error:', error)
        throw new Error('Failed to save subscription: ' + error.message)
    } else {
        console.log('[subscribeUser] Success!')
    }
}

export async function sendNotificationToUser(userId: string, title: string, body: string, url = '/') {
    // USE ADMIN CLIENT TO BYPASS RLS (So Sender can read Receiver's subs)
    const supabase = createAdminClient()

    // 1. Fetch user's subscriptions
    const { data: subs } = await (supabase.from('push_subscriptions') as any)
        .select('*')
        .eq('user_id', userId)

    console.log(`[Push] Sending to User: ${userId}`)
    console.log(`[Push] Found Subscriptions: ${subs?.length || 0}`)

    if (!subs || subs.length === 0) return { sent: 0 }

    // 2. Send to all endpoints
    const payload = JSON.stringify({ title, body, url })

    let sentCount = 0
    await Promise.all(subs.map(async (sub: any) => {
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }, payload)
            sentCount++
        } catch (error: any) {
            console.error('Push Failed for sub:', sub.id, error)
            if (error.statusCode === 410) {
                // Expired, delete it
                await (supabase.from('push_subscriptions') as any).delete().eq('id', sub.id)
            }
        }
    }))

    return { sent: sentCount }
}

// Ensure "Test Notification" works for SELF
export async function sendTestNotification() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    return await sendNotificationToUser(
        user.id,
        "Test Ping! 🔔",
        "If you see this, notifications are working properly on this device!",
        "/?test=true"
    )
}

// Helper to notify everyone in a family (broadcast)
export async function notifyFamily(familyId: string, title: string, body: string, url = '/') {
    // USE ADMIN CLIENT to see all family members regardless of RLS
    // This ensures the initiator also gets the notification
    const supabase = createAdminClient()

    console.log(`[Push] Broadcaster: Processing family ${familyId}`)

    // Fetch all members of the family
    const { data: familyMembers, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('family_id', familyId) as { data: any[] | null, error: any }

    if (error || !familyMembers || familyMembers.length === 0) {
        console.log('[Push] Broadcaster: No family members found or error:', error)
        return { sent: 0 }
    }

    console.log(`[Push] Broadcaster: Found ${familyMembers.length} members to notify.`)

    let totalSent = 0
    // Send to each member sequentially to avoid connection limit issues and for better logging
    for (const member of familyMembers) {
        console.log(`[Push] Broadcaster: Sending to member ${member.display_name} (${member.id})`)
        const result = await sendNotificationToUser(member.id, title, body, url)
        totalSent += result.sent
        console.log(`[Push] Broadcaster: Sent ${result.sent} to ${member.id}`)
    }

    console.log(`[Push] Broadcaster: Broadcast complete. Total sent: ${totalSent}`)
    return { sent: totalSent }
}

// Helper to notify specifically the PARTNER in a family (proposal/request)
export async function notifyPartner(familyId: string, title: string, body: string, url = '/') {
    // Use standard client to respect user session context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { sent: 0 }

    // Find Partner (Anyone in family who is NOT the current user)
    const { data: familyMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', familyId)
        .neq('id', user.id)

    // Select the first partner found
    const partnerId = (familyMembers as any)?.[0]?.id

    if (partnerId) {
        console.log(`[Push] Partner: Notifying partner ${partnerId}`)
        return await sendNotificationToUser(partnerId, title, body, url)
    }

    console.log(`[Push] Partner: No partner found in family ${familyId}`)
    return { sent: 0 }
}
