'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/utils/supabase/types'
import { scheduleTalk, cancelTalk } from '@/app/actions/talk'

type Talk = Database['public']['Tables']['scheduled_talks']['Row']

export function useTalks(userFamilyId: string) {
    const [upcomingTalks, setUpcomingTalks] = useState<Talk[]>([])
    const supabase = createClient()

    useEffect(() => {
        if (!userFamilyId) return

        const fetchTalks = async () => {
            console.log('Fetching talks for family:', userFamilyId)
            const { data, error } = await (supabase.from('scheduled_talks') as any)
                .select('*')
                .eq('family_id', userFamilyId)
                .in('status', ['pending', 'started']) // Fetch started too
                .order('scheduled_at', { ascending: true })

            if (error) console.error('Error fetching talks:', error)

            if (data) {
                const now = new Date()
                // Filter relevant talks
                const validTalks = data.filter((t: Talk) => {
                    const scheduled = new Date(t.scheduled_at)
                    // Allow if future or recent (started in last hour)
                    return scheduled.getTime() > now.getTime() - (60 * 60 * 1000)
                })

                setUpcomingTalks(validTalks)
            } else {
                setUpcomingTalks([])
            }
        }

        fetchTalks()

        // Polling fallback: Fetch every 5 seconds to ensure sync if Realtime fails
        const pollInterval = setInterval(() => {
            // console.log('Polling talks...') // Reduced noise
            fetchTalks()
        }, 5000)

        const channel = supabase.channel(`talks-${userFamilyId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'scheduled_talks',
                filter: `family_id=eq.${userFamilyId}` // Restore filter for better RLS alignment
            }, (payload) => {
                console.log('Realtime Talk Event received:', payload)
                fetchTalks()
            })
            .subscribe((status) => {
                console.log(`Talks Subscription Status for family ${userFamilyId}:`, status)
            })

        return () => {
            console.log('Unsubscribing from talks')
            clearInterval(pollInterval)
            supabase.removeChannel(channel)
        }
    }, [userFamilyId, supabase])

    return {
        upcomingTalks,
        scheduleTalk: (theme: string, date: Date) => scheduleTalk(userFamilyId, theme, date),
        cancelTalk: async (id: string) => {
            // Optimistic update
            setUpcomingTalks(prev => prev.filter(t => t.id !== id))
            await cancelTalk(id)
        }
    }
}
