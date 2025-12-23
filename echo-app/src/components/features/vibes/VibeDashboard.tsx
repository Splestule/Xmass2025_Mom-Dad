'use client'

import dynamic from 'next/dynamic'
import { VibeSlider } from './VibeSlider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

// Dynamically import 3D component with SSR disabled
const Experience3D = dynamic(() => import('./Experience3D'), {
    ssr: false,
    loading: () => <div className="h-[50vh] w-full flex items-center justify-center text-muted-foreground animate-pulse">Loading Sanctuary...</div>
})
import { useVibes } from '@/hooks/useVibes'
import { useGlows } from '@/hooks/useGlows'
import { useTalks } from '@/hooks/useTalks'
import { CheckInWidget } from '@/components/features/checkin/CheckInWidget'
import { TalkModal } from '@/components/features/talk/TalkModal'
import { TalkWidget } from '@/components/features/talk/TalkWidget'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { Logo } from '@/components/layout/Logo'
import { Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

interface VibeDashboardProps {
    userId: string
    familyId: string
    initialMyVibe: string
    signOutAction: () => Promise<void>
}

export type FocusedView = 'overview' | 'mine' | 'partner' | 'bank'

export function VibeDashboard({ userId, familyId, initialMyVibe, signOutAction }: VibeDashboardProps) {
    const { myVibe, partnerVibe, partnerName, updateVibe } = useVibes(familyId, userId)
    const { glows, savedGlows, sendGlow, markAsRead, saveGlow, deleteGlow } = useGlows(familyId, userId)
    const { upcomingTalks, scheduleTalk, cancelTalk } = useTalks(familyId)
    const [showConfig, setShowConfig] = useState(false)

    // State for 3D Interaction Focus
    const [focusedView, setFocusedView] = useState<FocusedView>('overview')
    const [showTalkModal, setShowTalkModal] = useState(false)

    // Local score override
    const [localScore, setLocalScore] = useState<number | undefined>(undefined)
    const [glowInput, setGlowInput] = useState('')

    // Reset local score logic
    useEffect(() => {
        if (localScore !== undefined) {
            const vibeIndex = ['Out of Sync', 'Quiet', 'Neutral', 'Connected', 'Radiant'].indexOf(myVibe)
            if (vibeIndex !== -1 && Math.round(localScore) !== vibeIndex) {
                setLocalScore(undefined)
            }
        }
    }, [myVibe])

    const [readingGlow, setReadingGlow] = useState<{ id: string, message: string } | null>(null)

    const handleSendGlow = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!glowInput.trim()) return
        await sendGlow(glowInput)
        setGlowInput('')
        // setFocusedView('overview') 
    }

    const handleSaveGlow = async () => {
        if (!readingGlow) return
        await saveGlow(readingGlow.id)
        setReadingGlow(null)
    }

    const handleDismissGlow = async () => {
        if (!readingGlow) return
        await markAsRead(readingGlow.id)
        setReadingGlow(null)
    }

    return (
        <div className="flex flex-col items-center w-full h-[100dvh] relative overflow-hidden bg-background text-foreground">
            <header className="fixed top-0 left-0 right-0 z-[60] flex justify-between items-center p-6 bg-background/30 backdrop-blur-md">
                <Logo />
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setShowConfig(true)}
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                    <form action={signOutAction}>
                        <Button variant="ghost" size="sm" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive">
                            Sign Out
                        </Button>
                    </form>
                </div>
            </header>

            {/* Header: Dynamic based on view */}
            <div className="w-full max-w-md mx-auto text-center space-y-1 z-10 pt-28 px-4 transition-all duration-500 pointer-events-none relative flex-shrink-0">
                <div className="pointer-events-auto">
                    {focusedView === 'overview' && (
                        <>
                            <h2 className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase opacity-60">Currently Syncing With</h2>
                            <p className="text-2xl font-serif text-foreground">{partnerName}</p>
                        </>
                    )}
                    {focusedView === 'partner' && (
                        <>
                            <h2 className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase opacity-60">Sending Love To</h2>
                            <p className="text-2xl font-serif text-foreground">{partnerName}</p>
                        </>
                    )}
                    {focusedView === 'mine' && (
                        <>
                            <h2 className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase opacity-60">Setting Your Vibe</h2>
                            <p className="text-2xl font-serif text-foreground">How do you feel?</p>
                        </>
                    )}
                    {focusedView === 'bank' && (
                        <>
                            <h2 className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase opacity-60">Your Treasury</h2>
                            <p className="text-2xl font-serif text-foreground">Kept Glows</p>
                        </>
                    )}
                </div>
            </div>

            <div className="w-full mt-10 flex flex-col items-center z-[155] relative px-4 pointer-events-none flex-shrink-0">
                <div className="w-full pointer-events-auto">
                    <CheckInWidget familyId={familyId} userId={userId} forceShowConfig={showConfig} onConfigClose={() => setShowConfig(false)} />

                    {/* Talk Widget (Top Strip below Checkin) */}
                    {upcomingTalks.length > 0 && (
                        <div className="flex flex-col items-center gap-1 mt-1">
                            {upcomingTalks.slice(0, 3).map(talk => (
                                <div key={talk.id} className="w-full max-w-sm">
                                    <TalkWidget talk={talk} onCancel={cancelTalk} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <TalkModal
                isOpen={showTalkModal}
                onClose={() => setShowTalkModal(false)}
                onSchedule={scheduleTalk}
                canSchedule={upcomingTalks.length < 3}
            />

            {/* Glow Message Overlay - Magical Reveal */}
            {readingGlow && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-stone-950/40 backdrop-blur-md animate-in fade-in duration-700">
                    <div className="relative w-full max-w-sm">
                        {/* The 'Paper' / Letter */}
                        <div className="relative bg-[#FDFBF7] p-10 rounded-xl shadow-2xl rotate-1 animate-in slide-in-from-bottom-12 zoom-in-95 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-bottom">
                            {/* Decorative Tape/Stamp */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-primary/20 -rotate-2 backdrop-blur-sm" />

                            <div className="space-y-6 text-center">
                                <span className="inline-block text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase border-b border-primary/20 pb-1">
                                    Message from {partnerName}
                                </span>

                                <p className="text-3xl font-serif text-stone-800 italic leading-relaxed whitespace-pre-wrap">
                                    "{readingGlow.message}"
                                </p>

                                <div className="pt-8 flex flex-col gap-3 justify-center">
                                    <button
                                        onClick={handleSaveGlow}
                                        className="text-xs text-primary font-bold hover:text-primary/80 transition-colors uppercase tracking-widest border border-primary/20 rounded-full py-3 px-6 bg-primary/5 hover:bg-primary/10"
                                    >
                                        Fold & Keep
                                    </button>
                                    <button
                                        onClick={handleDismissGlow}
                                        className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-widest"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Particles/Sparkles behind */}
                        <div className="absolute -inset-20 -z-10 pointer-events-none opacity-50">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-200/20 blur-[100px] rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>
            )}


            {/* 3D Experience (Hidden in Bank View) */}
            <div className={cn(
                "w-full my-4 flex-1 flex flex-col justify-center transition-opacity duration-500",
                focusedView === 'bank' ? "opacity-0 pointer-events-none absolute" : "opacity-100"
            )}>
                <Experience3D
                    myVibe={myVibe}
                    partnerVibe={partnerVibe}
                    myScoreOverride={localScore}
                    glows={glows}
                    onGlowRead={(id, message) => setReadingGlow({ id, message })}
                    focusedView={focusedView === 'bank' ? 'overview' : focusedView}
                    onOrbClick={setFocusedView}
                    currentUserId={userId}
                />
            </div>

            {/* Bank View List */}
            {focusedView === 'bank' && (
                <div className="w-full max-w-md mx-auto flex-1 overflow-y-auto px-6 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-500 scrollbar-hide z-10">
                    <div className="space-y-4">
                        {savedGlows.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground font-serif italic opacity-60">
                                No kept glows yet.
                            </div>
                        ) : (
                            savedGlows.map((glow) => (
                                <div key={glow.id} className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors group relative">
                                    <p className="font-serif text-lg leading-relaxed text-foreground/90">"{glow.message}"</p>
                                    <div className="flex justify-between items-end mt-4">
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                                            {new Date(glow.created_at).toLocaleDateString()}
                                        </p>
                                        <button
                                            onClick={() => deleteGlow(glow.id)}
                                            className="text-[10px] text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 uppercase tracking-widest transition-all"
                                        >
                                            Forget
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex justify-center mt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setFocusedView('overview')}
                            className="text-xs uppercase tracking-widest text-muted-foreground"
                        >
                            Back to Sanctuary
                        </Button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="w-full max-w-md mx-auto space-y-6 z-10 px-6 pb-32 md:pb-24 min-h-[100px] transition-all duration-500 pointer-events-none">
                <div className="pointer-events-auto">

                    {/* OVERVIEW: Instructions & Bank Link */}
                    {focusedView === 'overview' && (
                        <div className="flex flex-col items-center gap-8 animate-pulse-slow">
                            <p className="text-muted-foreground text-[10px] items-center gap-2 flex uppercase tracking-widest opacity-60">
                                <span className="w-1 h-1 rounded-full bg-primary/40" />
                                Tap an Orb to Interact
                                <span className="w-1 h-1 rounded-full bg-primary/40" />
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setFocusedView('bank')}
                                    className="px-6 py-3 rounded-full bg-primary/5 border border-primary/20 text-[10px] uppercase tracking-widest text-primary font-bold hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm"
                                >
                                    Treasury
                                </button>
                                <button
                                    onClick={() => setShowTalkModal(true)}
                                    disabled={upcomingTalks.length >= 3}
                                    className={cn(
                                        "px-6 py-3 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all shadow-sm",
                                        upcomingTalks.length >= 3
                                            ? "bg-muted/10 border-muted/20 text-muted-foreground cursor-not-allowed opacity-50"
                                            : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
                                    )}
                                >
                                    {upcomingTalks.length >= 3 ? "Wait to Talk" : "Let's Talk"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MY ORB: Vibe Slider */}
                    {focusedView === 'mine' && (
                        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-500 -mt-12 md:mt-0">
                            <VibeSlider
                                currentVibe={myVibe}
                                onVibeChange={(v, score) => {
                                    updateVibe(v)
                                    setLocalScore(score)
                                }}
                                onDrag={(val) => setLocalScore(val)}
                            />
                            <Button
                                variant="ghost"
                                onClick={() => setFocusedView('overview')}
                                className="mt-2 md:mt-8 text-xs uppercase tracking-widest text-muted-foreground"
                            >
                                Back to Center
                            </Button>
                        </div>
                    )}

                    {/* PARTNER ORB: Send Glow */}
                    {focusedView === 'partner' && (
                        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
                            <form onSubmit={handleSendGlow} className="flex gap-2 items-center">
                                <Input
                                    value={glowInput}
                                    onChange={(e) => setGlowInput(e.target.value)}
                                    placeholder={`Send a glow to ${partnerName}...`}
                                    className="rounded-full shadow-sm bg-white/60 backdrop-blur-md"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!glowInput.trim()}
                                    className="rounded-full shadow-lg shrink-0 aspect-square h-12 w-12"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                    </svg>
                                </Button>
                            </form>
                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setFocusedView('overview')}
                                    className="text-xs uppercase tracking-widest text-muted-foreground"
                                >
                                    Back to Center
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Connection Status */}
                <div className="pb-8 opacity-50 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        Live Connection Active
                    </div>
                </div>
            </div>
        </div>
    )
}
