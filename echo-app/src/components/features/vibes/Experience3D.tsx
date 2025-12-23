'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Trail, Sparkles } from '@react-three/drei'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { Vector3 } from 'three'

// --- Types ---
interface Glow {
    id: string
    message: string
    sender_id: string
    created_at?: string
}

type FocusedView = 'overview' | 'mine' | 'partner'

interface Experience3DProps {
    myVibe: string
    partnerVibe: string
    myScoreOverride?: number
    glows: Glow[]
    onGlowRead: (id: string, message: string) => void
    focusedView: FocusedView
    onOrbClick: (view: FocusedView) => void
}

// --- Constants & Helpers ---
const VIBE_VALUES: Record<string, number> = {
    'Out of Sync': 0,
    'Quiet': 1,
    'Neutral': 2,
    'Connected': 3,
    'Radiant': 4,
}

const getScore = (v: string) => {
    const float = parseFloat(v)
    if (!isNaN(float)) return float
    return VIBE_VALUES[v] ?? 2
}

const VIBE_COLORS = {
    0: new THREE.Color('#94a3b8'),
    1: new THREE.Color('#c084fc'),
    2: new THREE.Color('#f1f5f9'),
    3: new THREE.Color('#facc15'),
    4: new THREE.Color('#fb7185'),
}

const getColorForScore = (score: number) => {
    const clamped = Math.max(0, Math.min(4, score))
    const lowerIndex = Math.floor(clamped)
    const upperIndex = Math.ceil(clamped)
    const alpha = clamped - lowerIndex

    // @ts-expect-error - indices are safe
    const c1 = VIBE_COLORS[lowerIndex]
    // @ts-expect-error - indices are safe
    const c2 = VIBE_COLORS[upperIndex]

    return c1.clone().lerp(c2, alpha)
}

// --- Animation Logic ---

type GlowStatus = 'entering' | 'present' | 'exiting'

interface PresenceGlow extends Glow {
    status: GlowStatus
}

function usePresenceGlows(glows: Glow[], duration = 1000): PresenceGlow[] {
    const [presenceList, setPresenceList] = useState<PresenceGlow[]>([])
    const prevGlowsRef = useRef<Glow[]>([])

    useMemo(() => {
        const nextGlows = glows
        const prevGlows = prevGlowsRef.current

        const added = nextGlows.filter(n => !prevGlows.some(p => p.id === n.id))
        const removed = prevGlows.filter(p => !nextGlows.some(n => n.id === p.id))
        const kept = nextGlows.filter(n => prevGlows.some(p => p.id === n.id))

        setPresenceList(current => {
            const existingExiting = current.filter(c => c.status === 'exiting')
            const newEntries = added.map(g => ({ ...g, status: 'entering' } as PresenceGlow))
            const newExits = removed.map(g => ({ ...g, status: 'exiting' } as PresenceGlow))
            const keptEntries = kept.map(g => ({ ...g, status: 'present' } as PresenceGlow))
            return [...keptEntries, ...newEntries, ...existingExiting, ...newExits]
        })

        prevGlowsRef.current = nextGlows
    }, [glows])

    useEffect(() => {
        const hasExiting = presenceList.some(p => p.status === 'exiting')
        if (!hasExiting) return

        const timer = setTimeout(() => {
            setPresenceList(prev => prev.filter(p => p.status !== 'exiting'))
        }, duration)

        return () => clearTimeout(timer)
    }, [presenceList, duration])

    return presenceList
}

function Orb3D({
    color,
    position,
    isUser = false,
    glows = [],
    onGlowRead,
    onClick,
    opacity = 1
}: {
    color: THREE.Color,
    position: Vector3,
    isUser?: boolean,
    glows?: Glow[],
    onGlowRead?: (id: string, message: string) => void
    onClick?: () => void
    opacity?: number
}) {
    const meshRef = useRef<THREE.Mesh>(null)
    const hullRef = useRef<THREE.Mesh>(null)
    const presenceGlows = usePresenceGlows(glows)

    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = clock.getElapsedTime() * 0.5
            meshRef.current.rotation.z = clock.getElapsedTime() * 0.2

            const mat = meshRef.current.material as any
            if (mat.color) mat.color.lerp(color, 0.1)
            if (mat.emissive) mat.emissive.lerp(color, 0.1)
            if (mat.opacity !== undefined) {
                mat.opacity += (opacity - mat.opacity) * 0.1
            }
        }
        if (hullRef.current) {
            const hMat = hullRef.current.material as any
            if (hMat.opacity !== undefined) {
                hMat.opacity += (opacity - hMat.opacity) * 0.1
            }
        }
    })

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                }}
                onPointerOver={() => {
                    document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                    document.body.style.cursor = 'auto'
                }}
            >
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshPhysicalMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5 + (isUser ? 0.2 : 0)}
                    roughness={0.1}
                    metalness={0.1}
                    transmission={0.6}
                    thickness={1}
                    sheen={isUser ? 1 : 0}
                    sheenColor={isUser ? "#bae6fd" : "#000000"}
                    sheenRoughness={0.5}
                    transparent
                    depthWrite={true}
                />
            </mesh>

            {isUser && (
                <mesh raycast={() => null} ref={hullRef}>
                    <sphereGeometry args={[0.55, 32, 32]} />
                    <meshBasicMaterial
                        color="#bae6fd"
                        side={THREE.BackSide}
                        toneMapped={false}
                        transparent
                    />
                </mesh>
            )}

            {opacity > 0.01 && (
                <Trail
                    width={2 * opacity}
                    length={8}
                    color={color}
                    attenuation={(t) => t * t}
                >
                    <mesh visible={false}>
                        <sphereGeometry args={[0.4, 16, 16]} />
                        <meshBasicMaterial />
                    </mesh>
                </Trail>
            )}

            {presenceGlows.map((glow, i) => (
                <GlowSphere
                    key={glow.id}
                    glow={glow}
                    index={i}
                    total={glows.length}
                    onRead={onGlowRead}
                    interactive={!!onGlowRead && glow.status !== 'exiting'}
                    status={glow.status}
                    parentOpacity={opacity}
                />
            ))}
        </group>
    )
}

function GlowSphere({ glow, index, total, onRead, interactive, status, parentOpacity = 1 }: { glow: Glow, index: number, total: number, onRead?: (id: string, message: string) => void, interactive: boolean, status: GlowStatus, parentOpacity?: number }) {
    const groupRef = useRef<THREE.Group>(null)
    const meshRef = useRef<THREE.Mesh>(null)
    const [hovered, setHovered] = useState(false)

    const currentOpacity = useRef(0) // Start invisible for fade-in!
    const currentScale = useRef(1.0)

    // Unique orbit physics for each glow
    const { orbitOffset, orbitSpeed } = useMemo(() => {
        const q = new THREE.Quaternion()
        q.setFromEuler(new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        ))
        return {
            orbitOffset: q,
            orbitSpeed: 0.2 + Math.random() * 0.2
        }
    }, [])

    useFrame(({ clock }) => {
        if (!groupRef.current || !meshRef.current) return
        const t = clock.getElapsedTime()

        // Combine exit status opacity with parent's view opacity
        const statusScale = status === 'exiting' ? 0 : 0.8
        const targetOpacity = statusScale * parentOpacity

        const targetScale = (hovered && interactive) ? 1.5 : 1.0

        currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.1
        currentScale.current += (targetScale - currentScale.current) * 0.1

        meshRef.current.scale.setScalar(currentScale.current * 0.08)
        const mat = meshRef.current.material as THREE.MeshPhysicalMaterial
        mat.opacity = currentOpacity.current
        mat.transparent = true

        // 2. Randomized Orbit logic
        const angle = (index / Math.max(1, total)) * Math.PI * 2 + t * orbitSpeed
        const orbitRadius = 0.7

        const pos = new Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius)
        pos.applyQuaternion(orbitOffset)

        groupRef.current.position.copy(pos)
    })

    return (
        <group ref={groupRef}>
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    if (!interactive) return
                    e.stopPropagation()
                    onRead?.(glow.id, glow.message)
                }}
                onPointerOver={() => {
                    if (interactive) {
                        setHovered(true)
                        document.body.style.cursor = 'pointer'
                    }
                }}
                onPointerOut={() => {
                    setHovered(false)
                    document.body.style.cursor = 'auto'
                }}
            >
                <sphereGeometry args={[1, 16, 16]} />
                <meshPhysicalMaterial
                    color="#facc15"
                    emissive="#f59e0b"
                    emissiveIntensity={3}
                    roughness={0.1}
                    metalness={0.1}
                    transmission={0.4}
                    thickness={0.5}
                    transparent
                />

                {parentOpacity > 0.01 && (
                    <Trail
                        width={0.25}
                        length={4}
                        color="#fbbf24"
                        attenuation={(t) => t * t}
                    >
                        <mesh visible={false}>
                            <sphereGeometry args={[0.01, 8, 8]} />
                            <meshBasicMaterial />
                        </mesh>
                    </Trail>
                )}
            </mesh>
        </group>
    )
}

function Scene({ myVibe, partnerVibe, myScoreOverride, glows, onGlowRead, focusedView, onOrbClick, currentUserId }: Experience3DProps & { currentUserId: string }) {
    const myScore = myScoreOverride ?? getScore(myVibe)
    const partnerScore = getScore(partnerVibe)
    const totalScore = myScore + partnerScore

    const incomingGlows = useMemo(() => glows.filter(g => g.sender_id !== currentUserId), [glows, currentUserId])
    const outgoingGlows = useMemo(() => glows.filter(g => g.sender_id === currentUserId), [glows, currentUserId])

    const handleRead = (focusedView === 'mine') ? onGlowRead : undefined

    const targetRadius = 2.5 - (totalScore * 0.2)
    const effectiveRadius = Math.max(0.9, targetRadius)
    const speed = 0.005 + (totalScore * 0.002)

    const angleRef = useRef(0)
    const radiusRef = useRef(effectiveRadius)

    const [myPos, setMyPos] = useState(new Vector3(effectiveRadius, 0, 0))
    const [partnerPos, setPartnerPos] = useState(new Vector3(-effectiveRadius, 0, 0))

    const { camera } = useThree()
    const lookAtTarget = useRef(new Vector3(0, 0, 0))

    useFrame(() => {
        radiusRef.current += (effectiveRadius - radiusRef.current) * 0.1
        angleRef.current = (angleRef.current + speed) % (Math.PI * 2)

        const r = radiusRef.current
        const a = angleRef.current

        const newMyPos = new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)
        const newPartnerPos = new Vector3(Math.cos(a + Math.PI) * r, 0, Math.sin(a + Math.PI) * r)

        setMyPos(newMyPos)
        setPartnerPos(newPartnerPos)

        let targetCamPos = new Vector3()
        let targetLookAt = new Vector3()

        if (focusedView === 'overview') {
            const maxDist = 8
            const minDist = 6
            const targetDist = maxDist - (totalScore / 8) * (maxDist - minDist)
            targetCamPos.set(0, targetDist * 0.8, targetDist)
            targetLookAt.set(0, 0, 0)
        } else if (focusedView === 'mine') {
            targetCamPos.copy(newMyPos).add(new Vector3(0, 2, 4))
            targetLookAt.copy(newMyPos)
        } else if (focusedView === 'partner') {
            targetCamPos.copy(newPartnerPos).add(new Vector3(0, 2, 4))
            targetLookAt.copy(newPartnerPos)
        }

        if (focusedView === 'overview') {
            camera.position.lerp(targetCamPos, 0.05)
            lookAtTarget.current.lerp(targetLookAt, 0.05)
            camera.lookAt(lookAtTarget.current)
        } else {
            const dist = camera.position.distanceTo(targetCamPos)
            if (dist > 0.02) {
                camera.position.lerp(targetCamPos, 0.1)
                lookAtTarget.current.lerp(targetLookAt, 0.1)
                camera.lookAt(lookAtTarget.current)
            } else {
                camera.position.copy(targetCamPos)
                camera.lookAt(targetLookAt)
                lookAtTarget.current.copy(targetLookAt)
            }
        }
    })

    const myColor = getColorForScore(myScore)
    const partnerColor = getColorForScore(partnerScore)
    const opacityMine = (focusedView === 'overview' || focusedView === 'mine') ? 1 : 0
    const opacityPartner = (focusedView === 'overview' || focusedView === 'partner') ? 1 : 0
    const sunIntensity = focusedView === 'overview' ? (1 + totalScore * 0.5) : 0

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <pointLight position={[0, 0, 0]} intensity={sunIntensity} color="#fef3c7" distance={10} decay={2} />

            <Orb3D
                color={myColor}
                position={myPos}
                isUser={true}
                glows={incomingGlows}
                onGlowRead={handleRead}
                onClick={() => onOrbClick('mine')}
                opacity={opacityMine}
            />

            <Orb3D
                color={partnerColor}
                position={partnerPos}
                glows={outgoingGlows}
                onClick={() => onOrbClick('partner')}
                opacity={opacityPartner}
            />

            <group raycast={() => null}>
                <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.1} color="#fff" />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </group>
        </>
    )
}

export default function Experience3D({ focusedView, onOrbClick, currentUserId, ...props }: Experience3DProps & { currentUserId: string }) {
    return (
        <div className="h-[50vh] w-full relative overflow-hidden">
            <Canvas
                camera={{ position: [0, 5, 8], fov: 45 }}
                onPointerMissed={() => onOrbClick('overview')}
            >
                <Scene {...props} focusedView={focusedView} onOrbClick={onOrbClick} currentUserId={currentUserId} />
            </Canvas>
        </div>
    )
}
