'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as xlsx from 'xlsx'
import { supabase } from '@/lib/supabaseClient'

export default function NuevaRutaPage() {
    const [lectores, setLectores] = useState([])
    const [lectorId, setLectorId] = useState('')
    const [nombreRuta, setNombreRuta] = useState('')
    const [archivo, setArchivo] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const router = useRouter()

    useEffect(() => {
        async function traerLectores() {
            const {data} = await supabase.from('lectores').select('id, nombre')
            setLectores(data || [])
        }
        traerLectores()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setCargando(true)
        setMensaje(null)


        try {
            const buffer = await archivo.arrayBuffer()
            const workbook = xlsx.read(buffer)

            // La primera hoja siempre es la que se usará
            const hojaDatos = workbook.Sheets[workbook.SheetNames[0]]

            // Leemos por posicion (como array de arrays)
            const filasRaw = xlsx.utils.sheet_to_json(hojaDatos, { header: 1 })

            // La primera fila es el encabezado
            const filas = filasRaw.slice(1).filter(fila => fila[3])

            if (filas.length === 0) {
                setMensaje({tipo: 'error', texto: 'El archivo no contiene datos.'})
                setCargando(false)
                return
            }

            // Crear Ruta
            const { data: ruta, error: errorRuta } = await supabase
                .from('rutas')
                .insert({
                    nombre: nombreRuta,
                    estado: 'pendiente',
                    lector_id: lectorId,
                    descargada: false,
                })
                .select()
                .single()

            if (errorRuta) throw new Error(errorRuta.message)

            const medidores = filas.map((fila, index) => ({
                ruta_id: ruta.id,
                codigo: String(fila[3] ?? ''),
                nombre_cliente: fila[16] ?? null,
                direccion: fila[4] ?? null,
                uso_estrato: fila[13] ?? null,
                lect_ant: fila[18] ?? null,
                cons_ant: fila[19] ?? null,
                lect_act: fila[22] ?? null,
                cons_act: fila[23] ?? null,
                descripcion: fila[26] ?? null,
                promedio: fila[27] ?? null,
                serie: String(fila[28] ?? null),
                orden_visita: index + 1,
            }))

            const { error: errorMedidores } = await supabase
                .from('medidores')
                .insert(medidores)

            if (errorMedidores) throw new Error(errorMedidores.message)
            
            setMensaje({tipo: 'exito', texto: `Ruta creada con ${medidores.length} medidores.`})

            setTimeout(() => router.push('/rutas'), 1500)
        } catch (e) {
            setMensaje({tipo: 'error', texto: e.message})
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Cargar Nueva Ruta</h1>

            <form onSubmit={handleSubmit} className='bg-white p-6 rounded-lg shadow'>
                <label className='block mb-4'>
                    <span className='block mb-1 text-sm font-medium'>Nombre de la Ruta</span>
                    <input 
                        type="text" 
                        value={nombreRuta}
                        onChange={(e) => setNombreRuta(e.target.value)}
                        className='w-full border rounded px-3 py-2'
                        required
                    />
                </label>

                <label className='block mb-4'>
                    <span className='block mb-1 text-sm font-medium'>Lector Asignado</span>
                    <select 
                        value={lectorId}
                        onChange={(e) => setLectorId(e.target.value)}
                        className='w-full border rounded px-3 py-2'
                        required
                    >
                        <option value="">Selecciona un lector</option>
                        {lectores.map(lector => (
                            <option key={lector.id} value={lector.id}>{lector.nombre}</option>
                        ))}
                    </select>
                </label>

                <label className='block mb-4'>
                    <span className='block mb-1 text-sm font-medium'>Archivo .xlsx o .xls</span>
                    <input 
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setArchivo(e.target.files[0])}
                        className='w-full border rounded px-3 py-2'
                        required
                    />
                </label>

                {mensaje && (
                    <p
                        className={`text-sm mb-4 ${
                            mensaje.tipo === 'error' ? 'text-red-500' : 'text-green-600'
                        }`}
                    >
                        {mensaje.texto}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={cargando}
                    className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50'
                >
                    {cargando ? 'Cargando...' : 'Cargar Ruta'}
                </button>
            </form>
        </div>
    )
}