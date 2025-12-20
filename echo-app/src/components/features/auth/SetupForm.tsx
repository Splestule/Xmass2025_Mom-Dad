'use client'

import { useState } from 'react'
import { createFamily, joinFamily } from '@/app/auth/setup/actions'
import { signout } from '@/app/auth/signout/actions'

export function SetupForm({ userEmail }: { userEmail: string }) {
    const [mode, setMode] = useState<'create' | 'join'>('create')

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg space-y-6 max-w-md w-full text-left" suppressHydrationWarning>
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-serif text-stone-900">Complete Your Setup</h1>
                <p className="text-stone-600 text-sm">You're signed in as <span className="font-semibold">{userEmail}</span>, but not linked to a family yet.</p>
            </div>

            <div className="flex gap-4 p-1 bg-stone-100 rounded-lg">
                <button
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'create' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    Create New Space
                </button>
                <button
                    onClick={() => setMode('join')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'join' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    Join Existing
                </button>
            </div>

            <form action={mode === 'create' ? createFamily : joinFamily} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-900 uppercase tracking-wider">Display Name</label>
                    <input
                        name="displayName"
                        required
                        placeholder="Dad"
                        className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-stone-900 placeholder:text-stone-400"
                    />
                </div>

                {mode === 'join' && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-900 uppercase tracking-wider">Family ID</label>
                        <input
                            name="familyId"
                            required
                            placeholder="UUID..."
                            className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-stone-900 placeholder:text-stone-400"
                        />
                    </div>
                )}

                <button className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium shadow-lg transition-all">
                    {mode === 'create' ? 'Create Space' : 'Join Space'}
                </button>
            </form>

            <div className="border-t border-stone-100 pt-4 text-center">
                <form action={signout}>
                    <button className="text-xs text-stone-400 hover:text-stone-600 uppercase tracking-widest">
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    )
}
