'use client'

import { cn } from '@/utils/cn'

interface LogoProps {
    className?: string
}

export function Logo({ className }: LogoProps) {
    return (
        <div className={cn("flex items-center", className)}>
            {/* Text Only Wordmark */}
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                Echo
            </h1>
        </div>
    )
}
