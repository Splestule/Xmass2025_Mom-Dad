'use client'

import { signup } from '../auth/actions'
import Link from 'next/link'
import { useState } from 'react'

export default function SignupPage() {
    const [isNewFamily, setIsNewFamily] = useState(true)

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-6 font-sans">
            <div className="w-full max-w-md bg-white border border-stone-200 p-8 rounded-2xl shadow-xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-serif text-stone-900 tracking-tight">Begin Your Journey</h1>
                    <p className="text-stone-600">Create or join a shared space</p>
                </div>

                <form className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-900 uppercase tracking-wider" htmlFor="displayName">
                            Your Name
                        </label>
                        <input
                            id="displayName"
                            name="displayName"
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-all text-stone-900 placeholder:text-stone-400"
                            placeholder="Mom"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-900 uppercase tracking-wider" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-all text-stone-900 placeholder:text-stone-400"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-900 uppercase tracking-wider" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-all text-stone-900 placeholder:text-stone-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="p-4 bg-stone-50 rounded-xl space-y-4 border border-stone-200">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setIsNewFamily(true)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isNewFamily ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-200'}`}
                            >
                                New Space
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNewFamily(false)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isNewFamily ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-200'}`}
                            >
                                Join Existing
                            </button>
                        </div>

                        {isNewFamily ? (
                            <input type="hidden" name="familyId" value="create_new" />
                        ) : (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider" htmlFor="familyId">
                                    Family ID Code
                                </label>
                                <input
                                    id="familyId"
                                    name="familyId"
                                    type="text"
                                    required={!isNewFamily}
                                    className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-sm text-stone-900"
                                    placeholder="e.g. 123e4567-e89b..."
                                />
                            </div>
                        )}
                    </div>

                    <button
                        formAction={signup}
                        className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        {isNewFamily ? 'Create Sanctuary' : 'Join Sanctuary'}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-stone-500 text-sm">
                        Already have a space?{' '}
                        <Link href="/login" className="text-stone-800 font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
