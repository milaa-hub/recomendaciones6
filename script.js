const formulario = document.getElementById('form-serie');

const selectorImagen = document.getElementById('imagen-file');
const vistaPrevia = document.getElementById('vista-previa');
const contenedorVistaPrevia = document.getElementById(
    'vista-previa-container'
);

const mensaje = document.getElementById('mensaje-formulario');
const botonEnviar = formulario.querySelector(
    'button[type="submit"]'
);

let urlVistaPrevia = null;

// ========================================
// VISTA PREVIA ORIGINAL DE LA IMAGEN
// ========================================

selectorImagen.addEventListener('change', function () {
    const archivo = this.files[0];

    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;
    }

    if (!archivo) {
        vistaPrevia.removeAttribute('src');
        contenedorVistaPrevia.hidden = true;
        return;
    }

    if (!archivo.type.startsWith('image/')) {
        alert('Seleccioná un archivo de imagen válido.');

        this.value = '';
        vistaPrevia.removeAttribute('src');
        contenedorVistaPrevia.hidden = true;
        return;
    }

    urlVistaPrevia = URL.createObjectURL(archivo);
    vistaPrevia.src = urlVistaPrevia;
    contenedorVistaPrevia.hidden = false;
});

// ========================================
// MENSAJES DEL FORMULARIO
// ========================================

function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.style.color = esError ? '#dc2626' : '#15803d';
}

// ========================================
// CAPTURAR Y GUARDAR / EDITAR LA RECOMENDACIÓN
// ========================================

formulario.addEventListener('submit', async function (e) {
    e.preventDefault();

    botonEnviar.disabled = true;
    mensaje.hidden = true;

    let imagenSubida = false;
    let nombreArchivo = null;

    try {
        const idEdicion = document.getElementById('serie-id').value; // Obtenemos el ID oculto
        const titulo = document.getElementById('titulo').value.trim();
        const tipo = document.getElementById('tipo').value;
        const genero = document.getElementById('genero').value;

        const puntuacion = Number(
            document.getElementById('puntuacion').value
        );

        const resena = document.getElementById('resena').value.trim();

        const recomendacionGeneral =
            document.getElementById('recomendacion-general').checked;

        const archivo = selectorImagen.files[0];

        // Comprobar los campos obligatorios
        if (!titulo || !tipo || !genero || !resena) {
            throw new Error('Completá todos los campos obligatorios.');
        }

        if (!Number.isInteger(puntuacion) ||
            puntuacion < 1 || puntuacion > 5) {
            throw new Error('La puntuación debe estar entre 1 y 5.');
        }

        // ========================================
        // SUBIR LA IMAGEN A SUPABASE STORAGE (SI APLICA)
        // ========================================

        let imagenUrl = null;

        if (archivo) {
            if (!archivo.type.startsWith('image/')) {
                throw new Error('Seleccioná una imagen válida.');
            }

            if (archivo.size > 5 * 1024 * 1024) {
                throw new Error('La imagen no puede superar los 5 MB.');
            }

            const extension = archivo.name.split('.').pop();

            nombreArchivo =
                `${Date.now()}_${crypto.randomUUID()}.${extension}`;

            const { error: errorImagen } = await window.supabase
                .storage
                .from('portadas')
                .upload(nombreArchivo, archivo, {
                    contentType: archivo.type,
                    upsert: false
                });

            if (errorImagen) {
                throw new Error(
                    'Error al subir la imagen: ' + errorImagen.message
                );
            }

            imagenSubida = true;

            const { data: urlData } = window.supabase
                .storage
                .from('portadas')
                .getPublicUrl(nombreArchivo);

            imagenUrl = urlData.publicUrl;
        }

        // ========================================
        // ARMAR EL OBJETO PARA LA TABLA
        // ========================================

        let descripcion = `Reseña: ${resena}`;

        descripcion += recomendacionGeneral
            ? '\nLa recomendaría a cualquier persona: Sí'
            : '\nLa recomendaría a cualquier persona: No';

        const datosRecomendacion = {
            titulo: titulo,
            tipo: tipo,
            genero: genero,
            descripcion: descripcion,
            puntuacion: puntuacion
        };

        // Solo actualizamos la URL de la imagen si el usuario subió una nueva
        if (imagenUrl) {
            datosRecomendacion.imagen_url = imagenUrl;
        }

        // ========================================
        // INSERTAR O ACTUALIZAR EN SUPABASE
        // ========================================

        let errorSupabase = null;

        if (idEdicion) {
            // MODO EDICIÓN (UPDATE)
            const { error } = await window.supabase
                .from('recomendaciones')
                .update(datosRecomendacion)
                .eq('id', idEdicion);
            
            errorSupabase = error;
        } else {
            // MODO CREACIÓN (INSERT)
            const { error } = await window.supabase
                .from('recomendaciones')
                .insert([datosRecomendacion]);
            
            errorSupabase = error;
        }

        if (errorSupabase) {
            throw new Error(
                'Error al guardar en Supabase: ' + errorSupabase.message
            );
        }

        await cargarSeries();

        // ========================================
        // CONFIRMAR Y LIMPIAR EL FORMULARIO
        // ========================================

        const mensajeExito = idEdicion ? '¡Recomendación actualizada correctamente!' : '¡Recomendación publicada correctamente!';
        mostrarMensaje(mensajeExito);

        cancelarEdicion(); // Restaura el formulario a su estado original

    } catch (error) {
        console.error('Error al guardar:', error);

        mostrarMensaje(error.message || 'Ocurrió un error al guardar.', true);

        if (imagenSubida && nombreArchivo) {
            await window.supabase
                .storage
                .from('portadas')
                .remove([nombreArchivo]);
        }

    } finally {
        botonEnviar.disabled = false;
        // Restauramos el texto del botón según corresponda
        const idEdicion = document.getElementById('serie-id').value;
        botonEnviar.textContent = idEdicion ? 'Guardar Cambios' : 'Publicar recomendación →';
    }
});


// ========================================
// CARGAR EL CATÁLOGO DE RECOMENDACIONES
// ========================================

const formSerie = document.getElementById('form-serie');
const gridSeries = document.getElementById('grid-series');
const inputId = document.getElementById('serie-id'); 
const btnSubmit = formSerie.querySelector('button[type="submit"]');
const tituloForm = document.getElementById('titulo-form');

document.addEventListener('DOMContentLoaded', () => {
    cargarSeries();
});

async function cargarSeries() {

    if (!gridSeries) return;

    gridSeries.innerHTML =
        '<p class="subtitle">Cargando recomendaciones...</p>';

    const { data: series, error } = await supabase
        .from('recomendaciones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar recomendaciones:', error);
        gridSeries.innerHTML =
            `<p class="subtitle">Error: ${error.message}</p>`;
        return;
    }

    if (!series || series.length === 0) {
        gridSeries.innerHTML =
            '<p class="subtitle">Todavía no hay recomendaciones publicadas.</p>';
        return;
    }

    gridSeries.innerHTML = '';

    series.forEach(serie => {

        const card = document.createElement('article');
        card.className = 'card-serie';

        const imagen = document.createElement('img');
        imagen.src = serie.imagen_url ||
            'https://placehold.co/300x400?text=Sin+Portada';

        imagen.alt = `Portada de ${serie.titulo}`;

        imagen.onerror = () => {
            imagen.src = 'https://placehold.co/300x400?text=Sin+Portada';
        };

        const body = document.createElement('div');
        body.className = 'card-body';

        const info = document.createElement('div');
        info.className = 'card-header-info';

        info.innerHTML = `
            <span class="badge-genero">${serie.genero || 'General'}</span>
            <span class="score">★ ${serie.puntuacion || 0}/5</span>
        `;

        const tipo = document.createElement('span');
        tipo.className = 'badge-tipo';
        tipo.textContent = serie.tipo || '';

        const titulo = document.createElement('h3');
        titulo.className = 'card-title';
        titulo.textContent = serie.titulo;

        const descripcion = document.createElement('p');
        descripcion.className = 'card-resena';
        descripcion.textContent = serie.descripcion || '';

        body.append(info, tipo, titulo, descripcion);

        const acciones = document.createElement('div');
        acciones.className = 'card-actions';

        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn-action btn-edit';
        btnEditar.textContent = '✏️ Editar';
        btnEditar.addEventListener('click', () => prepararEdicion(serie.id));

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-action btn-delete';
        btnEliminar.textContent = '🗑️ Eliminar';
        btnEliminar.addEventListener('click', () => eliminarSerie(serie.id));

        acciones.append(btnEditar, btnEliminar);

        // CORRECCIÓN: Se adjuntan los elementos una sola vez a la card
        card.append(imagen, body, acciones);
        gridSeries.appendChild(card);

    });
}


// ==========================================
// SECCIÓN 3: ELIMINAR DATOS (DELETE)
// ==========================================
async function eliminarSerie(id) {
  const confirmacion = confirm("¿Estás seguro de que querés eliminar esta recomendación?");
  
  if (!confirmacion) return;

  try {
    const { error } = await supabase
      .from('recomendaciones')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error("Error al eliminar: " + error.message);
    }

    alert("Serie eliminada con éxito.");
    
    if (inputId.value == id) {
      cancelarEdicion();
    }

    await cargarSeries();

  } catch (err) {
    alert(err.message);
  }
}


// ==========================================
// SECCIÓN 4: PREPARAR EDICIÓN
// ==========================================
async function prepararEdicion(id) {
  try {
    const { data: serie, error } = await supabase
      .from('recomendaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    inputId.value = serie.id;
    document.getElementById('titulo').value = serie.titulo;
    document.getElementById('genero').value = serie.genero;
    document.getElementById('tipo').value = serie.tipo;
    document.getElementById('puntuacion').value = serie.puntuacion;
    
    // Extraer solo el texto limpio de la reseña si venía formateado
    let textoResena = serie.descripcion || '';
    if (textoResena.startsWith('Reseña: ')) {
        textoResena = textoResena.replace('Reseña: ', '');
        // Remover también la línea de recomendación general si existe
        textoResena = textoResena.split('\nLa recomendaría')[0];
    }
    document.getElementById('resena').value = textoResena.trim();

    document.getElementById('imagen-file').required = false;

    tituloForm.textContent = 'Editar Recomendación';
    btnSubmit.textContent = 'Guardar Cambios';

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    alert("No se pudo cargar la serie para editar: " + err.message);
  }
}


// ==========================================
// SECCIÓN 6: HELPER PARA RESTAURAR EL FORMULARIO
// ==========================================
function cancelarEdicion() {
  formSerie.reset();
  inputId.value = '';
  document.getElementById('imagen-file').required = true;
  tituloForm.textContent = 'Recomendá una película o serie';
  btnSubmit.textContent = 'Publicar recomendación →';
  
  if (urlVistaPrevia) {
      URL.revokeObjectURL(urlVistaPrevia);
      urlVistaPrevia = null;
  }
  vistaPrevia.removeAttribute('src');
  contenedorVistaPrevia.hidden = true;
}
