import { verificarSesion, iniciarSesion, registrarUsuario, cerrarSesion, usuarioActual } from './auth.js';
import { obtenerSeriesBD, guardarSerieBD, eliminarSerieBD } from './series.js';

// Referencias del DOM
const gridSeries = document.getElementById('grid-series');
const formSerie = document.getElementById('form-serie');
const inputId = document.getElementById('serie-id');
const tituloForm = document.getElementById('titulo-form');
const btnSubmit = formSerie ? formSerie.querySelector('button[type="submit"]') : null;

// Referencias de Autenticación
const inputEmailAuth = document.getElementById('auth-email');
const inputPasswordAuth = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const seccionAuth = document.getElementById('seccion-auth'); 
const infoUsuario = document.getElementById('info-usuario'); 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos la sesión al cargar la página
    await verificarSesion(actualizarInterfazUsuario);

    // 2. Cargamos el catálogo de series
    await cargarCatalogo();

    // 3. Configuramos los eventos del formulario y botones
    configurarEventos();
});

/**
 * Actualiza la interfaz según si el usuario está logueado o no
 */
function actualizarInterfazUsuario(user) {
    if (user) {
        console.log("Usuario conectado:", user.email);
        if (formSerie) formSerie.style.display = 'block';
        
        const formAuth = document.getElementById('form-auth');
        if (formAuth) formAuth.style.display = 'none';
    } else {
        console.log("Modo visitante (sin sesión)");
        if (formSerie) formSerie.style.display = 'none';
        
        const formAuth = document.getElementById('form-auth');
        if (formAuth) formAuth.style.display = 'block';
    }
    cargarCatalogo();
}

/**
 * Carga y renderiza el catálogo de tarjetas en el DOM
 */
async function cargarCatalogo() {
    if (!gridSeries) return;

    gridSeries.innerHTML = '<p class="subtitle">Cargando recomendaciones...</p>';

    const { data: series, error } = await obtenerSeriesBD();

    if (error) {
        gridSeries.innerHTML = `<p class="subtitle">Error: ${error.message}</p>`;
        return;
    }

    if (!series || series.length === 0) {
        gridSeries.innerHTML = '<p class="subtitle">Todavía no hay recomendaciones publicadas.</p>';
        return;
    }

    gridSeries.innerHTML = '';

    series.forEach(serie => {
        const card = document.createElement('article');
        card.className = 'card-serie';

        const imagen = document.createElement('img');
        imagen.src = serie.imagen_url || 'https://placehold.co/300x400?text=Sin+Portada';
        imagen.alt = `Portada de ${serie.titulo}`;

        const body = document.createElement('div');
        body.className = 'card-body';

        body.innerHTML = `
            <div class="card-header-info">
                <span class="badge-genero">${serie.genero || 'General'}</span>
                <span class="score">★ ${serie.puntuacion || 0}/5</span>
            </div>
            <span class="badge-tipo">${serie.tipo || ''}</span>
            <h3 class="card-title">${serie.titulo}</h3>
            <p class="card-resena">${serie.descripcion || ''}</p>
            <small class="card-autor">Publicado por: ${serie.user_email || 'Anónimo'}</small>
        `;

        card.append(imagen, body);

        // CONDICIÓN CLAVE (Puntos 5 y 6 del TP):
        // Solo mostramos los botones de Editar y Eliminar si el usuario logueado es el dueño
        const esElDueño = usuarioActual && serie.user_email === usuarioActual.email;

        if (esElDueño) {
            const acciones = document.createElement('div');
            acciones.className = 'card-actions';

            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-action btn-edit';
            btnEditar.textContent = '✏️ Editar';
            btnEditar.addEventListener('click', () => prepararEdicion(serie));

            const btnEliminar = document.createElement('button');
            btnEliminar.className = 'btn-action btn-delete';
            btnEliminar.textContent = '🗑️ Eliminar';
            btnEliminar.addEventListener('click', () => manejarEliminacion(serie.id));

            acciones.append(btnEditar, btnEliminar);
            card.append(acciones);
        }

        gridSeries.appendChild(card);
    });
}

/**
 * Configura los event listeners del formulario y autenticación
 */
function configurarEventos() {
    // 1. Envío del formulario de series
    if (formSerie) {
        formSerie.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!usuarioActual) {
                alert("Debes iniciar sesión para publicar o editar.");
                return;
            }

            try {
                const idEdicion = inputId.value;
                const titulo = document.getElementById('titulo').value.trim();
                const tipo = document.getElementById('tipo').value;
                const genero = document.getElementById('genero').value;
                const puntuacion = Number(document.getElementById('puntuacion').value);
                const resena = document.getElementById('resena').value.trim();

                const datos = {
                    titulo,
                    tipo,
                    genero,
                    descripcion: resena,
                    puntuacion
                };

                const { error } = await guardarSerieBD(datos, idEdicion);

                if (error) throw error;

                alert(idEdicion ? "¡Actualizado con éxito!" : "¡Publicado con éxito!");
                formSerie.reset();
                if (inputId) inputId.value = '';
                if (tituloForm) tituloForm.textContent = 'Recomendá una película o serie';
                if (btnSubmit) btnSubmit.textContent = 'Publicar recomendación →';

                await cargarCatalogo();

            } catch (err) {
                alert("Error al guardar: " + err.message);
            }
        });
    }

    // 2. Eventos de Autenticación (CORREGIDO: Fuera del submit del formulario)
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = inputEmailAuth.value.trim();
            const password = inputPasswordAuth.value.trim();

            if (!email || !password) {
                alert("Por favor, completa el correo y la contraseña.");
                return;
            }

            const { data, error } = await iniciarSesion(email, password);
            if (error) {
                alert("Error al iniciar sesión: " + error.message);
            } else {
                alert("¡Inicio de sesión exitoso!");
                inputEmailAuth.value = '';
                inputPasswordAuth.value = '';
                // Recargamos o actualizamos la interfaz
                await verificarSesion(actualizarInterfazUsuario);
            }
        });
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            const email = inputEmailAuth.value.trim();
            const password = inputPasswordAuth.value.trim();

            if (!email || !password) {
                alert("Por favor, completa el correo y la contraseña para registrarte.");
                return;
            }

            const { data, error } = await registrarUsuario(email, password);
            if (error) {
                alert("Error al registrarse: " + error.message);
            } else {
                alert("¡Registro exitoso! Ya puedes iniciar sesión.");
            }
        });
    }
}

async function manejarEliminacion(id) {
    if (!confirm("¿Estás seguro de eliminar esta recomendación?")) return;

    const { error } = await eliminarSerieBD(id);
    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        alert("Eliminado correctamente.");
        await cargarCatalogo();
    }
}

function prepararEdicion(serie) {
    inputId.value = serie.id;
    document.getElementById('titulo').value = serie.titulo;
    document.getElementById('genero').value = serie.genero;
    document.getElementById('tipo').value = serie.tipo;
    document.getElementById('puntuacion').value = serie.puntuacion;
    document.getElementById('resena').value = serie.descripcion;

    if (tituloForm) tituloForm.textContent = 'Editar Recomendación';
    if (btnSubmit) btnSubmit.textContent = 'Guardar Cambios';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}