'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/utils/supabase/types'

type Glow = Database['public']['Tables']['glows']['Row']

export function useGlows(userFamilyId: string, currentUserId: string) {
    const [glows, setGlows] = useState<Glow[]>([])
    const supabase = createClient()

    useEffect(() => {
        if (!userFamilyId) return

        // 1. Initial Fetch of UNREAD glows
        const fetchGlows = async () => {
            const { data } = await supabase
                .from('glows')
                .select('*')
                .eq('family_id', userFamilyId)
                .eq('is_read', false)
                .order('created_at', { ascending: true })

            if (data) {
                setGlows(data)
            }
        }

        fetchGlows()

        // 2. Realtime Subscription
        const channel = supabase
            .channel(`glows-${userFamilyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'glows',
                },
                (payload) => {
                    console.log('Realtime Event:', payload)

                    // Client-side filtering as backup/fix for filter string issues
                    const rec = payload.new as Glow
                    if (rec && rec.family_id !== userFamilyId) return

                    if (payload.eventType === 'INSERT') {
                        const newGlow = payload.new as Glow
                        setGlows((prev) => {
                            if (prev.some(g => g.id === newGlow.id)) return prev
                            return [...prev, newGlow]
                        })
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedGlow = payload.new as Glow
                        if (updatedGlow.is_read) {
                            setGlows((prev) => prev.filter(g => g.id !== updatedGlow.id))
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status:`, status)
            })

        return () => {
            console.log('Unsubscribing from glows channel')
            supabase.removeChannel(channel)
        }
    }, [userFamilyId, supabase])

    const sendGlow = async (message: string) => {
        // Optimistic Update: Show immediately for sender
        const tempId = crypto.randomUUID()
        const optimisticGlow: Glow = {
            id: tempId,
            family_id: userFamilyId,
            sender_id: currentUserId,
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        }

        setGlows(prev => [...prev, optimisticGlow])

        const { data, error } = await (supabase
            .from('glows') as any)
            .insert({
                family_id: userFamilyId,
                sender_id: currentUserId,
                message: message
            })
            .select() // Return the real row to swap temp ID if needed
            .single()

        if (error) {
            console.error('Error sending glow:', error)
            // Revert optimistic update on error
            setGlows(prev => prev.filter(g => g.id !== tempId))
        } else if (data) {
            // Swap optimistic ID with real ID if necessary, or let Realtime handle it (dedupe logic)
            // Better: dedupe logic in 'setGlows' handles the ID mismatch if we are careful.
            // But realtime echo might come with real ID.
            // Let's replace the optimistic one with the real data.
            setGlows(prev => prev.map(g => g.id === tempId ? (data as Glow) : g))
        }
    }

    const markAsRead = async (glowId: string) => {
        // Optimistic update
        setGlows((prev) => prev.filter(g => g.id !== glowId))

        const { error } = await (supabase
            .from('glows') as any)
            .update({ is_read: true })
            .eq('id', glowId)

        if (error) console.error('Error reading glow:', error)
    }

    return { glows, sendGlow, markAsRead }
}
