'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function RutasPage() {
    const [rutas, setRutas] = useState([])
    const [cargando, setCargando] = useState(true)
    const router = useRouter()

    useEffect(() => {
        let nombreCanal = `rutas-cambios-${Date.now()}`
        let canal

        async function traerRutas() {
            const { data, error } = await supabase
                .from('rutas')
                .select()
                .order('id', { ascending: false })

            if (!error) setRutas(data)
            setCargando(false)
        }
        
        async function iniciar() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }
            
            await traerRutas()
            
            canal = supabase
                .channel(nombreCanal)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'rutas' },
                    () => traerRutas()
                )
                .subscribe();
        }

        iniciar()

        return () => {
            if (canal) supabase.removeChannel(canal)
        }
    }, [router])

    if (cargando) {
        return <div className="p-8">Cargando rutas...</div>
    }

    const estadoColor = {
        pendiente: 'bg-gray-200 text-gray-700',
        en_progreso: 'bg-yellow-100 text-yellow-700',
        completada: 'bg-green-100 text-green-700'
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Rutas</h1>
            <Link
                href="/rutas/nueva"
                className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
            >
                Cargar nueva ruta
            </Link>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className='w-full text-left'>
                    <thead className='bg-gray-50 border-b'>
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Descargada</th>
                            <th className="p-4">Exportada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rutas.map(ruta =>(
                            <tr key={ruta.id} className='border-b last:border:0'>
                                <td className="p-4">{ruta.nombre}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-sm ${estadoColor[ruta.estado]}`}>
                                        {ruta.estado}
                                    </span>
                                </td>
                                <td className="p-4">{ruta.descargada ? 'Si' : 'No'}</td>
                                <td className="p-4">{ruta.exportada ? 'Si' : 'No'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}