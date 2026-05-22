import { inicializarAuth, iniciarSesion, cerrarSesion, obtenerPerfilUsuario, obtenerEmailUsuario } from "./auth.js";
import { listarEventos, crearEvento, actualizarEvento, eliminarEvento } from "./calendar-api.js";
import {
  extraerDatosReservaEvento,
  extraerFechasReservaEvento,
  reservaPerteneceAlUsuario,
} from "./eventos.js";
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
  renderizarListaReservas,
  actualizarEstadoListado,
  mostrarBotonCancelarEdicion,
  mostrarPanelEdicion,
  rellenarDatosUsuario,
  elementos,
} from "./ui.js";

let eventosActuales = [];
let perfilUsuarioActual = null;

const modoEdicion = {
  activo: false,
  eventoId: null,
  datos: null,
};

async function cargarReservasUsuario() {
  try {
    actualizarEstadoListado("Cargando tus reservas...");
    const { timeMin, timeMax } = obtenerRangoConsulta();
    eventosActuales = await listarEventos(timeMin, timeMax);
    const emailUsuario = obtenerEmailUsuario();
    const reservasUsuario = eventosActuales.filter((reserva) =>
      reservaPerteneceAlUsuario(reserva, emailUsuario)
    );

    renderizarListaReservas(
      reservasUsuario,
      emailUsuario,
      manejarEditarReserva,
      manejarCancelarReserva
    );

    mostrarPanelEdicion(false);

    const n = reservasUsuario.length;
    actualizarEstadoListado(
      n === 0
        ? "No tienes reservas en los próximos tres meses."
        : `Tienes ${n} reserva${n === 1 ? "" : "s"} en los próximos tres meses.`
    );
  } catch (error) {
    console.error(error);
    actualizarEstadoListado("No se pudieron cargar tus reservas.");
    mostrarMensaje(error.message, "error");
  }
}

async function alConectar() {
  try {
    const perfil = await obtenerPerfilUsuario();
    perfilUsuarioActual = perfil;
    const nombre = perfil?.name || perfil?.email || "Usuario";
    actualizarEstadoAuth(true, nombre);
    rellenarDatosUsuario(perfilUsuarioActual);
    ocultarMensaje();
    mostrarMensaje(
      "Acceso correcto. Ya puedes ver y gestionar tus reservas.",
      "exito"
    );
    await cargarReservasUsuario();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  }
}

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
      const datosActualizados = { ...modoEdicion.datos, motivo: datos.motivo };
      const eventoActualizado = construirEventoGoogle(
        datosActualizados,
        validacion.inicio,
        validacion.fin
      );

      await actualizarEvento(modoEdicion.eventoId, eventoActualizado);
      cancelarEdicion();
      rellenarDatosUsuario(perfilUsuarioActual);
      mostrarMensaje("Reserva actualizada correctamente.", "exito");
      await cargarReservasUsuario();
    } catch (error) {
      console.error(error);
      mostrarMensaje(error.message, "error");
    } finally {
      elementos.btnEnviar.disabled = false;
    }
    return;
  }

  if (hayConflictoConEventos(nuevaReserva, eventosActuales)) {
    mostrarMensaje(
      "Ese horario ya está reservado. Consulta tus reservas o el calendario y elige otra franja.",
      "error"
    );
    return;
  }

  try {
    elementos.btnEnviar.disabled = true;
    const eventoGoogle = construirEventoGoogle(datos, validacion.inicio, validacion.fin);
    await crearEvento(eventoGoogle);
    limpiarFormulario();
    rellenarDatosUsuario(perfilUsuarioActual);
    mostrarMensaje("Reserva confirmada.", "exito");
    await cargarReservasUsuario();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  } finally {
    elementos.btnEnviar.disabled = false;
  }
}

async function manejarEditarReserva(reserva) {
  ocultarMensaje();

  const { inicio, fin } = extraerFechasReservaEvento(reserva);
  if (!inicio || !fin) {
    mostrarMensaje("No se pudieron cargar los datos de la reserva.", "error");
    return;
  }

  const datosDescripcion = extraerDatosReservaEvento(reserva.descripcion);
  modoEdicion.activo = true;
  modoEdicion.eventoId = reserva.id;
  modoEdicion.datos = datosDescripcion;

  document.getElementById("fecha").value = inicio.toISOString().split("T")[0];
  document.getElementById("hora-inicio").value = inicio.toTimeString().slice(0, 5);
  document.getElementById("hora-fin").value = fin.toTimeString().slice(0, 5);
  document.getElementById("nombre").value = datosDescripcion.nombre || "";
  document.getElementById("email").value = datosDescripcion.email || "";
  document.getElementById("motivo").value = datosDescripcion.motivo || "";

  document.getElementById("nombre").disabled = true;
  document.getElementById("email").disabled = true;
  mostrarBotonCancelarEdicion(true);
  mostrarPanelEdicion(true);
  mostrarMensaje(
    "Edita la información y confirma para actualizar tu reserva. Los datos personales no se pueden cambiar.",
    "info"
  );
  document.getElementById("form-reserva").scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicion() {
  modoEdicion.activo = false;
  modoEdicion.eventoId = null;
  modoEdicion.datos = null;
  document.getElementById("nombre").disabled = false;
  document.getElementById("email").disabled = false;
  mostrarBotonCancelarEdicion(false);
  mostrarPanelEdicion(false);
  limpiarFormulario();
  ocultarMensaje();
}

async function manejarCancelarReserva(reserva) {
  if (!confirm("¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    mostrarMensaje("Cancelando reserva...", "info");
    await eliminarEvento(reserva.id);
    mostrarMensaje("Reserva cancelada correctamente.", "exito");
    await cargarReservasUsuario();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "error");
  }
}

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
    perfilUsuarioActual = null;
    actualizarEstadoAuth(false);
    renderizarListaReservas([]);
    actualizarEstadoListado("Accede con Google para consultar tus reservas.");
    mostrarMensaje("Has cerrado la sesión correctamente.", "info");
  });

  elementos.btnCancelarEdicion.addEventListener("click", cancelarEdicion);
  elementos.formulario.addEventListener("submit", manejarEnvioFormulario);
}

async function iniciarApp() {
  inicializarElementos();
  enlazarEventos();
  actualizarEstadoAuth(false);

  const inputFecha = document.getElementById("fecha");
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;
  inputFecha.max = obtenerFechaLimiteReserva().toISOString().split("T")[0];
  mostrarPanelEdicion(false);

  try {
    await inicializarAuth(alConectar);
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, "aviso");
  }
}

document.addEventListener("DOMContentLoaded", iniciarApp);
