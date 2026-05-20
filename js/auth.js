/**
 * auth.js — Inicio de sesión con Google (OAuth 2.0)
 * ---------------------------------------------------
 * Usa la librería oficial cargada en index.html (Google Identity Services).
 * No guardamos contraseñas: Google devuelve un "token" temporal para la API.
 */

import { GOOGLE_CLIENT_ID } from "./config.js";

/** Permiso necesario para leer y crear eventos en Calendar */
const ALCANCE_CALENDARIO = "https://www.googleapis.com/auth/calendar.events";

let clienteToken = null;
let tokenAcceso = null;

/**
 * Espera a que el script de Google (gsi/client) esté cargado en la página.
 */
function esperarGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    let intentos = 0;
    const maxIntentos = 50;

    const intervalo = setInterval(() => {
      intentos += 1;
      if (window.google?.accounts?.oauth2) {
        clearInterval(intervalo);
        resolve();
      } else if (intentos >= maxIntentos) {
        clearInterval(intervalo);
        reject(
          new Error(
            "No se pudo cargar Google Identity Services. ¿Abres la web con Live Server (http://localhost)?"
          )
        );
      }
    }, 100);
  });
}

/**
 * Comprueba que hayas puesto un Client ID real en config.js
 */
function comprobarConfiguracion() {
  const sinConfigurar =
    !GOOGLE_CLIENT_ID ||
    GOOGLE_CLIENT_ID.includes("TU_CLIENT_ID") ||
    GOOGLE_CLIENT_ID.includes("tu-calendario");

  if (sinConfigurar) {
    throw new Error(
      "GOOGLE_CLIENT_ID no está configurado. Abre js/config.js, pega tu Client ID de Google Cloud, guarda con Ctrl+S y recarga la página (Ctrl+F5)."
    );
  }
}

/**
 * Prepara el botón de login. Debe llamarse una vez al arrancar la app.
 * @param {function(string): void} alObtenerToken - callback cuando el login tiene éxito
 */
export async function inicializarAuth(alObtenerToken) {
  await esperarGoogle();
  comprobarConfiguracion();

  clienteToken = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: ALCANCE_CALENDARIO,
    callback: (respuesta) => {
      if (respuesta.error) {
        console.error("Error OAuth:", respuesta);
        return;
      }
      tokenAcceso = respuesta.access_token;
      alObtenerToken(tokenAcceso);
    },
  });
}

/** Abre el popup de Google para iniciar sesión */
export function iniciarSesion() {
  if (!clienteToken) {
    throw new Error("Auth no inicializado. Espera a que cargue la página.");
  }
  // prompt vacío = Google decide si muestra login o renueva token
  clienteToken.requestAccessToken();
}

/** Cierra sesión y borra el token en memoria */
export function cerrarSesion() {
  if (tokenAcceso && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(tokenAcceso, () => {
      tokenAcceso = null;
    });
  } else {
    tokenAcceso = null;
  }
}

/** Devuelve el token actual o null si no hay sesión */
export function obtenerToken() {
  return tokenAcceso;
}

/** Indica si el usuario puede llamar a la API */
export function estaAutenticado() {
  return Boolean(tokenAcceso);
}

/**
 * Obtiene el email del usuario desde la API de userinfo de Google.
 * Sirve para mostrar "Conectado: nombre@email.com" en la cabecera.
 */
export async function obtenerPerfilUsuario() {
  const token = obtenerToken();
  if (!token) return null;

  const respuesta = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!respuesta.ok) return null;
  return respuesta.json();
}
