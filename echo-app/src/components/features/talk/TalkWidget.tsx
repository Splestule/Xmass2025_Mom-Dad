'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Clock, X, MessageCircle } from 'lucide-react'
import { Database } from '@/utils/supabase/types'
import { notifyTalkDueAction } from '@/app/actions/talk'

type Talk = Database['public']['Tables']['scheduled_talks']['Row']

interface TalkWidgetProps {
    talk: Talk
    onCancel: (id: string) => Promise<void>
}

export function TalkWidget({ talk, onCancel }: TalkWidgetProps) {
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [isHappening, setIsHappening] = useState(false)
    const [hasNotified, setHasNotified] = useState(false)

    useEffect(() => {
        if (isHappening && !hasNotified) {
            console.log('[TalkWidget] Timer hit zero! Triggering notification for:', talk.id)
            setHasNotified(true)
            notifyTalkDueAction(talk.id).then(res => {
                console.log('[TalkWidget] Notification action result:', res)
            }).catch(err => {
                console.error('[TalkWidget] Notification action failed:', err)
            })
        }
    }, [isHappening, hasNotified, talk.id])

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date()
            const scheduled = new Date(talk.scheduled_at)
            const diff = scheduled.getTime() - now.getTime()

            if (diff <= 0) {
                setTimeLeft('Now')
                setIsHappening(true)
                return
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            if (days > 0) setTimeLeft(`${days}d ${hours}h`)
            else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`)
            else setTimeLeft(`${minutes}m ${seconds}s`)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [talk.scheduled_at])

    const [cancelling, setCancelling] = useState(false)

    const handleCancel = async () => {
        setCancelling(true)
        try {
            console.log('Cancelling talk:', talk.id)
            await onCancel(talk.id)
        } catch (e) {
            console.error('Cancel failed:', e)
            alert('Failed to cancel')
        } finally {
            setCancelling(false)
        }
    }

    return (
        <div className="glass-panel bg-primary/5 mx-auto max-w-sm mt-0.5 overflow-hidden animate-in slide-in-from-top-4 border border-primary/10 rounded-xl py-1.5 px-3 flex items-center justify-between gap-2 min-h-0 relative">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {isHappening ? <MessageCircle className="w-3 h-3 text-primary animate-pulse" /> : <Clock className="w-3 h-3 text-primary" />}
                </div>
                <div>
                    <p className="font-serif font-medium text-foreground text-[11px] leading-tight line-clamp-1">"{talk.theme}"</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="text-right">
                    <p className="text-[10px] font-bold tabular-nums text-primary leading-none">{timeLeft}</p>
                </div>
                {/* Only show close once happening, per user request */}
                {isHappening && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground/50 hover:text-red-400 p-0"
                        onClick={handleCancel}
                        isLoading={cancelling}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Notification/Alert strip if happening - VERY THIN */}
            {isHappening && (
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-primary animate-pulse" />
            )}
        </div>
    )
}
