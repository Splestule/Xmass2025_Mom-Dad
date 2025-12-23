'use client'

import { useState } from 'react'
import { createFamily, joinFamily } from '@/app/auth/setup/actions'
import { signout } from '@/app/auth/signout/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

export function SetupForm({ userEmail }: { userEmail: string }) {
    const [mode, setMode] = useState<'create' | 'join'>('create')

    return (
        <Card className="max-w-md w-full mx-auto animate-in fade-in zoom-in duration-500">
            <CardHeader className="text-center space-y-2">
                <CardTitle>Complete Your Setup</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Refuge for <span className="font-semibold text-foreground">{userEmail}</span>.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex p-1 bg-muted/50 rounded-full">
                    <button
                        onClick={() => setMode('create')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-full transition-all",
                            mode === 'create'
                                ? "bg-white text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Create Sanctuary
                    </button>
                    <button
                        onClick={() => setMode('join')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-full transition-all",
                            mode === 'join'
                                ? "bg-white text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Join Sanctuary
                    </button>
                </div>

                <form action={mode === 'create' ? createFamily : joinFamily} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider ml-1">Display Name</label>
                        <Input
                            name="displayName"
                            required
                            placeholder="e.g. Dad, Mom, Partner"
                        />
                    </div>

                    {mode === 'join' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider ml-1">Family ID</label>
                            <Input
                                name="familyId"
                                required
                                placeholder="Paste the UUID here..."
                            />
                        </div>
                    )}

                    <Button className="w-full text-lg h-12">
                        {mode === 'create' ? 'Create Space' : 'Join Space'}
                    </Button>
                </form>

                <div className="border-t border-border pt-4 text-center">
                    <form action={signout}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                            Sign Out
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    )
}
