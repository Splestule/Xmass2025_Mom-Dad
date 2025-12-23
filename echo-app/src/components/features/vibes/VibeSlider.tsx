'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

interface VibeSliderProps {
    currentVibe: string
    onVibeChange: (vibe: string, score: number) => void
    onDrag: (value: number) => void
}

const vibes = ['Out of Sync', 'Quiet', 'Neutral', 'Connected', 'Radiant']

export function VibeSlider({ currentVibe, onVibeChange, onDrag }: VibeSliderProps) {
    // Helper to parse potential float string (e.g. "2.45") or degrade to index
    const parseVibe = (v: string) => {
        const float = parseFloat(v)
        if (!isNaN(float)) return float
        const idx = vibes.indexOf(v)
        return idx === -1 ? 2 : idx
    }

    // Initial state derived from prop
    const [sliderValue, setSliderValue] = useState(parseVibe(currentVibe))

    const isDragging = useRef(false)

    // Sync from Parent/DB -> Local State
    useEffect(() => {
        const remoteValue = parseVibe(currentVibe)

        // If user is interactive, do nothing.
        if (isDragging.current) return

        // Anti-Snap Logic:
        // If the remote value is effectively the same as our local value (tolerant of small float diffs), ignore.
        // But if it's different (e.g. partner moved it), we update.
        if (Math.abs(remoteValue - sliderValue) > 0.05) {
            setSliderValue(remoteValue)
        }
    }, [currentVibe])

    const handlePointerDown = () => {
        isDragging.current = true
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        setSliderValue(val)
        onDrag(val)
    }

    const handlePointerUp = () => {
        isDragging.current = false
        // Commit the change
        // KEY CHANGE: We now save the EXACT float value as a string to the DB.
        // This allows the partner to see "2.45" instead of just "Neutral".
        // The App is now "Vibe 2.0" compatible (float strings).
        onVibeChange(sliderValue.toFixed(2), sliderValue)
    }

    // Calculated label for display
    const labelIndex = Math.min(Math.max(Math.round(sliderValue), 0), 4)

    return (
        <div className="w-full max-w-sm mx-auto space-y-4 pt-2">
            <div className="text-center h-6">
                <motion.p
                    key={vibes[labelIndex]}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-stone-800 font-serif text-xl tracking-wide font-medium"
                >
                    {vibes[labelIndex]}
                </motion.p>
            </div>

            <div className="relative w-full h-10 flex items-center justify-center">
                <input
                    type="range"
                    min="0"
                    max="4"
                    step="0.01"
                    value={sliderValue}
                    onPointerDown={handlePointerDown}
                    onChange={handleChange}
                    onPointerUp={handlePointerUp} // Desktop
                    onTouchStart={handlePointerDown}
                    onTouchEnd={handlePointerUp} // Mobile
                    className="w-full h-2 bg-stone-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
                    style={{
                        background: `linear-gradient(to right, #57534e 0%, #57534e ${(sliderValue / 4) * 100}%, #e7e5e4 ${(sliderValue / 4) * 100}%, #e7e5e4 100%)`
                    }}
                />
                <style jsx>{`
                    input[type=range]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        height: 24px;
                        width: 24px;
                        border-radius: 50%;
                        background: #292524;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                        margin-top: -2px;
                    }
                    input[type=range]::-moz-range-thumb {
                        height: 24px;
                        width: 24px;
                        border-radius: 50%;
                        background: #292524;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    }
                `}</style>
            </div>

            <div className="flex justify-between px-1">
                <span className="text-[10px] uppercase text-stone-600 font-bold tracking-widest">Disconnected</span>
                <span className="text-[10px] uppercase text-stone-600 font-bold tracking-widest">In Flow</span>
            </div>
        </div>
    )
}
