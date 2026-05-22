/**
 * eventos.js - Utilidades para leer datos de eventos de Google Calendar.
 * ----------------------------------------------------------------------
 * Centraliza el parseo para que main.js, mis-reservas.js y ui.js usen
 * el mismo criterio al identificar reservas y sus datos asociados.
 */

export function extraerDatosReservaEvento(descripcion) {
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

export function extraerEmailReservaEvento(descripcion) {
  return extraerDatosReservaEvento(descripcion).email || null;
}

export function extraerFechasReservaEvento(reserva) {
  const inicio = new Date(reserva.inicio);
  const fin = new Date(reserva.fin);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return { inicio: null, fin: null };
  }

  return { inicio, fin };
}

export function reservaPerteneceAlUsuario(reserva, emailUsuario) {
  const emailReserva = extraerEmailReservaEvento(reserva.descripcion);

  return Boolean(
    emailUsuario &&
      emailReserva &&
      emailReserva.toLowerCase() === emailUsuario.toLowerCase()
  );
}
