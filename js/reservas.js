/**
 * reservas.js — Reglas de negocio del Centro de Usos Múltiples
 * --------------------------------------------------------------
 * Validaciones del formulario y detección de conflictos de horario.
 * Esta lógica es independiente de Google: podrías probarla sin API.
 */

/**
 * Convierte fecha (YYYY-MM-DD) + hora (HH:MM) en objeto Date de JavaScript.
 */
export function crearFechaLocal(fecha, hora) {
  // El formato "YYYY-MM-DDTHH:MM" se interpreta en hora local del navegador
  return new Date(`${fecha}T${hora}:00`);
}

/**
 * Comprueba que los campos del formulario tengan sentido.
 * Devuelve { valido: true } o { valido: false, mensaje: "..." }
 */
export function validarDatosReserva(datos) {
  const { nombre, email, fecha, horaInicio, horaFin, motivo } = datos;

  if (!nombre || !email || !fecha || !horaInicio || !horaFin || !motivo) {
    return { valido: false, mensaje: "Rellena todos los campos obligatorios." };
  }

  const inicio = crearFechaLocal(fecha, horaInicio);
  const fin = crearFechaLocal(fecha, horaFin);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return { valido: false, mensaje: "La fecha u hora no son válidas." };
  }

  if (fin <= inicio) {
    return {
      valido: false,
      mensaje: "La hora de fin debe ser posterior a la hora de inicio.",
    };
  }

  const ahora = new Date();
  // Solo comparamos día si quieres permitir reservas el mismo día en curso
  if (inicio < ahora) {
    return {
      valido: false,
      mensaje: "No puedes reservar en una fecha u hora que ya ha pasado.",
    };
  }

  return { valido: true, inicio, fin };
}

/**
 * Dos intervalos se solapan si uno empieza antes de que termine el otro.
 * @param {Date} inicioA
 * @param {Date} finA
 * @param {Date} inicioB
 * @param {Date} finB
 */
export function haySolapamiento(inicioA, finA, inicioB, finB) {
  return inicioA < finB && inicioB < finA;
}

/**
 * Busca si la nueva reserva choca con alguna existente en el calendario.
 * @param {{ inicio: Date, fin: Date }} nuevaReserva
 * @param {Array<{ inicio: string, fin: string }>} eventosExistentes - fechas ISO de Google
 */
export function hayConflictoConEventos(nuevaReserva, eventosExistentes) {
  for (const evento of eventosExistentes) {
    const inicioEvento = new Date(evento.inicio);
    const finEvento = new Date(evento.fin);

    if (
      haySolapamiento(
        nuevaReserva.inicio,
        nuevaReserva.fin,
        inicioEvento,
        finEvento
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * JSON con datos del solicitante (nombre, email, motivo).
 * Google Calendar limita cada valor de extendedProperties.private a 1024 caracteres.
 */
function serializarDatosPrivados(datos) {
  const payload = {
    nombre: datos.nombre,
    email: datos.email,
    motivo: datos.motivo,
  };
  let json = JSON.stringify(payload);
  if (json.length > 1000) {
    payload.motivo = `${datos.motivo.slice(0, 800)}…`;
    json = JSON.stringify(payload);
  }
  return json;
}

/**
 * Prepara el objeto que enviaremos a Google Calendar API.
 *
 * IMPORTANTE (privacidad / RGPD): si el calendario es público, cualquiera puede ver
 * el título y la descripción del evento en Google Calendar. Por eso:
 * - summary y description incluyen el motivo de la reserva (no datos personales).
 * - Los datos personales (nombre, email) van en extendedProperties.private: solo quien tenga acceso
 *   al calendario con la API o como organizador puede leerlos desde Google.
 */
export function construirEventoGoogle(datos, inicio, fin) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    summary: "Reserva Centro de Usos Múltiples — Espacio ocupado",
    description: `Nombre: ${datos.nombre}\nCorreo: ${datos.email}\nMotivo: ${datos.motivo}`,
    start: {
      dateTime: inicio.toISOString(),
      timeZone,
    },
    end: {
      dateTime: fin.toISOString(),
      timeZone,
    },
    extendedProperties: {
      private: {
        gestioReservas_v1: serializarDatosPrivados(datos),
      },
    },
  };
}

/**
 * Rango de fechas para consultar eventos: desde hoy hasta 3 meses.
 * Google Calendar API necesita fechas en formato ISO.
 */
export function obtenerRangoConsulta() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(inicio);
  fin.setMonth(fin.getMonth() + 3);
  fin.setHours(23, 59, 59, 999);

  return {
    timeMin: inicio.toISOString(),
    timeMax: fin.toISOString(),
  };
}
