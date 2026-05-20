/**
 * auth.js — Inicio de sesión con Google (OAuth 2.0)
 * ---------------------------------------------------
 * Usa la librería oficial cargada en index.html (Google Identity Services).
 * No guardamos contraseñas: Google devuelve un "token" temporal para la API.
 */

import { GOOGLE_CLIENT_ID } from "./config.js";

/** Permisos necesarios: calendario completo y perfil de usuario */
const ALCANCE_CALENDARIO = "openid email profile https://www.googleapis.com/auth/calendar";
const STORAGE_TOKEN_KEY = "cum-google-calendar-token";
const STORAGE_TOKEN_EXPIRY_KEY = "cum-google-calendar-token-expiry";

let clienteToken = null;
let tokenAcceso = null;
let emailUsuarioActual = null;

function guardarTokenLocal(token, expiresIn) {
  if (!window?.localStorage) return;
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  const expiracion = Date.now() + expiresIn * 1000;
  localStorage.setItem(STORAGE_TOKEN_EXPIRY_KEY, expiracion.toString());
}

function cargarTokenLocal() {
  if (!window?.localStorage) return;
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const expiracion = Number(localStorage.getItem(STORAGE_TOKEN_EXPIRY_KEY));
  if (!token || Number.isNaN(expiracion) || Date.now() >= expiracion) {
    limpiarTokenLocal();
    return;
  }
  tokenAcceso = token;
}

function limpiarTokenLocal() {
  if (!window?.localStorage) return;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_TOKEN_EXPIRY_KEY);
}

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
  cargarTokenLocal();

  clienteToken = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: ALCANCE_CALENDARIO,
    callback: (respuesta) => {
      if (respuesta.error) {
        console.error("Error OAuth:", respuesta);
        return;
      }
      tokenAcceso = respuesta.access_token;
      if (respuesta.access_token) {
        guardarTokenLocal(respuesta.access_token, Number(respuesta.expires_in || 3600));
      }
      alObtenerToken(tokenAcceso);
    },
  });

  if (tokenAcceso) {
    alObtenerToken(tokenAcceso);
  }
}

/** Abre el popup de Google para iniciar sesión */
export function iniciarSesion() {
  if (!clienteToken) {
    throw new Error("Auth no inicializado. Espera a que cargue la página.");
  }
  // Forzamos el consentimiento para evitar que un token antiguo con scopes insuficientes siga activo.
  clienteToken.requestAccessToken({ prompt: "consent" });
}

/** Cierra sesión y borra el token en memoria */
export function cerrarSesion() {
  if (tokenAcceso && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(tokenAcceso, () => {
      tokenAcceso = null;
      emailUsuarioActual = null;
      limpiarTokenLocal();
    });
  } else {
    tokenAcceso = null;
    emailUsuarioActual = null;
    limpiarTokenLocal();
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
  console.log("🔑 obtenerPerfilUsuario - Token:", token ? "✅ Existe" : "❌ No existe");
  if (!token) return null;

  const respuesta = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!respuesta.ok) {
    console.log("❌ Error al obtener perfil:", respuesta.status);
    return null;
  }
  
  const perfil = await respuesta.json();
  // Guardamos el email para identificar reservas del usuario
  emailUsuarioActual = perfil.email;
  console.log("💾 Email guardado en auth.js:", emailUsuarioActual);
  return perfil;
}

/** Devuelve el email del usuario actualmente autenticado */
export function obtenerEmailUsuario() {
  return emailUsuarioActual;
}
