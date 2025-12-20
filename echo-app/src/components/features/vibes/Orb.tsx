'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface Glow {
    id: string
    message: string
}

interface OrbProps {
    myVibe: string
    partnerVibe: string
    myScoreOverride?: number
    glows?: Glow[]
    onGlowRead?: (id: string) => void
}

// Ordered strictly by score 0-4
const vibePalette = [
    ['#94a3b8', '#64748b'], // 0: Slate
    ['#c084fc', '#a855f7'], // 1: Purple
    ['#f1f5f9', '#e2e8f0'], // 2: White/Gray
    ['#facc15', '#fbbf24'], // 3: Amber
    ['#fb7185', '#f43f5e'], // 4: Rose
]

const vibeValues: Record<string, number> = {
    'Out of Sync': 0,
    'Quiet': 1,
    'Neutral': 2,
    'Connected': 3,
    'Radiant': 4,
}

const interpolateHex = (c1: string, c2: string, factor: number) => {
    const r1 = parseInt(c1.substring(1, 3), 16)
    const g1 = parseInt(c1.substring(3, 5), 16)
    const b1 = parseInt(c1.substring(5, 7), 16)

    const r2 = parseInt(c2.substring(1, 3), 16)
    const g2 = parseInt(c2.substring(3, 5), 16)
    const b2 = parseInt(c2.substring(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * factor)
    const g = Math.round(g1 + (g2 - g1) * factor)
    const b = Math.round(b1 + (b2 - b1) * factor)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const getDynamicColors = (score: number) => {
    const clamped = Math.max(0, Math.min(4, score))
    const index = Math.floor(clamped)
    const nextIndex = Math.min(index + 1, 4)
    const factor = clamped - index

    const c1Start = vibePalette[index][0]
    const c1End = vibePalette[index][1]

    const c2Start = vibePalette[nextIndex][0]
    const c2End = vibePalette[nextIndex][1]

    return [
        interpolateHex(c1Start, c2Start, factor),
        interpolateHex(c1End, c2End, factor)
    ]
}

export function Orb({ myVibe, partnerVibe, myScoreOverride, glows = [], onGlowRead }: OrbProps) {
    const getScore = (v: string) => {
        const float = parseFloat(v)
        if (!isNaN(float)) return float
        return vibeValues[v] ?? 2
    }

    const myScore = myScoreOverride ?? getScore(myVibe)
    const partnerScore = getScore(partnerVibe)

    const myColors = getDynamicColors(myScore)
    const partnerColors = getDynamicColors(partnerScore)

    const totalScore = myScore + partnerScore

    // Physics Constants
    // Radius: 150px (far/max) -> 60px (close/min)
    const targetRadius = 150 - (totalScore * 11.25)

    // Speed: Degrees per frame. 
    const speed = 0.05 + (totalScore * 0.07)

    // Animation Loop for Smooth Physics
    const [angle, setAngle] = useState(0)
    const [currentRadius, setCurrentRadius] = useState(targetRadius) // Smooth radius state

    const requestRef = useRef<number>(0)
    const angleRef = useRef(0)
    const radiusRef = useRef(targetRadius)

    useEffect(() => {
        const animate = () => {
            // Update Angle
            angleRef.current = (angleRef.current + speed) % 360
            setAngle(angleRef.current)

            // Update Radius (Lerp)
            radiusRef.current = radiusRef.current + (targetRadius - radiusRef.current) * 0.05
            setCurrentRadius(radiusRef.current)

            requestRef.current = requestAnimationFrame(animate)
        }
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current)
    }, [speed, targetRadius])

    return (
        <div className="relative flex items-center justify-center h-80 w-full overflow-visible">

            {/* Central Gravity Well (Sun) */}
            <motion.div
                className="absolute rounded-full blur-2xl z-0 mix-blend-screen bg-amber-100"
                style={{
                    width: Math.max(0, (100 - currentRadius) * 1.5),
                    height: Math.max(0, (100 - currentRadius) * 1.5),
                    opacity: (100 - currentRadius) / 200
                }}
            />

            {/* Orbital Container */}
            <div className="absolute w-full h-full flex items-center justify-center pointer-events-none"
                style={{ transform: `rotate(${angle}deg)` }}>

                {/* My Orb + Tail */}
                <div className="absolute" style={{ transform: `translateX(${currentRadius}px)` }}>
                    <div className="relative">
                        <OrbWithTail colors={myColors} score={myScore} />

                        {/* Render Active Glows around MY ORB */}
                        {glows.map((glow, i) => (
                            <GlowParticle
                                key={glow.id}
                                glow={glow}
                                index={i}
                                total={glows.length}
                                onRead={onGlowRead}
                            />
                        ))}
                    </div>
                </div>

                {/* Partner Orb + Tail */}
                <div className="absolute" style={{ transform: `translateX(${-currentRadius}px) rotate(180deg)` }}>
                    <OrbWithTail colors={partnerColors} score={partnerScore} />
                </div>

            </div>
        </div>
    )
}

function OrbWithTail({ colors, score }: { colors: string[], score: number }) {
    return (
        <div className="relative flex items-center justify-center pointer-events-none">
            {/* Comet Trail */}
            <div className="absolute w-40 h-10 rounded-full blur-lg opacity-40 origin-right"
                style={{
                    right: '50%',
                    background: `linear-gradient(to left, ${colors[0]}, transparent)`,
                    transform: 'translateX(20px) rotate(90deg) scaleX(1)',
                    pointerEvents: 'none'
                }}
            />

            {/* Orb Body */}
            <div
                className="w-24 h-24 rounded-full shadow-lg z-10 backdrop-blur-sm relative transition-colors duration-75"
                style={{
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                    boxShadow: `0 0 ${20 + score * 10}px -5px ${colors[0]}90`,
                }}
            >
                <div className="absolute inset-0 rounded-full bg-white opacity-20 blur-sm" />
            </div>
        </div>
    )
}

function GlowParticle({ glow, index, total, onRead }: { glow: Glow, index: number, total: number, onRead?: (id: string) => void }) {
    // Distribute particles around the orb
    const offsetAngle = (360 / total) * index

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{ rotate: { duration: 10 + index, repeat: Infinity, ease: "linear" } }}
            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
            style={{
                // Container rotates self, but we position particle at offset
            }}
        >
            <motion.button
                onClick={(e) => {
                    // Stop propagation so we don't click anything else logic-wise if needed
                    e.stopPropagation()
                    // Show alert and mark read
                    alert(`Received Glow: "${glow.message}"`)
                    onRead?.(glow.id)
                }}
                className="absolute w-6 h-6 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] cursor-pointer hover:scale-125 transition-transform z-50 flex items-center justify-center"
                style={{
                    top: -40, // Orbit radius from orb center
                    left: '50%',
                    marginLeft: -12,
                    transformOrigin: '50% 80px', // Rotate around orb center
                    transform: `rotate(${offsetAngle}deg)`
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
            >
                <div className="w-2 h-2 bg-amber-200 rounded-full animate-pulse" />
            </motion.button>
        </motion.div>
    )
}
