'use client'

'use client'

import { login } from '../auth/actions'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message')
    const error = searchParams.get('error')

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-6 font-sans">
            <div className="w-full max-w-md bg-white border border-stone-200 p-8 rounded-2xl shadow-xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-serif text-stone-900 tracking-tight">Welcome Back</h1>
                    <p className="text-stone-600">Enter your sanctuary</p>
                </div>

                {(message || error) && (
                    <div className={`p-4 rounded-lg text-sm text-center ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message || error}
                    </div>
                )}

                <form className="space-y-6">
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

                    <button
                        formAction={login}
                        className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Sign In
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-stone-500 text-sm">
                        Don't have a space yet?{' '}
                        <Link href="/signup" className="text-stone-800 font-semibold hover:underline">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    )
}
