'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/utils/supabase/types'

type Glow = Database['public']['Tables']['glows']['Row']

export function useGlows(userFamilyId: string, currentUserId: string) {
    const [glows, setGlows] = useState<Glow[]>([])
    const [savedGlows, setSavedGlows] = useState<Glow[]>([])
    const supabase = createClient()

    useEffect(() => {
        console.log('[useGlows] Subscribing with Family ID:', userFamilyId)
        if (!userFamilyId) return

        // 1. Initial Fetch of UNREAD and SAVED glows
        const fetchGlows = async () => {
            // Unread - ONLY glows sent TO me
            const { data: unreadData } = await (supabase
                .from('glows') as any)
                .select('*')
                .eq('family_id', userFamilyId)
                .eq('is_read', false)
                .neq('sender_id', currentUserId)
                .order('created_at', { ascending: true })

            if (unreadData) {
                setGlows(unreadData)
            }

            // Saved (The Bank) - ONLY glows sent TO me (so sender != me)
            const { data: savedData } = await (supabase
                .from('glows') as any)
                .select('*')
                .eq('family_id', userFamilyId)
                .eq('is_saved', true)
                .neq('sender_id', currentUserId) // KEY FIX: Only show ones I received
                .order('created_at', { ascending: false }) // Newest first for bank

            if (savedData) {
                setSavedGlows(savedData)
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
                    filter: `family_id=eq.${userFamilyId}`,
                },
                (payload) => {
                    console.log('[Realtime] Event received:', payload)
                    console.log('[Realtime] Filter ID:', userFamilyId)

                    if (payload.eventType === 'INSERT') {
                        const newGlow = payload.new as any
                        // Only add to 'glows' (unread) if it's not me sending it
                        if (!newGlow.is_read && newGlow.sender_id !== currentUserId) {
                            setGlows((prev) => {
                                if (prev.some(g => g.id === newGlow.id)) return prev
                                return [...prev, newGlow]
                            })
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedGlow = payload.new as any
                        // If it became read, remove from 'glows' (active)
                        if (updatedGlow.is_read) {
                            setGlows((prev) => prev.filter(g => g.id !== updatedGlow.id))
                        }

                        // If it became saved AND it was sent to me (sender != me)
                        if (updatedGlow.is_saved && updatedGlow.sender_id !== currentUserId) {
                            setSavedGlows((prev) => {
                                // Check if exists, update or add
                                const exists = prev.find(g => g.id === updatedGlow.id)
                                if (exists) return prev.map(g => g.id === updatedGlow.id ? updatedGlow : g)
                                return [updatedGlow, ...prev]
                            })
                        } else {
                            // If it's NOT saved anymore OR if it's not for me, ensure it's removed
                            setSavedGlows((prev) => prev.filter(g => g.id !== updatedGlow.id))
                        }
                    }
                }
            )
            .subscribe()

        return () => {
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
            created_at: new Date().toISOString(),
            is_saved: false // Default
        }

        setGlows(prev => [...prev, optimisticGlow])

        try {
            // Import dynamically to avoid top-level server module issues in client components? 
            // Actually it's fine if 'actions/glows' is 'use server'
            const { sendGlowAction } = await import('@/app/actions/glows')
            const realGlow = await sendGlowAction(message)

            // Replace optimistic with real
            setGlows(prev => prev.map(g => g.id === tempId ? (realGlow as Glow) : g))

        } catch (error: any) {
            console.error('Error sending glow:', error)
            setGlows(prev => prev.filter(g => g.id !== tempId))
            alert(`Failed: ${error.message || 'Unknown error'}`)
        }
    }

    const markAsRead = async (glowId: string) => {
        setGlows((prev) => prev.filter(g => g.id !== glowId))
        await (supabase.from('glows') as any).update({ is_read: true }).eq('id', glowId)
    }

    const saveGlow = async (glowId: string) => {
        // Optimistic: Add to savedGlows, remove from glows (if active)
        const glow = glows.find(g => g.id === glowId)
        if (glow) {
            const savedVersion = { ...glow, is_read: true, is_saved: true }
            setSavedGlows(prev => [savedVersion, ...prev])
            setGlows(prev => prev.filter(g => g.id !== glowId))
        }

        const { error } = await (supabase.from('glows') as any)
            .update({ is_read: true, is_saved: true })
            .eq('id', glowId)

        if (error) console.error('Error saving glow:', error)
    }

    const deleteGlow = async (glowId: string) => {
        setSavedGlows(prev => prev.filter(g => g.id !== glowId))
        await (supabase.from('glows') as any).update({ is_saved: false }).eq('id', glowId)
    }

    return { glows, savedGlows, sendGlow, markAsRead, saveGlow, deleteGlow }
}
