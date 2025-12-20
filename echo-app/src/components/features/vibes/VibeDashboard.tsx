'use client'

import dynamic from 'next/dynamic'
import { VibeSlider } from './VibeSlider'

// Dynamically import 3D component with SSR disabled to prevent hydration errors
const Experience3D = dynamic(() => import('./Experience3D'), {
    ssr: false,
    loading: () => <div className="h-[60vh] w-full flex items-center justify-center text-stone-300 animate-pulse">Loading Experience...</div>
})
import { useVibes } from '@/hooks/useVibes'
import { useGlows } from '@/hooks/useGlows'
import { useState, useEffect } from 'react'

interface VibeDashboardProps {
    userId: string
    familyId: string
    initialMyVibe: string
}

export type FocusedView = 'overview' | 'mine' | 'partner'

export function VibeDashboard({ userId, familyId, initialMyVibe }: VibeDashboardProps) {
    const { myVibe, partnerVibe, partnerName, updateVibe } = useVibes(familyId, userId)
    const { glows, sendGlow, markAsRead } = useGlows(familyId, userId)

    // State for 3D Interaction Focus
    const [focusedView, setFocusedView] = useState<FocusedView>('overview')

    // We track 'localScore' to override the discrete 'myVibe' string from DB.
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
        // Optional: Auto-return to overview after sending?
        // setFocusedView('overview') 
    }

    const handleReadGlow = async () => {
        if (!readingGlow) return
        await markAsRead(readingGlow.id)
        setReadingGlow(null)
    }

    return (
        <div className="flex flex-col items-center w-full min-h-screen relative">

            {/* Glow Message Overlay */}
            {/* Glow Message Overlay */}
            {readingGlow && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="relative overflow-hidden bg-gradient-to-br from-white/40 via-white/20 to-white/5 backdrop-blur-2xl backdrop-saturate-200 rounded-[2.5rem] p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),inset_0_0_0_1px_rgba(255,255,255,0.2),inset_0_1px_0_0_rgba(255,255,255,0.4)] max-w-sm w-full text-center space-y-8 transform animate-in zoom-in-95 duration-500 ease-out">

                        {/* Glass Shine Effect */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-200/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />

                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-100/80 to-amber-50/50 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-amber-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_4px_12px_rgba(251,191,36,0.1)] border border-white/40">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 drop-shadow-sm">
                                    <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.405 0 4.781.173 7.152.521C20.8 3.001 22 4.238 22 5.82V18.18a3 3 0 01-2.99 2.99H2.99A3 3 0 010 18.18V5.82c0-1.582 1.2-2.819 2.848-3.05zM12 17.5a1 1 0 100-2 1 1 0 000 2zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        <div className="space-y-3 relative">
                            <h3 className="text-stone-600/90 text-[10px] uppercase tracking-[0.2em] font-bold drop-shadow-sm">Message from {partnerName}</h3>
                            <p className="text-3xl font-serif text-stone-800 italic leading-snug drop-shadow-sm">
                                "{readingGlow.message}"
                            </p>
                        </div>

                        <button
                            onClick={handleReadGlow}
                            className="relative w-full py-4 bg-stone-900/90 backdrop-blur-md text-white/95 rounded-2xl font-medium tracking-wide hover:bg-stone-800 transition-all shadow-xl active:scale-95 duration-200 group overflow-hidden"
                        >
                            <span className="relative z-10">Close & Keep Glowing</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header: Dynamic based on view */}
            {/* pointer-events-none ensures clicks pass through empty space to canvas */}
            <div className="w-full max-w-md mx-auto text-center space-y-2 z-10 pt-8 px-4 transition-all duration-500 min-h-[80px] pointer-events-none">
                <div className="pointer-events-auto"> {/* Re-enable events for text selection if needed */}
                    {focusedView === 'overview' && (
                        <>
                            <h2 className="text-stone-500 font-medium tracking-widest text-sm uppercase">Currently Syncing With</h2>
                            <p className="text-2xl font-serif text-stone-800">{partnerName}</p>
                        </>
                    )}
                    {focusedView === 'partner' && (
                        <>
                            <h2 className="text-stone-500 font-medium tracking-widest text-sm uppercase">Sending Love To</h2>
                            <p className="text-2xl font-serif text-stone-800">{partnerName}</p>
                        </>
                    )}
                    {focusedView === 'mine' && (
                        <>
                            <h2 className="text-stone-500 font-medium tracking-widest text-sm uppercase">Setting Your Vibe</h2>
                            <p className="text-2xl font-serif text-stone-800">How do you feel?</p>
                        </>
                    )}
                </div>
            </div>

            {/* 3D Experience: The Controller */}
            {/* This is the interactive layer */}
            <div className="w-full my-4 flex-1 flex flex-col justify-center">
                <Experience3D
                    myVibe={myVibe}
                    partnerVibe={partnerVibe}
                    myScoreOverride={localScore}
                    glows={glows}
                    onGlowRead={(id, message) => setReadingGlow({ id, message })}
                    focusedView={focusedView}
                    onOrbClick={setFocusedView}
                    currentUserId={userId}
                />
            </div>

            {/* Controls: Context-Aware Panel */}
            <div className="w-full max-w-md mx-auto space-y-6 z-10 px-4 pb-8 min-h-[200px] transition-all duration-500 pointer-events-none">

                {/* Re-enable events for actual interactive controls */}
                <div className="pointer-events-auto">

                    {/* OVERVIEW: Instructions */}
                    {focusedView === 'overview' && (
                        <div className="text-center opacity-70 animate-pulse">
                            <p className="text-stone-400 text-xs uppercase tracking-widest">
                                Tap an Orb to Interact
                            </p>
                        </div>
                    )}

                    {/* MY ORB: Vibe Slider */}
                    {focusedView === 'mine' && (
                        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <VibeSlider
                                currentVibe={myVibe}
                                onVibeChange={(v, score) => {
                                    updateVibe(v)
                                    setLocalScore(score)
                                }}
                                onDrag={(val) => setLocalScore(val)}
                            />
                            <button
                                onClick={() => setFocusedView('overview')}
                                className="mt-6 text-xs uppercase tracking-widest text-stone-400 hover:text-stone-600"
                            >
                                Back to Center
                            </button>
                        </div>
                    )}

                    {/* PARTNER ORB: Send Glow */}
                    {focusedView === 'partner' && (
                        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-4">
                            <form onSubmit={handleSendGlow} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={glowInput}
                                    onChange={(e) => setGlowInput(e.target.value)}
                                    placeholder={`Send a glow to ${partnerName}...`}
                                    className="flex-1 bg-white border border-stone-300 rounded-full px-4 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-sm"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!glowInput.trim()}
                                    className="p-2 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                    </svg>
                                </button>
                            </form>
                            <div className="text-center">
                                <button
                                    onClick={() => setFocusedView('overview')}
                                    className="text-xs uppercase tracking-widest text-stone-400 hover:text-stone-600"
                                >
                                    Back to Center
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Decorative 'Connection' Status */}
                <div className="pb-8 opacity-50 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live Connection Active
                    </div>
                </div>
            </div>
        </div>
    )
}
