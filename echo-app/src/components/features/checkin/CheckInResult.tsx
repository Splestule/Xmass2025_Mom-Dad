'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Play, RotateCcw, RefreshCw } from 'lucide-react'
import { updateCheckInTimer, regenerateCheckInTopic, notifyConnectionCompleteAction } from '@/app/actions/checkin'
import { notifyPartner } from '@/app/actions/notifications'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/utils/cn'

interface CheckInTopic {
    title: string
    description: string
}

interface CheckInResultProps {
    checkinId: string
    familyId: string
    topic: CheckInTopic
    onDismiss?: () => void
}

export function CheckInResult({ checkinId, familyId, topic, onDismiss }: CheckInResultProps) {
    const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [loading, setLoading] = useState(false)
    const [isRegenerating, setIsRegenerating] = useState(false)
    const [hasNotifiedFinish, setHasNotifiedFinish] = useState(false)
    const supabase = createClient()
    const [isExiting, setIsExiting] = useState(false)

    // Notify when finished
    useEffect(() => {
        const calculateSecondsLeft = () => {
            if (!timerStartedAt) return 15 * 60
            const start = new Date(timerStartedAt).getTime()
            const now = currentTime.getTime()
            const elapsedSecs = Math.floor((now - start) / 1000)
            return Math.max(0, 15 * 60 - elapsedSecs)
        }

        const secondsLeft = calculateSecondsLeft()
        // console.log('Timer Debug:', { secondsLeft, timerStartedAt, hasNotifiedFinish })

        if (secondsLeft === 0 && timerStartedAt && !hasNotifiedFinish) {
            console.log('[CheckInResult] Timer hit 0. Triggering notification action...')
            setHasNotifiedFinish(true)
            // Use Server Action to atomically notify (prevents duplicates from both clients)
            notifyConnectionCompleteAction(checkinId, familyId)
                .then(res => console.log('[CheckInResult] Notification Action Result:', res))
                .catch(err => console.error('[CheckInResult] Notification Action Failed:', err))
        }
    }, [currentTime, timerStartedAt, hasNotifiedFinish, familyId, checkinId])

    const fetchCheckin = useCallback(async () => {
        const { data } = await (supabase.from('checkins') as any)
            .select('timer_started_at')
            .eq('id', checkinId)
            .single()
        if (data?.timer_started_at) {
            setTimerStartedAt(data.timer_started_at)
        } else {
            setTimerStartedAt(null)
        }
    }, [checkinId, supabase])

    // Realtime Listener for Timer Sync & Polling Fallback
    useEffect(() => {
        // Initial Fetch
        fetchCheckin()

        // Realtime Subscription
        const channel = supabase.channel(`checkin-timer-${checkinId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'checkins',
                filter: `id=eq.${checkinId}`
            }, (payload) => {
                const newRec = payload.new as any
                // Update local state based on server
                setTimerStartedAt(newRec.timer_started_at)
            })
            .subscribe()

        // Polling (Every 5s) to fix "starts only on one device" if Realtime fails
        const pollTimer = setInterval(fetchCheckin, 5000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollTimer)
        }
    }, [checkinId, supabase, fetchCheckin])

    // Update "Now" constantly to drive the countdown
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const calculateTimeLeft = () => {
        if (!timerStartedAt) return 15 * 60 // Default 15m

        const start = new Date(timerStartedAt).getTime()
        const now = currentTime.getTime()
        const elapsedSecs = Math.floor((now - start) / 1000)
        const totalDuration = 15 * 60
        const left = totalDuration - elapsedSecs

        return Math.max(0, left)
    }

    const timeLeft = calculateTimeLeft()
    const isActive = !!timerStartedAt && timeLeft > 0
    const isFinished = !!timerStartedAt && timeLeft === 0

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleTimerAction = async (action: 'start' | 'pause' | 'reset') => {
        setLoading(true)
        try {
            await updateCheckInTimer(checkinId, familyId, action)
            // if reset, clear local finished state
            if (action === 'reset') {
                setHasNotifiedFinish(false)
            }
        } catch (e: any) {
            console.error('Timer action failed:', e)
            alert(`Failed to action timer: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleRegenerate = async () => {
        setIsRegenerating(true)
        try {
            await regenerateCheckInTopic('current-family-id', checkinId) // Ideally pass familyId, but server action handles finding record
            // The checkin flow or parent component listening to realtime updates on 'checkins' 
            // will need to update the topic. 
            // HOWEVER, CheckInResult receives topic as a PROP.
            // If the parent (CheckInFlow) doesn't re-render with new topic, this won't show.
            // CheckInFlow listens to realtime updates on 'checkins' and updates 'setTopic'.
            // So simply calling the server action should trigger the flow update.
        } catch (e: any) {
            console.error('Regeneration failed:', e)
            alert(`Failed to regenerate: ${e.message}`)
        } finally {
            setIsRegenerating(false)
        }
    }

    const handleFinish = () => {
        setIsExiting(true)
        setTimeout(() => {
            if (onDismiss) onDismiss()
        }, 500) // Match duration
    }

    if (isExiting) return null

    return (
        <div className={cn(
            "fixed inset-0 z-[200] bg-white md:bg-background/80 md:backdrop-blur-xl transition-all duration-1000 overflow-y-auto",
            isExiting && "opacity-0 translate-y-10"
        )}>
            <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-8 md:p-6">
                <div className="w-full max-w-md mx-auto relative overflow-hidden md:glass-panel md:rounded-3xl md:p-8 md:shadow-2xl md:border md:border-primary/20 md:bg-primary/5">
                    <div className="text-center p-6 pb-2">
                        <div className={cn(
                            "text-xs font-bold tracking-[0.2em] uppercase mb-2 text-primary",
                            isActive && "opacity-60"
                        )}>
                            Weekly Connection
                        </div>
                        <h3 className={cn(
                            "font-serif italic text-primary leading-relaxed",
                            isActive ? "text-2xl" : "text-2xl"
                        )}>
                            "{topic.title}"
                        </h3>
                    </div>
                    <div className="text-center p-6 pt-0 space-y-6">
                        <p className={cn(
                            "font-serif leading-relaxed italic mx-auto max-w-xs",
                            isActive ? "text-base text-muted-foreground" : "text-lg text-muted-foreground"
                        )}>
                            "{topic.description}"
                        </p>

                        <div className="relative py-4 flex flex-col items-center justify-center">
                            <div className={cn(
                                "rounded-full border-4 flex items-center justify-center relative transition-all duration-1000",
                                isActive
                                    ? "w-44 h-44 border-primary/40 bg-primary/10 shadow-[0_0_60px_-15px_rgba(var(--primary),0.4)]"
                                    : "w-44 h-44 border-primary/10",
                                isFinished && "border-green-500/30 bg-green-500/5 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]"
                            )}>
                                <div className={cn(
                                    "font-serif font-bold text-foreground tabular-nums tracking-tighter transition-all duration-1000",
                                    isActive ? "text-5xl drop-shadow-sm" : "text-5xl",
                                    isFinished && "text-green-600"
                                )}>
                                    {isFinished ? "15:00" : formatTime(timeLeft)}
                                </div>
                                {/* Simple label */}
                                {isFinished && <div className="absolute top-32 text-xs uppercase tracking-widest font-bold text-green-600 animate-pulse">Complete</div>}
                            </div>

                            {isActive && (
                                <p className="mt-8 text-muted-foreground text-sm italic animate-pulse">
                                    Focus on each other. No phones, just presence.
                                </p>
                            )}
                        </div>

                        <div className="flex justify-center gap-4">
                            {!timerStartedAt && !isFinished && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-14 w-14 rounded-full border-primary/20 text-primary/70 hover:text-primary hover:border-primary/40 bg-white/40"
                                        onClick={handleRegenerate}
                                        disabled={isRegenerating}
                                        title="Regenerate Topic"
                                    >
                                        <RefreshCw className={cn("h-5 w-5", isRegenerating && "animate-spin")} />
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-32 shadow-xl shadow-primary/20 rounded-full"
                                        onClick={() => handleTimerAction('start')}
                                        isLoading={loading}
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        Start
                                    </Button>
                                </>
                            )}

                            {isActive && (
                                <div className="flex flex-col gap-3 w-full items-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full border-primary/10 bg-primary/5 text-muted-foreground hover:text-primary"
                                        onClick={() => handleTimerAction('reset')}
                                        isLoading={loading}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reset Timer
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleFinish}
                                        className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        End Connection
                                    </Button>
                                </div>
                            )}

                            {isFinished && (
                                <div className="flex flex-col gap-3 w-full items-center animate-in fade-in slide-in-from-bottom-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-48 bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-500/20 rounded-full"
                                        onClick={handleFinish}
                                    >
                                        Close
                                    </Button>
                                    <button
                                        onClick={() => handleTimerAction('reset')}
                                        className="text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest mt-2"
                                    >
                                        Reset Timer
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
