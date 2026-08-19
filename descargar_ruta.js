import 'dotenv/config';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function descargarRuta(rutaId) {
    const { data: ruta, error: errorRuta } = await supabase
        .from('rutas')
        .select()
        .eq('id', rutaId)
        .single()

    if (errorRuta || !ruta) {
        console.error('No se pudo encontrar la ruta:', errorRuta?.message)
        return
    }

    if (ruta.estado !== 'completa') {
        console.error(`La ruta no está completa (estado: ${ruta.estado}).`)
        return
    }

    const { data: medidores, error: errorMedidores } = await supabase
        .from('medidores')
        .select()
        .eq('ruta_id', rutaId)
        .order('orden_visita')

    if (errorMedidores) {
        console.error('No se pudieron obtener los medidores:', errorMedidores.message)
        return
    }

    const filas = medidores.map(m => ({
        medidor: m.medidor,
        direccion: m.direccion,
        valor_anterior: m.valor_anterior,
        valor_actual: m.valor_actual,
        observacion: m.observacion,
    }))

    const hoja = xlsx.utils.json_to_sheet(filas)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, hoja, 'Lecturas')

    const nombreArchivo = `${ruta.nombre.replace(/[\s-]+/g, '_')}_completa.xlsx`
    xlsx.writeFile(workbook, nombreArchivo)

    console.log(`Archivo descargado: ${nombreArchivo}`)

    await supabase.from('rutas').update({ exportada: true }).eq('id', rutaId)

    console.log('Ruta exportada')
}

const rutaId = process.argv[2]

if (!rutaId) {
    console.error('Uso: node descargar_ruta.js <rutaId>')
    process.exit(1)
}

descargarRuta(rutaId)