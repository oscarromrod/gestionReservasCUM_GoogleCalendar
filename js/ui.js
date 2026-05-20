/**
 * ui.js — Todo lo relacionado con la pantalla (DOM)
 * -------------------------------------------------
 * Aquí NO llamamos a Google. Solo mostramos datos y mensajes al usuario.
 */

/** Referencias a elementos del HTML (se rellenan al iniciar) */
export const elementos = {
  mensajeGlobal: null,
  formulario: null,
  fieldsetFormulario: null,
  avisoSesion: null,
  btnLogin: null,
  btnLogout: null,
  btnEnviar: null,
  usuarioNombre: null,
  estadoListado: null,
  listaReservas: null,
};

/**
 * Guarda en memoria las referencias a los elementos del index.html.
 * Así no tenemos que escribir document.getElementById() en cada archivo.
 */
export function inicializarElementos() {
  elementos.mensajeGlobal = document.getElementById("mensaje-global");
  elementos.formulario = document.getElementById("form-reserva");
  elementos.fieldsetFormulario = document.getElementById("fieldset-formulario");
  elementos.avisoSesion = document.getElementById("aviso-sesion");
  elementos.btnLogin = document.getElementById("btn-login");
  elementos.btnLogout = document.getElementById("btn-logout");
  elementos.btnEnviar = document.getElementById("btn-enviar");
  elementos.usuarioNombre = document.getElementById("usuario-nombre");
  elementos.estadoListado = document.getElementById("estado-listado");
  elementos.listaReservas = document.getElementById("lista-reservas");
}

/**
 * Muestra un mensaje arriba del formulario.
 * @param {string} texto - Lo que verá el usuario
 * @param {"error"|"exito"|"info"|"aviso"} tipo - Estilo del mensaje
 */
export function mostrarMensaje(texto, tipo = "info") {
  const caja = elementos.mensajeGlobal;
  if (!caja) return;

  caja.textContent = texto;
  caja.className = `mensaje mensaje--${tipo}`;
  caja.hidden = false;
}

/** Oculta el mensaje global */
export function ocultarMensaje() {
  if (elementos.mensajeGlobal) {
    elementos.mensajeGlobal.hidden = true;
  }
}

/**
 * Actualiza la cabecera según si el usuario ha iniciado sesión.
 * @param {boolean} sesionActiva
 * @param {string} [nombreUsuario]
 */
export function actualizarEstadoAuth(sesionActiva, nombreUsuario = "") {
  document.body.classList.toggle("sesion-activa", sesionActiva);

  elementos.btnLogin.hidden = sesionActiva;
  elementos.btnLogout.hidden = !sesionActiva;
  elementos.btnEnviar.disabled = !sesionActiva;

  if (elementos.fieldsetFormulario) {
    elementos.fieldsetFormulario.disabled = !sesionActiva;
  }

  if (sesionActiva && nombreUsuario) {
    elementos.usuarioNombre.textContent = nombreUsuario;
    elementos.usuarioNombre.hidden = false;
  } else {
    elementos.usuarioNombre.hidden = true;
    elementos.usuarioNombre.textContent = "";
  }
}

/**
 * Lee los valores del formulario y los devuelve como objeto.
 * @returns {{ nombre: string, email: string, fecha: string, horaInicio: string, horaFin: string, motivo: string }}
 */
export function leerDatosFormulario() {
  return {
    nombre: document.getElementById("nombre").value.trim(),
    email: document.getElementById("email").value.trim(),
    fecha: document.getElementById("fecha").value,
    horaInicio: document.getElementById("hora-inicio").value,
    horaFin: document.getElementById("hora-fin").value,
    motivo: document.getElementById("motivo").value.trim(),
  };
}

/** Deja el formulario vacío tras una reserva correcta */
export function limpiarFormulario() {
  elementos.formulario.reset();
}

/**
 * Pinta la lista de reservas en pantalla.
 * @param {Array<{ titulo: string, inicio: string, fin: string, descripcion?: string }>} reservas
 */
export function renderizarListaReservas(reservas) {
  const lista = elementos.listaReservas;
  lista.innerHTML = "";

  if (!reservas.length) {
    const li = document.createElement("li");
    li.className = "lista-reservas__vacia";
    li.textContent =
      "No hay reservas confirmadas en los próximos tres meses. El horario está libre.";
    lista.appendChild(li);
    return;
  }

  reservas.forEach((reserva) => {
    const li = document.createElement("li");
    li.className = "lista-reservas__item";

    const inicio = formatearFechaHora(reserva.inicio);
    const fin = formatearFechaHora(reserva.fin);

    // Mostramos solo que la franja está ocupada sin detalles personales
    // (nombre, email, motivo están privados en Google Calendar)
    li.innerHTML = `
      <h3>Franja ocupada</h3>
      <p class="lista-reservas__horario">${inicio} — ${fin}</p>
    `;

    lista.appendChild(li);
  });
}

/** Formato legible en español para fechas ISO de Google */
function formatearFechaHora(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;

  return fecha.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Texto bajo el título del listado (cargando, error, etc.) */
export function actualizarEstadoListado(texto) {
  elementos.estadoListado.textContent = texto;
}

/** Evita que texto malicioso se interprete como HTML */
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
