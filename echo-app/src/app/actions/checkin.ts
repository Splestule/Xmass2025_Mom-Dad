'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from 'next/cache'
import { notifyFamily } from './notifications'

export async function submitCheckInResponse(familyId: string, checkinId: string, temperature: number, notes: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: probe } = await (supabase.from('checkins') as any).select('*').limit(1).single()
    console.log('[PROBE] Checkins columns:', Object.keys(probe || {}))

    if (!user) throw new Error('Unauthorized')

    // 1. Insert Response
    const { error: insertError } = await (supabase.from('checkin_responses') as any).upsert({
        checkin_id: checkinId,
        user_id: user.id,
        temperature,
        notes
    }, { onConflict: 'checkin_id, user_id' })

    if (insertError) {
        console.error('Error submitting response:', insertError)
        throw new Error('Failed to submit check-in')
    }

    revalidatePath('/') // Refresh dashboard

    // 2. Check if both have responded
    // Simple count check
    const { count } = await (supabase.from('checkin_responses') as any)
        .select('*', { count: 'exact', head: true })
        .eq('checkin_id', checkinId)

    // Assuming 2 partners
    if (count === 2) {
        // Trigger AI generation (with Race Condition Protection)
        // Optimistic Lock: Try to flip status to 'processing'.
        // Only ONE request will succeed in doing this.
        const { data: updatedRows } = await (supabase.from('checkins') as any)
            .update({ status: 'processing' })
            .eq('id', checkinId)
            .eq('status', 'pending')
            .select()

        if (updatedRows && updatedRows.length > 0) {
            console.log('Acquired lock for AI Generation.')
            try {
                await generateCheckInTopic(familyId, checkinId)
            } catch (e) {
                console.error('AI Generation error swallowed:', e)
                // Even if this throws, we want to ensure the UI updates if possible, 
                // but generateCheckInTopic handles its own try/catch/fallback now.
            }
        } else {
            console.log('Another process is already handling AI Generation.')
        }
    }
}

// Safe way to trigger AI manually if stuck
export async function reconcileCheckIn(familyId: string, checkinId: string) {
    const supabase = await createClient()
    const { count } = await (supabase.from('checkin_responses') as any)
        .select('*', { count: 'exact', head: true })
        .eq('checkin_id', checkinId)

    if (count === 2) {
        await generateCheckInTopic(familyId, checkinId)
    }
}

async function generateCheckInTopic(familyId: string, checkinId: string) {
    const supabase = await createClient()

    // Fetch all responses for this check-in
    const { data: responses } = await (supabase.from('checkin_responses') as any)
        .select('user_id, temperature, notes')
        .eq('checkin_id', checkinId)

    if (!responses || responses.length < 2) return

    // Default Fallback Topic
    let aiTopic = {
        title: "Connection Time",
        description: "Take 15 minutes to simply sit together and talk about your week. How are you really doing?"
    }

    try {
        // Fetch Profile Names manually to be safe with types/relations
        const userIds = responses.map((r: any) => r.user_id)
        const { data: profiles } = await supabase.from('profiles')
            .select('id, display_name')
            .in('id', userIds) as any

        const partnerA = responses[0]
        const nameA = profiles?.find((p: any) => p.id === partnerA.user_id)?.display_name || 'Partner A'

        const partnerB = responses[1]
        const nameB = profiles?.find((p: any) => p.id === partnerB.user_id)?.display_name || 'Partner B'

        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            console.warn('Missing GEMINI_API_KEY, using fallback topic.')
        } else {
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `
                You are a thoughtful, low-key advisor for a couple. Your goal is to suggest a 15-minute connection point that feels like a natural conversation two adults would actually have. 

                DATA:
                - Partner A (${nameA}): ${partnerA.temperature}/10. Notes: "${partnerA.notes || 'No notes'}"
                - Partner B (${nameB}): ${partnerB.temperature}/10. Notes: "${partnerB.notes || 'No notes'}"

                REQUIREMENTS:
                1. ADULT TONE: Use mature, direct language. Avoid "perky" adjectives, exclamation points, and "announcing" the game (e.g., avoid "Alright friends!" or "Let's play!"). 
                2. PSYCHOLOGICAL SUBSTANCE: 
                - If moods are high: Focus on "Expansion." Ask questions about their evolving tastes, hidden opinions, or future "what-ifs" that reveal personality.
                - If moods are low: Focus on "Co-Regulation." Suggest a low-energy way to decompress together without making it a "project."
                - If mixed: Focus on "Attunement." Create a space for the stressed partner to feel seen without the other feeling pressured to fix it.
                3. GOOFY BUT SMART: "Would you rather" or "goofy" questions should be thought-provoking, not childish. (e.g., "What’s a hill you’re willing to die on?")
                4. CONSTRAINTS: 
                - Do NOT mention the word "score," "temperature," or the numerical values.
                - Do NOT use buzzwords like "supercharge," "spark," or "journey."
                - Maximum 3 sentences for the description.

                Return JSON ONLY: 
                { 
                "title": "A concise, plain-language title", 
                "description": "A direct invitation or question for them to discuss." 
                }
            `

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            // Fix: response.text is a property in the new SDK
            const text = response.text || ''

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
            aiTopic = JSON.parse(jsonStr)
        }
    } catch (e) {
        console.error('AI Generation failed (using fallback):', e)
    }

    // Update Checkin Status (Always completes)
    await (supabase.from('checkins') as any).update({
        status: 'completed',
        ai_topic: aiTopic
    }).eq('id', checkinId)

    revalidatePath('/')
}

export async function updateCheckInTimer(checkinId: string, action: 'start' | 'pause' | 'reset') {
    const supabase = await createClient()

    let updateData: any = {}

    if (action === 'start') {
        updateData = { timer_started_at: new Date().toISOString() }
    } else if (action === 'pause') {
        // Pausing is tricky with just a start time. 
        // For MVP, "Pause" just clears the start time (Stop). 
        // To support "Resume", we'd need 'elapsed_seconds' stored.
        // Let's stick to Simple Timer: Start = Set Time, Pause/Reset = Clear Time.
        // Actually, let's treat "Pause" as Stop/Reset for now to keep it simple as requested "one clock".
        // Or better: store "timer_target_end_at"? 
        // Let's stick to the plan: start sets `timer_started_at`.
        // If we want "Pause", we need to know how much time passed.
        // Let's just implement Start (Restart) and Stop (Reset) for now.
        updateData = { timer_started_at: null }
    } else if (action === 'reset') {
        updateData = { timer_started_at: null }
    }

    const { error } = await (supabase.from('checkins') as any).update(updateData).eq('id', checkinId)

    if (error) {
        console.error('Failed to update timer:', error)
        throw new Error(error.message)
    }

    revalidatePath('/')
}
export async function resetWeekCheckIn(familyId: string, checkinId: string) {
    const supabase = await createClient()

    // Call the RPC function to bypass RLS and delete everything cleanly
    const { error } = await supabase.rpc('reset_checkin_week', { target_checkin_id: checkinId } as any)

    if (error) {
        console.error('Failed to reset week via RPC:', error)
        throw new Error(`Could not reset week: ${error.message}`)
    }

    revalidatePath('/')
}

export async function testGeminiConnection() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { success: false, message: 'GEMINI_API_KEY is missing from environment variables.' }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say 'AI is working' if you can hear me.",
        });
        const text = response.text || ''
        return { success: true, message: `Success! AI responded: "${text}"` }
    } catch (e: any) {
        console.error('Gemini Test Failed:', e)
        return { success: false, message: `API Call Failed: ${e.message}` }
    }
}

export async function regenerateCheckInTopic(familyId: string, checkinId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Call generation again
    try {
        await generateCheckInTopic(familyId, checkinId)
        revalidatePath('/')
        return { success: true }
    } catch (e: any) {
        console.error('Regeneration failed:', e)
        return { success: false, error: e.message }
    }
}

export async function notifyConnectionCompleteAction(checkinId: string, familyId: string) {
    const supabase = await createClient()

    // 1. Fetch current checkin to get the topic
    const { data: checkin, error: fetchError } = await (supabase.from('checkins') as any)
        .select('ai_topic, status')
        .eq('id', checkinId)
        .single()

    if (fetchError || !checkin) {
        console.error('[NotifyConnection] Fetch failed:', fetchError)
        return { success: false }
    }

    // 2. If already notified, stop
    if (checkin.ai_topic?.timer_notified) {
        console.log('[NotifyConnection] Already notified for:', checkinId)
        return { success: false, reason: 'already_notified' }
    }

    // 3. Attempt Atomic Lock (Updating status or JSON)
    // We'll use status='completed' -> status='happened' IF we can, 
    // but a safer way is JSON update with a check.
    // To be truly atomic in JS without raw SQL, we use .eq('ai_topic', checkin.ai_topic)
    // which acts as an Optimistic Lock.
    console.log('[NotifyConnection] Attempting lock...', { checkinId, currentTopic: checkin.ai_topic })

    const { data: updated, error: updateError } = await (supabase.from('checkins') as any)
        .update({
            ai_topic: { ...checkin.ai_topic, timer_notified: true }
        })
        .eq('id', checkinId)
        .eq('ai_topic', checkin.ai_topic) // ONLY if nothing changed since we read it
        .select()

    if (updateError) {
        console.error('[NotifyConnection] Update Error:', updateError)
    }

    if (updateError || !updated || updated.length === 0) {
        console.log('[NotifyConnection] Race condition caught or update failed.', { updatedLength: updated?.length })
        return { success: false, reason: 'race_condition' }
    }

    // 4. If we won the race, send the broadcast
    console.log('[NotifyConnection] Sending broadcast for family:', familyId)
    await notifyFamily(
        familyId,
        "✨ Connection Complete",
        "The connection timer has finished. Take a moment to appreciate each other.",
        '/'
    )

    return { success: true }
}
