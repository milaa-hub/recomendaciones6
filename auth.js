import { supabase } from './supabaseClient.js';

// Variable global exportada que mantiene la referencia del usuario logueado
export let usuarioActual = null;

/**
 * 1. VERIFICAR SESIÓN ACTIVA
 * Consulta a Supabase si el navegador tiene un token de usuario activo guardado.
 * @param {Function} alCambiarEstado - Función callback que actualiza la interfaz
 */
export async function verificarSesion(alCambiarEstado) {
  // getSession() revisa el almacenamiento local (localStorage) buscando una sesión abierta
  const { data: { session } } = await supabase.auth.getSession();
  
  // Si existe una sesión activa, guardamos los datos del usuario; si no, queda en null
  usuarioActual = session ? session.user : null;
  
  // Ejecutamos la función de actualización enviando el usuario actual
  alCambiarEstado(usuarioActual);
}

/**
 * 2. REGISTRO DE USUARIO NUEVO
 * Crea una cuenta nueva con email y contraseña en el sistema de autenticación de Supabase.
 */
export async function registrarUsuario(email, password) {
  // signUp() le pide a Supabase registrar el usuario
  return await supabase.auth.signUp({ 
    email: email, 
    password: password 
  });
}

/**
 * 3. INICIO DE SESIÓN (LOGIN)
 * Valida las credenciales del usuario en la base de datos.
 */
export async function iniciarSesion(email, password) {
  // signInWithPassword() verifica email y contraseña
  const respuesta = await supabase.auth.signInWithPassword({ 
    email: email, 
    password: password 
  });
  
  // Si las credenciales son correctas (sin error), actualizamos nuestro usuarioActual
  if (!respuesta.error) {
    usuarioActual = respuesta.data.user;
  }
  return respuesta;
}

/**
 * 4. CIERRE DE SESIÓN (LOGOUT)
 * Cierra la sesión activa en Supabase y limpia las cookies/tokens locales.
 */
export async function cerrarSesion() {
  await supabase.auth.signOut();
  usuarioActual = null; // Reiniciamos el usuario
}