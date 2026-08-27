'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import * as xlsx from 'xlsx'

export default function RutasPage() {
    const [rutas, setRutas] = useState([])
    const [cargando, setCargando] = useState(true)
    const router = useRouter()

    useEffect(() => {
        let nombreCanal = `rutas-cambios-${Date.now()}`
        const canal = supabase
            .channel(nombreCanal)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rutas' },
                () => traerRutas()
            )
            .subscribe()

        async function traerRutas() {
            const [{ data: rutasData, error }, { data: lectoresData }] = await Promise.all([
                supabase.from('rutas').select().order('id', { ascending: false }),
                supabase.from('lectores').select('id, nombre')
            ])

            if (error) {
                setCargando(false)
                return
            }

            const mapaLectores = Object.fromEntries(
                (lectoresData || []).map(l => [l.id, l.nombre])
            )

            const rutasConNombre = rutasData.map(r => ({
                ...r,
                lector_nombre: mapaLectores[r.lector_id] || '-'
            }))

            setRutas(rutasConNombre)
            setCargando(false)
        }
        
        async function iniciar() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }
            
            await traerRutas()
        }

        iniciar()

        return () => {
            if (canal) supabase.removeChannel(canal)
        }
    }, [router])

    const descargarRuta = async (ruta) => {
        const { data: medidores, error } = await supabase
            .from('medidores')
            .select()
            .eq('ruta_id', ruta.id)
            .order('orden_visita')
        
        if (error) {
            alert('Error trayendo los medidores: ' + error.message)
            return
        }

        const filas = medidores.map(m => ({
            codigo: m.codigo,
            nombre_cliente: m.nombre_cliente,
            direccion: m.direccion,
            lect_ant: m.lect_ant,
            lect_act: m.lect_act,
            cons_ant: m.cons_ant,
            cons_act: m.cons_act,
            descripcion: m.descripcion,
            promedio: m.promedio,
            serie: m.serie,
            lect_rev: m.lect_rev,
            nl_lc: m.nl_lc,
            observacion: m.observacion,
        }))

        const hoja = xlsx.utils.json_to_sheet(filas)
        const workbook = xlsx.utils.book_new()
        xlsx.utils.book_append_sheet(workbook, hoja, 'Lecturas')

        const nombreArchivo = `${ruta.nombre.replace(/[\s-]+/g, '_')}_completa.xlsx`
        xlsx.writeFile(workbook, nombreArchivo) 

        await supabase.from('rutas').update({ exportada: true }).eq('id', ruta.id);
    }

    if (cargando) {
        return <div className="p-8">Cargando rutas...</div>
    }

    const estadoColor = {
        pendiente: 'bg-gray-200 text-gray-700',
        en_progreso: 'bg-yellow-100 text-yellow-700',
        completa: 'bg-green-100 text-green-700'
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
                            <th className="p-4">Encargado</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rutas.map(ruta =>(
                            <tr key={ruta.id} className='border-b last:border:0'>
                                <td className="p-4">{ruta.nombre}</td>
                                <td className="p-4">{ruta.lector_nombre}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-sm ${estadoColor[ruta.estado]}`}>
                                        {ruta.estado}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {ruta.estado === 'completa' && (
                                        <button
                                            onClick={() => descargarRuta(ruta)}
                                            className='text-blue-600 cursor-pointer hover:underline text-sm'
                                        >
                                            Descargar .xlsx
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}