'use client'

import { Bell, BellOff } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export function NotificationBell() {
    const { isSupported, isSubscribed, permission, subscribe, loading } = useNotifications()
    const [dismissed, setDismissed] = useState(false)

    // Hide if not supported, already subscribed, or user dismissed heavily
    if (!isSupported || isSubscribed || dismissed) return null

    // If permission is denied, maybe show a "Bell Off" that opens help? 
    // For now, only show if we can actually subscribe (default/prompt)
    if (permission === 'denied') {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => alert('Notifications are blocked. Please enable them in your browser settings.')}
            >
                <BellOff className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-primary animate-pulse"
            onClick={subscribe}
            disabled={loading}
            title="Enable Notifications"
        >
            <Bell className="h-5 w-5" />
        </Button>
    )
}
