'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckInFlow } from './CheckInFlow'
import { CheckInConfig } from './CheckInConfig'
import { Button } from '@/components/ui/Button'
import { Settings } from 'lucide-react'
import { reconcileCheckIn, resetWeekCheckIn } from '@/app/actions/checkin'
import { notifyPartner, notifyFamily } from '@/app/actions/notifications'

// Helper to get Monday of current week
function getMonday(d: Date) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

export function CheckInWidget({
    familyId,
    userId,
    forceShowConfig = false,
    onConfigClose
}: {
    familyId: string,
    userId: string,
    forceShowConfig?: boolean,
    onConfigClose?: () => void
}) {
    const [status, setStatus] = useState<'loading' | 'idle' | 'active' | 'configuring'>('loading')
    const [checkinId, setCheckinId] = useState<string | null>(null)
    const [hasResponded, setHasResponded] = useState(false)
    const [checkinStatus, setCheckinStatus] = useState<'pending' | 'completed'>('pending')
    const [aiTopic, setAiTopic] = useState<any>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    // Sync from parent trigger
    useEffect(() => {
        if (forceShowConfig) {
            setShowConfig(true)
        }
    }, [forceShowConfig])

    const handleConfigClose = () => {
        setShowConfig(false)
        if (onConfigClose) onConfigClose()
    }

    const supabase = createClient()

    // Reset dismissal when checkin changes, check localStorage
    useEffect(() => {
        if (!checkinId) return
        const dismissedIds = JSON.parse(localStorage.getItem('dismissed_checkins') || '[]')
        if (dismissedIds.includes(checkinId)) {
            setDismissed(true)
        } else {
            setDismissed(false)
        }
    }, [checkinId])

    const handleDismiss = () => {
        setDismissed(true)
        if (checkinId) {
            const dismissedIds = JSON.parse(localStorage.getItem('dismissed_checkins') || '[]')
            if (!dismissedIds.includes(checkinId)) {
                localStorage.setItem('dismissed_checkins', JSON.stringify([...dismissedIds, checkinId]))
            }
        }
    }

    useEffect(() => {
        const checkSchedule = async () => {
            // 1. Fetch Config
            const { data: config } = await (supabase.from('checkin_config') as any).select('*').eq('family_id', familyId).single()

            if (!config) {
                // No config yet
                setStatus('idle')
                return
            }

            // 2. Check if it's check-in time (Conceptually)
            // For MVP, we'll just check if a checkin exists for this week OR if we should create one.
            // Simplified: If today is the day (or after) AND time is past, trigger.

            const now = new Date()
            const todayDay = now.getDay()
            // Very simple triggers for now: If it's the configured day
            // In reality, we should check week_start_date logic more robustly

            const monday = getMonday(new Date())
            const weekStr = monday.toISOString().split('T')[0] // YYYY-MM-DD

            // 3. fetch Checkin for this week
            const { data: checkin, error } = await (supabase.from('checkins') as any)
                .select('*')
                .eq('family_id', familyId)
                .eq('week_start_date', weekStr)
                .single()

            if (checkin) {
                setCheckinId(checkin.id)
                setCheckinStatus(checkin.status)
                setAiTopic(checkin.ai_topic)

                // Did I respond?
                const { count } = await (supabase.from('checkin_responses') as any)
                    .select('*', { count: 'exact', head: true })
                    .eq('checkin_id', checkin.id)
                    .eq('user_id', userId)

                setHasResponded(!!count)

                // Self-Healing: Check if actually completed but stuck
                if (checkin.status === 'pending') {
                    const { count: totalResponses } = await (supabase.from('checkin_responses') as any)
                        .select('*', { count: 'exact', head: true })
                        .eq('checkin_id', checkin.id)

                    if (totalResponses >= 2) {
                        console.log('Detected stuck check-in, attempting to complete...')
                        await reconcileCheckIn(familyId, checkin.id)
                    }
                }

                setStatus('active')
            } else {
                // No checkin yet. Is it time?
                // Logic: If today >= config.day (and handling week boundaries)
                // For simplicity, let's say if we are ON the day or later in the week
                // Create Logic:
                let isTime = false
                console.log('Checking Schedule:', {
                    todayDay,
                    configDay: config.day_of_week,
                    configTime: config.time_utc,
                    currentHour: now.getHours(),
                    currentMinute: now.getMinutes()
                })

                // Trigger Logic: 2-Hour Grace Period (Restored)
                // Trigger if we are within a 2-hour window of the scheduled time on the scheduled day.
                // This allows catching up if missed by a few minutes, but prevents triggering if way past.

                if (todayDay === config.day_of_week && config.time_utc) {
                    const [cfgHour, cfgMinute] = config.time_utc.split(':').map(Number)
                    const currentHour = now.getHours()
                    const currentMinute = now.getMinutes()

                    // Convert to minutes for easier comparison
                    const configMinutes = cfgHour * 60 + cfgMinute
                    const currentMinutes = currentHour * 60 + currentMinute

                    const diff = currentMinutes - configMinutes

                    // Trigger if we are PASTE the time but WITHIN 2 hours (120 mins)
                    if (diff >= 0 && diff <= 120) {
                        isTime = true
                    }
                }
                console.log('Is it time?', isTime)

                if (isTime) {
                    // It's time! Try to create it (Opportunistic)
                    const { data: newCheckin, error: createError } = await (supabase.from('checkins') as any)
                        .insert({
                            family_id: familyId,
                            week_start_date: weekStr
                        })
                        .select()
                        .single()

                    if (newCheckin) {
                        setCheckinId(newCheckin.id)
                        setCheckinStatus('pending') // Explicitly waiting for input
                        setHasResponded(false) // New checkin = no response yet
                        setStatus('active')
                        // Notify partner
                        notifyFamily(familyId, '📊 Weekly Connection', "It's time for our weekly check-in! Click to respond.", '/')
                    } else if (createError?.code === '23505') {
                        // Unique violation - someone else created it, fetch again
                        const { data: existing } = await (supabase.from('checkins') as any)
                            .select('*')
                            .eq('family_id', familyId)
                            .eq('week_start_date', weekStr)
                            .single()
                        if (existing) {
                            setCheckinId(existing.id)
                            setCheckinStatus(existing.status) // Sync status too
                            setAiTopic(existing.ai_topic)
                            setStatus('active')
                        }
                    }
                } else {
                    // Not time yet, and no checkin found. Ensure clean state.
                    if (checkinId) {
                        setCheckinId(null)
                        setCheckinStatus('pending') // Reset status
                        setHasResponded(false)
                        setAiTopic(null)
                    }
                    setStatus('idle')
                }
            }
        }

        checkSchedule()

        // Poll every 10 seconds to catch the exact time
        const interval = setInterval(checkSchedule, 10000)
        return () => clearInterval(interval)
    }, [familyId, userId, supabase, showConfig]) // Retry on config close

    if (showConfig) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="relative w-full max-w-sm">
                    <CheckInConfig
                        familyId={familyId}
                        onSave={async () => {
                            // If schedule is updated, we reset the current week's check-in
                            // so it can re-trigger at the new time if needed.
                            if (checkinId) {
                                await resetWeekCheckIn(familyId, checkinId)
                                setCheckinId(null)
                                setCheckinStatus('pending') // Ensure status is reset
                                setHasResponded(false) // Reset response status
                                setStatus('idle')
                                setDismissed(false)
                            }
                            handleConfigClose()
                        }}
                        onCancel={handleConfigClose}
                    />
                </div>
            </div>
        )
    }

    if (status === 'active' && checkinId && !dismissed) {
        return (
            <div className="fixed inset-x-0 bottom-24 z-[150] px-4 md:px-0 flex justify-center pointer-events-none">
                <div className="pointer-events-auto w-full max-w-md">
                    {/* Collapsed banner logic could go here, but focusing on Flow */}
                    <CheckInFlow
                        familyId={familyId}
                        userId={userId}
                        checkinId={checkinId}
                        initialStatus={checkinStatus}
                        initialTopic={aiTopic}
                        hasResponded={hasResponded}
                        onDismiss={handleDismiss}
                    />
                </div>
            </div>
        )
    }

    return null
}
