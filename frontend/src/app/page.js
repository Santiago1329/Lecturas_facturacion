'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function home() {
  const router = useRouter()

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession()

      router.replace(session ? '/rutas' : '/login')
    }

    verificarSesion()
  }, [router])

  return null
}