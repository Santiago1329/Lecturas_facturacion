'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [cargando, setCargando] = useState(false)
    const router = useRouter()

    const handleLogin = async (e) => {
        e.preventDefault()
        setCargando(true)
        setError(null)

        const {error} = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            setError('Email o contraseña incorrectos')
            setCargando(false)
            return
        }

        router.push('/rutas')
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-gray-100'>
            <form
                onSubmit={handleLogin}
                className='bg-white p-8 rounded-lg shadow-md w-full max-w-sm'
            >
                <h1 className='text-2xl font-bold mb-6 text-center'>Panel de facturacion</h1>

                <input 
                    type="email" 
                    placeholder="Correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full border rounded px-3 py-2 mb-4'
                    required
                />
                
                <input 
                    type="password" 
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full border rounded px-3 py-2 mb-4'
                    required
                />

                {error && <p className='text-red-500 text-sm mb-4'>{error}</p>}

                <button 
                    type="submit"
                    disabled={cargando}
                    className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50'
                >
                    {cargando ? 'Ingresando...' : 'Ingresar'}
                </button>
            </form>
        </div>
    )
}