import { reservaPerteneceAlUsuario } from "./eventos.js";

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
  calendarioVisual: null,
  calendarioPrev: null,
  calendarioNext: null,
  calendarioMesActual: null,
  panelFormulario: null,
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
  elementos.calendarioVisual = document.getElementById("calendario-visual");
  elementos.calendarioPrev = document.getElementById("calendario-prev");
  elementos.calendarioNext = document.getElementById("calendario-next");
  elementos.calendarioMesActual = document.getElementById("calendario-mes-actual");
  elementos.panelFormulario = document.getElementById("panel-formulario");
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

  if (tipo === "error" || tipo === "aviso") {
    caja.scrollIntoView({ behavior: "smooth", block: "center" });
  }
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

/** Rellena nombre y correo con los datos devueltos por Google. */
export function rellenarDatosUsuario(perfil) {
  const inputNombre = document.getElementById("nombre");
  const inputEmail = document.getElementById("email");

  if (!perfil || !inputNombre || !inputEmail) return;

  if (!inputNombre.disabled && !inputNombre.value.trim()) {
    inputNombre.value = perfil.name || "";
  }

  if (!inputEmail.disabled && !inputEmail.value.trim()) {
    inputEmail.value = perfil.email || "";
  }
}

/** Deja el formulario vacío tras una reserva correcta */
export function limpiarFormulario() {
  elementos.formulario.reset();
}

function obtenerClaveFechaLocal(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function obtenerDiasDeCalendario(fechaReferencia) {
  const inicio = new Date(fechaReferencia);
  inicio.setHours(0, 0, 0, 0);
  const finMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);

  const primerDiaSemana = (inicio.getDay() + 6) % 7;
  const dias = Array.from({ length: primerDiaSemana }, () => null);

  for (let dia = new Date(inicio); dia <= finMes; dia.setDate(dia.getDate() + 1)) {
    dias.push(new Date(dia));
  }

  return dias;
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

    const esDelUsuario = reservaPerteneceAlUsuario(reserva, emailUsuario);

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

/** Renderiza un calendario visual con las franjas ocupadas del mes actual. */
export function renderizarCalendarioVisual(reservas, fechaReferencia = new Date()) {
  const contenedor = elementos.calendarioVisual;
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mesSeleccionado = new Date(fechaReferencia);
  mesSeleccionado.setHours(0, 0, 0, 0);

  const esMesActual =
    mesSeleccionado.getFullYear() === hoy.getFullYear() &&
    mesSeleccionado.getMonth() === hoy.getMonth();

  const inicio = esMesActual
    ? hoy
    : new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth(), 1);

  const diasCalendario = obtenerDiasDeCalendario(inicio);

  const eventosPorFecha = reservas.reduce((acumulador, reserva) => {
    const inicio = new Date(reserva.inicio);
    const clave = obtenerClaveFechaLocal(inicio);
    acumulador[clave] = acumulador[clave] || [];
    acumulador[clave].push(reserva);
    return acumulador;
  }, {});

  Object.values(eventosPorFecha).forEach((eventos) => {
    eventos.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  });

  const calendario = document.createElement("div");
  calendario.className = "calendario-visual__mes";

  const nombreMes = `${mesSeleccionado.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })}${esMesActual ? " — Desde hoy" : ""}`;

  if (elementos.calendarioMesActual) {
    elementos.calendarioMesActual.textContent = nombreMes;
  }

  const nombresSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const filaNombres = document.createElement("div");
  filaNombres.className = "calendario-visual__fila-dias";
  nombresSemana.forEach((nombre) => {
    const celdaNombre = document.createElement("div");
    celdaNombre.className = "calendario-visual__nombre-dia";
    celdaNombre.textContent = nombre;
    filaNombres.appendChild(celdaNombre);
  });
  calendario.appendChild(filaNombres);

  const grilla = document.createElement("div");
  grilla.className = "calendario-visual__grilla-mes";

  diasCalendario.forEach((dia) => {
    if (dia === null) {
      const celdaVacia = document.createElement("article");
      celdaVacia.className = "calendario-visual__dia-mes calendario-visual__dia-mes--vacío";
      grilla.appendChild(celdaVacia);
      return;
    }

    const fechaKey = obtenerClaveFechaLocal(dia);
    const eventosDelDia = eventosPorFecha[fechaKey] || [];

    const diaCelda = document.createElement("article");
    diaCelda.className = "calendario-visual__dia-mes";
    diaCelda.setAttribute(
      "aria-label",
      `${dia.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    );

    const cabeceraDia = document.createElement("header");
    cabeceraDia.className = "calendario-visual__dia-mes-cabecera";
    cabeceraDia.innerHTML = `<span class="calendario-visual__numero">${dia.getDate()}</span>`;
    diaCelda.appendChild(cabeceraDia);

    const eventosContenedor = document.createElement("div");
    eventosContenedor.className = "calendario-visual__eventos-mes";

    if (!eventosDelDia.length) {
      const vacio = document.createElement("div");
      vacio.className = "calendario-visual__dia-mes-vacio";
      vacio.textContent = "Libre";
      eventosContenedor.appendChild(vacio);
    } else {
      eventosDelDia.slice(0, 2).forEach((reserva) => {
        const inicio = new Date(reserva.inicio);
        const fin = new Date(reserva.fin);

        const evento = document.createElement("div");
        evento.className = "calendario-visual__evento-mes";
        evento.setAttribute("role", "button");
        evento.setAttribute("tabindex", "0");
        evento.setAttribute(
          "aria-label",
          `Horario ocupado de ${inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} a ${fin.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
        );

        evento.innerHTML = `
          <span class="calendario-visual__evento-hora">${inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} — ${fin.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
          <span class="calendario-visual__evento-texto">Ocupado</span>
        `;

        eventosContenedor.appendChild(evento);
      });

      if (eventosDelDia.length > 2) {
        const resto = document.createElement("div");
        resto.className = "calendario-visual__dia-mes-resumen";
        resto.textContent = `+ ${eventosDelDia.length - 2} reserva${eventosDelDia.length - 2 === 1 ? "" : "s"} más`;
        eventosContenedor.appendChild(resto);
      }
    }

    diaCelda.appendChild(eventosContenedor);
    grilla.appendChild(diaCelda);
  });

  calendario.appendChild(grilla);
  contenedor.appendChild(calendario);
}

export function limpiarCalendarioVisual() {
  if (elementos.calendarioVisual) {
    elementos.calendarioVisual.innerHTML = "";
  }
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

export function mostrarPanelEdicion(mostrar) {
  if (!elementos.panelFormulario) return;
  elementos.panelFormulario.hidden = !mostrar;
}

/** Evita que texto malicioso se interprete como HTML */
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
