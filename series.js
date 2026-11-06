import { supabase } from './supabaseClient.js';
import { usuarioActual } from './auth.js';

/**
 * Obtener todas las recomendaciones de la base de datos
 */
export async function obtenerSeriesBD() {
    return await supabase
        .from('recomendaciones')
        .select('*')
        .order('created_at', { ascending: false });
}

/**
 * Guardar o actualizar una recomendación
 */
export async function guardarSerieBD(datosRecomendacion, idEdicion = null) {
    if (!idEdicion) {
        // MODO CREACIÓN: Asignamos el email del usuario logueado actual
        if (!usuarioActual) {
            throw new Error('Debes iniciar sesión para publicar.');
        }
        datosRecomendacion.user_email = usuarioActual.email;

        return await supabase
            .from('recomendaciones')
            .insert([datosRecomendacion]);
    } else {
        // MODO EDICIÓN: Actualiza el registro existente
        return await supabase
            .from('recomendaciones')
            .update(datosRecomendacion)
            .eq('id', idEdicion);
    }
}

/**
 * Eliminar una recomendación por su ID
 */
export async function eliminarSerieBD(id) {
    return await supabase
        .from('recomendaciones')
        .delete()
        .eq('id', id);
}