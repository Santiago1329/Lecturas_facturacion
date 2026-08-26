'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as xlsx from 'xlsx'
import { supabase } from '@/lib/supabaseClient'

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .replace(/[\s_-]+/g, '')
}

function buscarValor(fila, posiblesNombres) {
    const clavesFila = Object.keys(fila)
    for (const nombres of posiblesNombres) {
        const clave = clavesFila.find(k => normalizar(k) === normalizar(nombres))
        if (clave !== undefined) return fila[clave]
    }
    return null
}

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

            const nombreHojaDatos = workbook.SheetNames.find(
                (n) => normalizar(n) !== 'hoja2' && normalizar(n) !== 'sheet1'
            )
            const hojaDatos = workbook.Sheets[nombreHojaDatos]
            const filas = xlsx.utils.sheet_to_json(hojaDatos)

            if (filas.length === 0) {
                setMensaje({tipo: 'error', texto: 'El archivo está vacío.'})
                setCargando(false)
                return
            }

            let opciones = []
            const hojaOpciones = workbook.Sheets['Hoja2']
            if (hojaOpciones) {
                const filasOpciones = xlsx.utils.sheet_to_json(hojaOpciones, {
                    header: 1
                })
                opciones = filasOpciones
                    .map(f => f[0])
                    .filter(v => v && normalizar(v) !== 'descripcion')
            }

            const { data: ruta, error: errorRuta } = await supabase
                .from('rutas')
                .insert({
                    nombre: nombreRuta,
                    estado: 'pendiente',
                    lector_id: lectorId,
                    descargada: false,
                    opciones_nl_lc: opciones,
                })
                .select()
                .single()
            
            if (errorRuta) throw new Error(errorRuta.message)

            const medidores = filas.map((fila, index) => ({
                ruta_id: ruta.id,
                codigo: buscarValor(fila, ['codigo']),
                nombre_cliente: buscarValor(fila, ['nombre_completo', 'nombre', 'nombre_cliente']),
                direccion: buscarValor(fila, ['direccion']),
                lect_ant: buscarValor(fila, ['lect_ant','lect-ant', 'lect ant']),
                cons_ant: buscarValor(fila, ['cons_ant', 'cons-ant', 'cons ant']),
                lect_act: buscarValor(fila, ['lect - act', 'lect-act', 'lect_act']),
                cons_act: buscarValor(fila, ['cons- act', 'cons-act', 'cons_act']),
                descripcion: buscarValor(fila, ['descripcion']),
                promedio: buscarValor(fila, ['prom', 'promedio']),
                serie: buscarValor(fila, ['serie']),
                lect_rev: buscarValor(fila, ['lect rev', 'lect_rev', 'lect-rev']),
                nl_lc: buscarValor(fila, ['nl/lc', 'nl-lc', 'nllc']),
                observacion: buscarValor(fila, ['observacion']) || '',
                orden_visita: index + 1,
            }));

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
                    <span className='block mb-1 text-sm font-medium'>Archivo .xlsx</span>
                    <input 
                        type="file"
                        accept=".xlsx"
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