/**
 * main.js — Punto de entrada de la aplicación
 * ---------------------------------------------
 * Este archivo "conecta" el resto: auth, calendario, validaciones y pantalla.
 * Cuando el navegador termina de cargar el HTML, ejecutamos iniciarApp().
 */

import { inicializarAuth, iniciarSesion, cerrarSesion, obtenerPerfilUsuario, obtenerEmailUsuario } from "./auth.js";
import { listarEventos, crearEvento, actualizarEvento, eliminarEvento } from "./calendar-api.js";
import { extraerDatosReservaEvento, extraerFechasReservaEvento } from "./eventos.js";
import {
  validarDatosReserva,
  hayConflictoConEventos,
  construirEventoGoogle,
  obtenerRangoConsulta,
  obtenerFechaLimiteReserva,
} from "./reservas.js";
import {
  inicializarElementos,
  actualizarEstadoAuth,
  mostrarMensaje,
  ocultarMensaje,
  leerDatosFormulario,
  limpiarFormulario,
  renderizarCalendarioVisual,
  limpiarCalendarioVisual,
  actualizarEstadoListado,
  mostrarBotonCancelarEdicion,
  rellenarDatosUsuario,
  elementos,
} from "./ui.js";

/** Guardamos en memoria los eventos del calendario para comprobar conflictos */
let eventosActuales = [];
let perfilUsuarioActual = null;
let mesVisible = new Date();
mesVisible.setDate(1);
mesVisible.setHours(0, 0, 0, 0);

/**
 * Recarga la lista de reservas desde Google y la muestra en pantalla.
 */
async function cargarReservas() {
  try {
    actualizarEstadoListado("Cargando reservas...");
    const { timeMin, timeMax } = obtenerRangoConsulta();
    eventosActuales = await listarEventos(timeMin, timeMax);
    const emailUsuario = obtenerEmailUsuario();
    console.log("🔐 Email del usuario actual:", emailUsuario);
    renderizarCalendarioVisual(eventosActuales, mesVisible);
    const n = eventosActuales.length;
    actualizarEstadoListado(
      n === 0
        ? "No hay reservas en los próximos tres meses."
        : `${n} reserva${n === 1 ? "" : "s"} confirmada${n === 1 ? "" : "s"} en los próximos tres meses.`
    );
    actualizarNavegacionCalendario();
    programarActualizacionDiaria();
  } catch (error) {
    console.error(error);
    actualizarEstadoListado("No se pudieron cargar las reservas.");
    mostrarMensaje(error.message, "error");
  }
}

function esMesVisibleActual() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return (
    mesVisible.getFullYear() === hoy.getFullYear() &&
    mesVisible.getMonth() === hoy.getMonth()
  );
}

function actualizarNavegacionCalendario() {
  if (!elementos.calendarioPrev || !elementos.calendarioNext) {
    return;
  }

  elementos.calendarioPrev.disabled = esMesVisibleActual();
}

function mostrarMesAnterior() {
  if (esMesVisibleActual()) {
    return;
  }

  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);
  cargarReservas();
}

function mostrarMesSiguiente() {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
  cargarReservas();
}

/**
 * Se ejecuta cuando el usuario inicia sesión correctamente.
 */
async function alConectar() {
  try {
    console.log("🔐 alConectar() llamado");
    const perfil = await obtenerPerfilUsuario();
    console.log("👤 Perfil obtenido:", perfil);
    perfilUsuarioActual = perfil;
    const nombre = perfil?.name || perfil?.email || "Usuario";
    actualizarEstadoAuth(true, nombre);
    rellenarDatosUsuario(perfilUsuarioActual);
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

  // Si estamos en modo edicion, ignoramos el evento actual y comprobamos el resto.
  if (modoEdicion.activo) {
    if (hayConflictoConEventos(nuevaReserva, eventosActuales, modoEdicion.eventoId)) {
      mostrarMensaje(
        "Ese horario ya esta reservado. Consulta el calendario y elige otra franja.",
        "error"
      );
      return;
    }

    try {
      elementos.btnEnviar.disabled = true;

      // Actualizar datos personales si cambió el motivo
      const datosActualizados = { ...modoEdicion.datos, motivo: datos.motivo };
      const eventoActualizado = construirEventoGoogle(
        datosActualizados,
        validacion.inicio,
        validacion.fin
      );

      await actualizarEvento(modoEdicion.eventoId, eventoActualizado);
      limpiarFormulario();
      mostrarMensaje("Reserva actualizada correctamente.", "exito");

      // Salir de modo edición
      modoEdicion.activo = false;
      modoEdicion.eventoId = null;
      modoEdicion.datos = null;

      // Rehabilitar campos de nombre y email
      document.getElementById("nombre").disabled = false;
      document.getElementById("email").disabled = false;

      // Ocultar botón de cancelar edición
      mostrarBotonCancelarEdicion(false);

      rellenarDatosUsuario(perfilUsuarioActual);
      await cargarReservas();
    } catch (error) {
      console.error(error);
      mostrarMensaje(error.message, "error");
    } finally {
      elementos.btnEnviar.disabled = false;
    }
    return;
  }

  // Modo normal: crear nueva reserva
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
    rellenarDatosUsuario(perfilUsuarioActual);
    mostrarMensaje(
      "Reserva confirmada.",
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
 * Maneja la edición de una reserva existente.
 */
async function manejarEditarReserva(reserva) {
  ocultarMensaje();

  // Extraer datos del evento
  const { inicio, fin } = extraerFechasReservaEvento(reserva);

  if (!inicio || !fin) {
    mostrarMensaje("No se pudieron cargar los datos de la reserva.", "error");
    return;
  }

  // Extraer datos de la descripción primero
  const datosDescripcion = extraerDatosReservaEvento(reserva.descripcion);

  // Guardar referencia al evento para actualizar después
  modoEdicion.activo = true;
  modoEdicion.eventoId = reserva.id;
  modoEdicion.datos = datosDescripcion;

  // Rellenar el formulario con los datos actuales
  document.getElementById("fecha").value = inicio.toISOString().split("T")[0];
  document.getElementById("hora-inicio").value = inicio.toTimeString().slice(0, 5);
  document.getElementById("hora-fin").value = fin.toTimeString().slice(0, 5);

  // Rellenar también nombre y email (pero deshabilitados para que no se puedan cambiar)
  document.getElementById("nombre").value = datosDescripcion.nombre || "";
  document.getElementById("email").value = datosDescripcion.email || "";
  document.getElementById("motivo").value = datosDescripcion.motivo || "";

  mostrarMensaje("Edita la información y confirma para actualizar tu reserva. (Los datos personales no se pueden cambiar)", "info");

  // Deshabilitar campos de nombre y email para que no se puedan cambiar
  document.getElementById("nombre").disabled = true;
  document.getElementById("email").disabled = true;

  // Mostrar botón de cancelar edición
  mostrarBotonCancelarEdicion(true);

  // Scroll al formulario
  document.getElementById("form-reserva").scrollIntoView({ behavior: "smooth" });
}

/**
 * Cancela el modo de edición y limpia el formulario.
 */
function cancelarEdicion() {
  modoEdicion.activo = false;
  modoEdicion.eventoId = null;
  modoEdicion.datos = null;

  // Rehabilitar campos de nombre y email
  document.getElementById("nombre").disabled = false;
  document.getElementById("email").disabled = false;

  // Ocultar botón de cancelar edición
  mostrarBotonCancelarEdicion(false);

  // Limpiar formulario
  limpiarFormulario();
  ocultarMensaje();
}

/**
 * Maneja la cancelación de una reserva.
 */
async function manejarCancelarReserva(reserva) {
  if (!confirm("¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    mostrarMensaje("Cancelando reserva...", "info");
    await eliminarEvento(reserva.id);
    mostrarMensaje("Reserva cancelada correctamente.", "exito");
    await cargarReservas();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  }
}

/** Objeto para controlar si estamos en modo edición */
const modoEdicion = {
  activo: false,
  eventoId: null,
  datos: null,
};

let temporizadorActualizacionDiaria = null;

function programarActualizacionDiaria() {
  if (temporizadorActualizacionDiaria) {
    clearTimeout(temporizadorActualizacionDiaria);
  }

  const ahora = new Date();
  const manana = new Date(ahora);
  manana.setHours(24, 0, 0, 0, 0);
  const msHastaMedianoche = manana.getTime() - ahora.getTime();

  temporizadorActualizacionDiaria = setTimeout(async () => {
    try {
      await cargarReservas();
    } catch (error) {
      console.error("Error al actualizar reservas automáticamente:", error);
    } finally {
      programarActualizacionDiaria();
    }
  }, msHastaMedianoche + 1000);
}

function cancelarActualizacionDiaria() {
  if (temporizadorActualizacionDiaria) {
    clearTimeout(temporizadorActualizacionDiaria);
    temporizadorActualizacionDiaria = null;
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
    cancelarActualizacionDiaria();
    eventosActuales = [];
    perfilUsuarioActual = null;
    actualizarEstadoAuth(false);
    limpiarCalendarioVisual();
    actualizarEstadoListado(
      "Accede con Google para consultar las reservas confirmadas."
    );
    mostrarMensaje("Has cerrado la sesión correctamente.", "info");
  });

  elementos.btnCancelarEdicion.addEventListener("click", cancelarEdicion);

  if (elementos.calendarioPrev) {
    elementos.calendarioPrev.addEventListener("click", mostrarMesAnterior);
  }

  if (elementos.calendarioNext) {
    elementos.calendarioNext.addEventListener("click", mostrarMesSiguiente);
  }

  elementos.formulario.addEventListener("submit", manejarEnvioFormulario);
}

/**
 * Arranque: cuando el DOM está listo.
 */
async function iniciarApp() {
  inicializarElementos();
  enlazarEventos();
  actualizarEstadoAuth(false);

  // Fecha mínima del input date = hoy, máxima = tres meses desde hoy
  const inputFecha = document.getElementById("fecha");
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;
  inputFecha.max = obtenerFechaLimiteReserva().toISOString().split("T")[0];

  try {
    await inicializarAuth(alConectar);
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "aviso");
  }
}

// DOMContentLoaded = "el HTML ya está cargado, puedes usar getElementById"
document.addEventListener("DOMContentLoaded", iniciarApp);
