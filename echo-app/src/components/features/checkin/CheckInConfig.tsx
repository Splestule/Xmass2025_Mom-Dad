'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { Settings } from 'lucide-react'

const DAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
]

export function CheckInConfig({ familyId, onSave, onCancel }: { familyId: string, onSave?: () => void, onCancel?: () => void }) {
    const [day, setDay] = useState(0)
    const [time, setTime] = useState('18:00')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchConfig = async () => {
            const { data } = await (supabase.from('checkin_config') as any).select('*').eq('family_id', familyId).single()
            if (data) {
                setDay(data.day_of_week)
                setTime(data.time_utc)
            }
        }
        fetchConfig()
    }, [familyId, supabase])

    const handleSave = async () => {
        setLoading(true)
        console.log('Saving config:', { familyId, day, time })

        const { error } = await (supabase.from('checkin_config') as any).upsert({
            family_id: familyId,
            day_of_week: day,
            time_utc: time,
        })

        setLoading(false)

        if (error) {
            console.error('Error saving config:', error)
            alert(`Failed to save settings: ${error.message || JSON.stringify(error)}`)
        } else {
            setSaved(true)
            setTimeout(() => {
                setSaved(false)
                onSave?.()
            }, 1000)
        }
    }

    return (
        <Card className="w-full max-w-sm bg-background/95 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-serif text-center flex items-center justify-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Weekly Ritual
                </CardTitle>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold text-center">Configuration</div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground ml-1">Day of Week</label>
                        <div className="relative">
                            <select
                                value={day}
                                onChange={(e) => setDay(parseInt(e.target.value))}
                                className={cn(
                                    "flex h-12 w-full appearance-none rounded-2xl border border-input bg-white/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    "font-serif text-base"
                                )}
                            >
                                {DAYS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground ml-1">Time (UTC)</label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className={cn(
                                "flex h-12 w-full appearance-none rounded-2xl border border-input bg-white/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                "font-serif text-base"
                            )}
                        />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="flex-1 text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={loading}
                        className="flex-[1.5] text-xs whitespace-nowrap"
                        disabled={saved}
                    >
                        {saved ? 'Saved!' : 'Update Schedule'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
