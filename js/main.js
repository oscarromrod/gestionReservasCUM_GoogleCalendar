/**
 * main.js — Punto de entrada de la aplicación
 * ---------------------------------------------
 * Este archivo "conecta" el resto: auth, calendario, validaciones y pantalla.
 * Cuando el navegador termina de cargar el HTML, ejecutamos iniciarApp().
 */

import { inicializarAuth, iniciarSesion, cerrarSesion, obtenerPerfilUsuario } from "./auth.js";
import { listarEventos, crearEvento } from "./calendar-api.js";
import {
  validarDatosReserva,
  hayConflictoConEventos,
  construirEventoGoogle,
  obtenerRangoConsulta,
} from "./reservas.js";
import {
  inicializarElementos,
  actualizarEstadoAuth,
  mostrarMensaje,
  ocultarMensaje,
  leerDatosFormulario,
  limpiarFormulario,
  renderizarListaReservas,
  actualizarEstadoListado,
  elementos,
} from "./ui.js";

/** Guardamos en memoria los eventos del calendario para comprobar conflictos */
let eventosActuales = [];

/**
 * Recarga la lista de reservas desde Google y la muestra en pantalla.
 */
async function cargarReservas() {
  try {
    actualizarEstadoListado("Cargando reservas...");
    const { timeMin, timeMax } = obtenerRangoConsulta();
    eventosActuales = await listarEventos(timeMin, timeMax);
    renderizarListaReservas(eventosActuales);
    const n = eventosActuales.length;
    actualizarEstadoListado(
      n === 0
        ? "No hay reservas en los próximos tres meses."
        : `${n} reserva${n === 1 ? "" : "s"} confirmada${n === 1 ? "" : "s"} en los próximos tres meses.`
    );
  } catch (error) {
    console.error(error);
    actualizarEstadoListado("No se pudieron cargar las reservas.");
    mostrarMensaje(error.message, "error");
  }
}

/**
 * Se ejecuta cuando el usuario inicia sesión correctamente.
 */
async function alConectar() {
  try {
    const perfil = await obtenerPerfilUsuario();
    const nombre = perfil?.name || perfil?.email || "Usuario";
    actualizarEstadoAuth(true, nombre);
    ocultarMensaje();
    mostrarMensaje(
      "Acceso correcto. Ya puedes consultar el calendario y confirmar tu reserva.",
      "exito"
    );
    await cargarReservas();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  }
}

/**
 * Envío del formulario: validar → comprobar conflictos → crear en Google.
 */
async function manejarEnvioFormulario(evento) {
  evento.preventDefault();
  ocultarMensaje();

  const datos = leerDatosFormulario();
  const validacion = validarDatosReserva(datos);

  if (!validacion.valido) {
    mostrarMensaje(validacion.mensaje, "aviso");
    return;
  }

  const nuevaReserva = {
    inicio: validacion.inicio,
    fin: validacion.fin,
  };

  if (hayConflictoConEventos(nuevaReserva, eventosActuales)) {
    mostrarMensaje(
      "Ese horario ya está reservado. Consulta el calendario y elige otra franja.",
      "error"
    );
    return;
  }

  try {
    elementos.btnEnviar.disabled = true;
    const eventoGoogle = construirEventoGoogle(
      datos,
      validacion.inicio,
      validacion.fin
    );

    await crearEvento(eventoGoogle);
    limpiarFormulario();
    mostrarMensaje(
      "Reserva confirmada. Recibirás la información en el calendario municipal.",
      "exito"
    );
    await cargarReservas();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  } finally {
    elementos.btnEnviar.disabled = false;
  }
}

/**
 * Configura botones y formulario.
 */
function enlazarEventos() {
  elementos.btnLogin.addEventListener("click", () => {
    try {
      iniciarSesion();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  elementos.btnLogout.addEventListener("click", () => {
    cerrarSesion();
    eventosActuales = [];
    actualizarEstadoAuth(false);
    renderizarListaReservas([]);
    actualizarEstadoListado(
      "Accede con Google para consultar las reservas confirmadas."
    );
    mostrarMensaje("Has cerrado la sesión correctamente.", "info");
  });

  elementos.formulario.addEventListener("submit", manejarEnvioFormulario);
}

/**
 * Arranque: cuando el DOM está listo.
 */
async function iniciarApp() {
  inicializarElementos();
  enlazarEventos();
  actualizarEstadoAuth(false);

  // Fecha mínima del input date = hoy
  const inputFecha = document.getElementById("fecha");
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;

  try {
    await inicializarAuth(alConectar);
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "aviso");
  }
}

// DOMContentLoaded = "el HTML ya está cargado, puedes usar getElementById"
document.addEventListener("DOMContentLoaded", iniciarApp);
