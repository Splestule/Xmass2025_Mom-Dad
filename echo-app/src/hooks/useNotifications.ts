'use client'

import { useState, useEffect } from 'react'
import { subscribeUser } from '@/app/actions/notifications'

export function useNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            setPermission(Notification.permission)
            checkSubscription()
        }
    }, [])

    const checkSubscription = async () => {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
    }

    const subscribe = async () => {
        try {
            setLoading(true)
            // 1. Request Permission
            const perm = await Notification.requestPermission()
            setPermission(perm)

            if (perm !== 'granted') {
                alert('Notifications blocked. Please enable them in browser settings.')
                return
            }

            // 2. Register Service Worker (Manual fallback for dev)
            let registration = await navigator.serviceWorker.getRegistration()
            if (!registration) {
                registration = await navigator.serviceWorker.register('/push-sw.js')
            }

            // Wait for it to be active
            if (!registration.active) {
                await new Promise<void>((resolve) => {
                    const worker = registration!.installing || registration!.waiting
                    if (worker) {
                        worker.addEventListener('statechange', (e) => {
                            if ((e.target as any).state === 'activated') resolve()
                        })
                    } else {
                        resolve()
                    }
                })
            }

            // 3. Subscribe to Push
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
            console.log('Using VAPID Key:', vapidKey)

            if (!vapidKey) throw new Error('Missing VAPID Key')

            // Convert string key to Uint8Array
            const convertedVapidKey = urlBase64ToUint8Array(vapidKey)
            console.log('Converted Key Length:', convertedVapidKey.length)

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })

            // 4. Send to Server
            await subscribeUser(JSON.parse(JSON.stringify(subscription)))

            setIsSubscribed(true)
            alert('Enabled! 🔔')

        } catch (e: any) {
            console.error('Subscription failed details:', e)
            alert(`Failed: ${e.name} - ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    const unregister = async () => {
        try {
            setLoading(true)
            const registration = await navigator.serviceWorker.getRegistration()
            if (registration) {
                // 1. Unsubscribe from PushManager if exists
                const sub = await registration.pushManager.getSubscription()
                if (sub) {
                    await sub.unsubscribe()
                    console.log('Old subscription removed.')
                }

                // 2. Unregister SW
                await registration.unregister()
                setIsSubscribed(false)
                alert('Fully Reset (Sub + SW). Reloading...')
                window.location.reload()
            } else {
                alert('No Service Worker found to unregister.')
            }
        } catch (e: any) {
            console.error('Unregister failed:', e)
            alert('Reset Error: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    return {
        isSupported,
        isSubscribed,
        permission,
        loading,
        subscribe,
        unregister
    }
}

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
