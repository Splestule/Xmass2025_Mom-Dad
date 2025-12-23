'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckInResult } from './CheckInResult'
import { submitCheckInResponse } from '@/app/actions/checkin'

interface CheckInTopic {
    title: string
    description: string
}

interface CheckInFlowProps {
    familyId: string
    userId: string
    checkinId: string
    initialStatus: 'pending' | 'completed'
    initialTopic?: CheckInTopic
    hasResponded: boolean
    onDismiss?: () => void
}

export function CheckInFlow({ familyId, userId, checkinId, initialStatus, initialTopic, hasResponded, onDismiss }: CheckInFlowProps) {
    const [status, setStatus] = useState(initialStatus)
    const [topic, setTopic] = useState<CheckInTopic | undefined>(initialTopic)
    const [responded, setResponded] = useState(hasResponded)

    // Form State
    const [temperature, setTemperature] = useState(5)
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Realtime & Polling
    const supabase = createClient()
    useEffect(() => {
        // Initial Fetch
        const fetchStatus = async () => {
            const { data } = await (supabase.from('checkins') as any)
                .select('status, ai_topic')
                .eq('id', checkinId)
                .single()
            if (data?.status === 'completed') {
                setStatus('completed')
                setTopic(data.ai_topic)
            }
        }

        // Realtime Subscription
        const channel = supabase.channel(`checkin-${checkinId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'checkins',
                filter: `id=eq.${checkinId}`
            }, (payload) => {
                const newRec = payload.new as any
                if (newRec.status === 'completed') {
                    setStatus('completed')
                    setTopic(newRec.ai_topic)
                }
            })
            .subscribe()

        // Polling Fallback (every 5s)
        const pollTimer = setInterval(fetchStatus, 5000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollTimer)
        }
    }, [checkinId, supabase])

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            await submitCheckInResponse(familyId, checkinId, temperature, notes)
            setResponded(true)
        } catch (e) {
            console.error(e)
            alert('Failed to submit. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (status === 'completed' && topic) {
        return <CheckInResult checkinId={checkinId} topic={topic} onDismiss={onDismiss} familyId={familyId} />
    }

    if (responded) {
        return (
            <div className="fixed inset-0 z-[200] bg-white md:bg-background/80 md:backdrop-blur-xl transition-all duration-700 overflow-y-auto">
                <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-8 md:p-6">
                    <div className="text-center py-12 space-y-6 w-full max-w-md mx-auto relative overflow-hidden md:glass-panel md:rounded-3xl md:p-8 md:shadow-2xl md:border md:border-primary/20 md:bg-primary/5">
                        <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto animate-pulse flex items-center justify-center relative">
                            <div className="w-10 h-10 bg-primary/40 rounded-full blur-sm" />
                            <div className="absolute inset-0 border-2 border-primary/30 rounded-full animate-spin-slow" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-serif text-2xl">Waiting for Partner...</h3>
                            <p className="text-muted-foreground">Your temperature has been recorded.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white md:bg-background/80 md:backdrop-blur-xl transition-all duration-700 overflow-y-auto">
            <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-8 md:p-6">
                <div className="w-full max-w-md mx-auto relative overflow-hidden md:glass-panel md:rounded-3xl md:p-8 md:shadow-2xl md:border md:border-primary/20 md:bg-primary/5">
                    <div className="text-center p-6 pb-2 space-y-4">
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Weekly Check-in</div>
                            <h3 className="font-serif text-3xl text-primary font-semibold leading-none tracking-tight">How are you feeling?</h3>
                        </div>
                    </div>
                    <div className="p-6 pt-0 space-y-6">
                        {/* Temperature Slider */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end text-primary">
                                <span className="text-xs uppercase tracking-wider font-bold opacity-60">Out of Sync</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-5xl font-serif font-bold text-stone-800">{temperature}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1">Temperature</span>
                                </div>
                                <span className="text-xs uppercase tracking-wider font-bold opacity-60">Radiant</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={temperature}
                                onChange={(e) => setTemperature(parseInt(e.target.value))}
                                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-muted-foreground ml-1 uppercase tracking-wider text-[10px]">What's on your mind? (Optional)</label>
                            <textarea
                                className="w-full rounded-2xl border border-stone-200 bg-white/40 px-4 py-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[120px] resize-none font-serif placeholder:text-stone-400/70 transition-colors focus:bg-white/70"
                                placeholder="Share a thought, a worry, or a joy..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <Button
                            onClick={handleSubmit}
                            isLoading={submitting}
                            className="w-full h-14 text-lg shadow-xl shadow-primary/10 hover:shadow-primary/20"
                        >
                            Submit Temperature
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
