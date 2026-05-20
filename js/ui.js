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
  btnCancelarEdicion: null,
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
  elementos.btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");
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
 * @param {Array<{ id: string, titulo: string, inicio: string, fin: string, descripcion?: string }>} reservas
 * @param {string} [emailUsuario] - Email del usuario actual para mostrar botones de editar/cancelar
 * @param {function} [onEditar] - Callback cuando se hace clic en editar
 * @param {function} [onCancelar] - Callback cuando se hace clic en cancelar
 */
export function renderizarListaReservas(reservas, emailUsuario = null, onEditar = null, onCancelar = null) {
  const lista = elementos.listaReservas;
  lista.innerHTML = "";

  console.log("📋 renderizarListaReservas - emailUsuario:", emailUsuario);

  if (!reservas.length) {
    const li = document.createElement("li");
    li.className = "lista-reservas__vacia";
    li.textContent =
      "No hay reservas confirmadas en los próximos tres meses. El horario está libre.";
    lista.appendChild(li);
    return;
  }

  reservas.forEach((reserva, idx) => {
    const li = document.createElement("li");
    li.className = "lista-reservas__item";

    const inicio = formatearFechaHora(reserva.inicio);
    const fin = formatearFechaHora(reserva.fin);

    // Extraer email de la descripción para saber si es del usuario actual
    const emailDelEvento = extraerEmailDelEvento(reserva.descripcion);
    // Comparación case-insensitive para evitar problemas con mayúsculas/minúsculas
    const esDelUsuario = emailUsuario && emailDelEvento &&
                        emailDelEvento.toLowerCase() === emailUsuario.toLowerCase();

    li.innerHTML = `
      <h3>Franja ocupada</h3>
      <p class="lista-reservas__horario">${inicio} — ${fin}</p>
    `;

    // Mostrar botones solo si es reserva del usuario actual
    if (esDelUsuario) {
      const divBotones = document.createElement("div");
      divBotones.className = "lista-reservas__acciones";

      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn btn--pequeno btn--primario";
      btnEditar.textContent = "Editar";
      btnEditar.addEventListener("click", () => {
        if (onEditar) onEditar(reserva);
      });

      const btnCancelar = document.createElement("button");
      btnCancelar.type = "button";
      btnCancelar.className = "btn btn--pequeno btn--peligro";
      btnCancelar.textContent = "Cancelar";
      btnCancelar.addEventListener("click", () => {
        if (onCancelar) onCancelar(reserva);
      });

      divBotones.appendChild(btnEditar);
      divBotones.appendChild(btnCancelar);
      li.appendChild(divBotones);
    }

    lista.appendChild(li);
  });
}

/** Extrae el email de la descripción del evento (formato: "Nombre: ...\nCorreo: email@example.com\nMotivo: ...") */
function extraerEmailDelEvento(descripcion) {
  if (!descripcion) return null;
  const match = descripcion.match(/Correo:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
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

/** Muestra u oculta el botón de cancelar edición */
export function mostrarBotonCancelarEdicion(mostrar) {
  if (elementos.btnCancelarEdicion) {
    elementos.btnCancelarEdicion.hidden = !mostrar;
  }
}

/** Evita que texto malicioso se interprete como HTML */
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
