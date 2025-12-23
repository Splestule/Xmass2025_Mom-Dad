'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/utils/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function useVibes(userFamilyId: string, currentUserId: string) {
    const [partnerVibe, setPartnerVibe] = useState<string>('Neutral')
    const [myVibe, setMyVibe] = useState<string>('Neutral')
    const [partnerName, setPartnerName] = useState<string>('Partner')
    const supabase = createClient()

    useEffect(() => {
        if (!userFamilyId) return

        // 1. Initial Fetch
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('family_id', userFamilyId)

            if (data) {
                // @ts-expect-error - Types inference issue with manual schema
                const me = data.find((p) => p.id === currentUserId)
                const partner = data.find((p) => p.id !== currentUserId)

                if (me?.current_vibe) setMyVibe(me.current_vibe)
                if (partner?.current_vibe) setPartnerVibe(partner.current_vibe)
                if (partner?.display_name) setPartnerName(partner.display_name)
            }
        }

        fetchProfiles()

        // 2. Realtime Subscription
        const channel = supabase
            .channel('vibes-channel')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `family_id=eq.${userFamilyId}`,
                },
                (payload) => {
                    const updatedProfile = payload.new as Profile
                    if (updatedProfile.id !== currentUserId) {
                        setPartnerVibe(updatedProfile.current_vibe || 'Neutral')
                    } else {
                        // Confirm my own vibe updated? Usually optimistic UI handles this, 
                        // but good to keep in sync if multiple devices.
                        setMyVibe(updatedProfile.current_vibe || 'Neutral')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userFamilyId, currentUserId, supabase])

    const updateVibe = async (newVibe: string) => {
        // Optimistic update
        setMyVibe(newVibe)

        // Send to server
        // Note: In a real app we might use Server Actions, but client-side is faster for this specific interactions 
        // unless we need heavy validation. Mission says "Supabase Realtime must update... the second the slider is moved".
        // Direct client update is fastest for Realtime trigger.
        const { error } = await supabase
            .from('profiles')
            // @ts-expect-error - Types inference issue with manual schema
            .update({ current_vibe: newVibe })
            .eq('id', currentUserId)

        if (error) {
            console.error('Error updating vibe:', error)
            alert(`Vibe Update Failed: ${error.message}`)
            // Rollback?
        }
    }

    return { myVibe, partnerVibe, partnerName, updateVibe }
}
