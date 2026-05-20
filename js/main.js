/**
 * main.js — Punto de entrada de la aplicación
 * ---------------------------------------------
 * Este archivo "conecta" el resto: auth, calendario, validaciones y pantalla.
 * Cuando el navegador termina de cargar el HTML, ejecutamos iniciarApp().
 */

import { inicializarAuth, iniciarSesion, cerrarSesion, obtenerPerfilUsuario, obtenerEmailUsuario } from "./auth.js";
import { listarEventos, crearEvento, actualizarEvento, eliminarEvento } from "./calendar-api.js";
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
  mostrarBotonCancelarEdicion,
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
    const emailUsuario = obtenerEmailUsuario();
    console.log("🔐 Email del usuario actual:", emailUsuario);
    renderizarListaReservas(eventosActuales, emailUsuario, manejarEditarReserva, manejarCancelarReserva);
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
    console.log("🔐 alConectar() llamado");
    const perfil = await obtenerPerfilUsuario();
    console.log("👤 Perfil obtenido:", perfil);
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

  // Si estamos en modo edición, permitir cambios sin verificar conflictos con el evento actual
  if (modoEdicion.activo) {
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
  const { inicio, fin } = extraerDatosDelEvento(reserva);

  if (!inicio || !fin) {
    mostrarMensaje("No se pudieron cargar los datos de la reserva.", "error");
    return;
  }

  // Extraer datos de la descripción primero
  const datosDescripcion = extraerDatosDelDescripcion(reserva.descripcion);

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

/** Extrae nombre, email y motivo de la descripción del evento */
function extraerDatosDelDescripcion(descripcion) {
  if (!descripcion) return {};
  
  const datosNombre = descripcion.match(/Nombre:\s*([^\n]+)/);
  const datosEmail = descripcion.match(/Correo:\s*([^\n]+)/);
  const datosMotivo = descripcion.match(/Motivo:\s*([^\n]+)/);

  return {
    nombre: datosNombre ? datosNombre[1].trim() : "",
    email: datosEmail ? datosEmail[1].trim() : "",
    motivo: datosMotivo ? datosMotivo[1].trim() : "",
  };
}

/** Extrae fechas de inicio y fin del evento */
function extraerDatosDelEvento(reserva) {
  const inicio = new Date(reserva.inicio);
  const fin = new Date(reserva.fin);
  
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return { inicio: null, fin: null };
  }

  return { inicio, fin };
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

  elementos.btnCancelarEdicion.addEventListener("click", cancelarEdicion);

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
