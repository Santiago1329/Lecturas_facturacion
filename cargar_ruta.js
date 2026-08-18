import 'dotenv/config';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)


async function cargarRuta(archivoPath, lectorId, nombreRuta) {
  const workbook = xlsx.readFile(archivoPath)
  const hoja = workbook.Sheets[workbook.SheetNames[0]]
  const filas = xlsx.utils.sheet_to_json(hoja)

  if (filas.length === 0) {
    console.log('Esta vacio el archivo')
    return
  }

  console.log(`Se cargaron ${filas.length} medidores en la ruta`)
  console.log('Ejemplo de la primera fila: ', filas[0])

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

  if (errorRuta) {
    console.log('Error al crear la ruta: ', errorRuta.message)
    return
  }

  console.log('Ruta creada con éxito con ID: ', ruta.id)

  const medidores = filas.map((fila, index) => ({
    ruta_id: ruta.id,
    medidor: fila.medidor,
    direccion: fila.direccion,
    valor_anterior: fila.valor_anterior,
    orden_visita: index + 1,
  }))

  const { error: errorMedidores } = await supabase
    .from('medidores')
    .insert(medidores)

  if (errorMedidores) {
    console.error('Error al insertar medidores: ', errorMedidores.message)
    return
  }

  console.log(`${medidores.length} medidores insertados con éxito en la ruta.`)
}

const [, , archivoPath, lectorId, nombreRuta] = process.argv

if (!archivoPath || !lectorId || !nombreRuta) {
  console.error('Uso: node cargar_ruta.js <ruta_prueba.xlsx> <lector_id> "<nombre_ruta>"')
  process.exit(1)
}

cargarRuta(archivoPath, lectorId, nombreRuta)