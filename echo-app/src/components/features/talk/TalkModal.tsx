'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, MessageCircle } from 'lucide-react'

interface TalkModalProps {
    isOpen: boolean
    onClose: () => void
    onSchedule: (theme: string, date: Date) => Promise<void>
    canSchedule?: boolean
}

export function TalkModal({ isOpen, onClose, onSchedule, canSchedule = true }: TalkModalProps) {
    const [theme, setTheme] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]) // Default to today
    const [time, setTime] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!theme || !date || !time || !canSchedule) return

        setLoading(true)
        try {
            const scheduledAt = new Date(`${date}T${time}`)

            // Check if scheduled time is in the future
            if (scheduledAt <= new Date()) {
                alert("Please select a time in the future.")
                setLoading(false)
                return
            }

            await onSchedule(theme, scheduledAt)
            onClose()
            setTheme('')
            setDate(new Date().toISOString().split('T')[0]) // Reset to today
            setTime('')
        } catch (error: any) {
            console.error(error)
            alert(`Failed to schedule talk: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm bg-background/95 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
                <CardHeader>
                    <CardTitle className="text-xl font-serif text-center flex items-center justify-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Let's Talk
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-muted-foreground">What's on your mind?</label>
                            <Input
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                placeholder="E.g. Our Finances, Upcoming Trip..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-muted-foreground">When?</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-muted-foreground">Time?</label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {!canSchedule && (
                            <p className="text-[10px] text-red-400 text-center italic">You have 3 planned talks already.</p>
                        )}

                        <div className="pt-4 flex gap-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-xs">
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading || !canSchedule} className="flex-[1.5] text-xs whitespace-nowrap p-0">
                                {loading ? 'Scheduling...' : 'Schedule Talk'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
