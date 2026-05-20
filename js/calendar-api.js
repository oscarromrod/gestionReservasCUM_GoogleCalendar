/**
 * calendar-api.js — Comunicación con Google Calendar API v3
 * -----------------------------------------------------------
 * Aquí hacemos peticiones HTTP (fetch) a los servidores de Google.
 * Documentación: https://developers.google.com/calendar/api/v3/reference
 */

import { CALENDAR_ID } from "./config.js";
import { obtenerToken } from "./auth.js";

const URL_BASE = "https://www.googleapis.com/calendar/v3";

function comprobarCalendarioConfigurado() {
  if (!CALENDAR_ID || CALENDAR_ID.includes("id-del-calendario")) {
    throw new Error(
      "Configura CALENDAR_ID en js/config.js con el ID de tu calendario del CUM."
    );
  }
}

/**
 * Cabeceras comunes: le decimos a Google quién somos (token OAuth).
 */
function cabecerasAutenticadas() {
  const token = obtenerToken();
  if (!token) {
    throw new Error("Debes iniciar sesión antes de usar el calendario.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Lista eventos entre dos fechas (para mostrar reservas y detectar conflictos).
 * @param {string} timeMin - ISO 8601
 * @param {string} timeMax - ISO 8601
 */
export async function listarEventos(timeMin, timeMax) {
  comprobarCalendarioConfigurado();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const url = `${URL_BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;

  const respuesta = await fetch(url, {
    headers: cabecerasAutenticadas(),
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Error al listar eventos (${respuesta.status})`
    );
  }

  const datos = await respuesta.json();
  const items = datos.items || [];

  return items.map((evento) => ({
    id: evento.id,
    titulo: evento.summary || "(Sin título)",
    // Devolvemos la descripción para extraer datos (nombre, email, motivo)
    descripcion: evento.description || "",
    inicio: evento.start?.dateTime || evento.start?.date,
    fin: evento.end?.dateTime || evento.end?.date,
  }));
}

/**
 * Crea un nuevo evento (reserva) en el calendario del CUM.
 * @param {object} evento - formato de Google Calendar API
 */
export async function crearEvento(evento) {
  comprobarCalendarioConfigurado();

  const url = `${URL_BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: cabecerasAutenticadas(),
    body: JSON.stringify(evento),
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Error al crear la reserva (${respuesta.status})`
    );
  }

  return respuesta.json();
}

/**
 * Actualiza un evento existente en el calendario del CUM.
 * @param {string} eventoId - ID del evento a actualizar
 * @param {object} evento - objeto del evento con los datos actualizados
 */
export async function actualizarEvento(eventoId, evento) {
  comprobarCalendarioConfigurado();

  const url = `${URL_BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventoId)}`;

  const respuesta = await fetch(url, {
    method: "PATCH",
    headers: cabecerasAutenticadas(),
    body: JSON.stringify(evento),
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Error al actualizar la reserva (${respuesta.status})`
    );
  }

  return respuesta.json();
}

/**
 * Elimina un evento del calendario del CUM.
 * @param {string} eventoId - ID del evento a eliminar
 */
export async function eliminarEvento(eventoId) {
  comprobarCalendarioConfigurado();

  const url = `${URL_BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventoId)}`;

  const respuesta = await fetch(url, {
    method: "DELETE",
    headers: cabecerasAutenticadas(),
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Error al eliminar la reserva (${respuesta.status})`
    );
  }
}
