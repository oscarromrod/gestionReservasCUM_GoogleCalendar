# MEMORIA TÉCNICA: SISTEMA DE AUTOGESTIÓN DE RESERVAS (CUM) 
**Autor:** Óscar Romera Rodríguez 

---

## 1. INTRODUCCIÓN Y JUSTIFICACIÓN DEL PROYECTO
El objetivo de este proyecto es el diseño e implementación de una aplicación web para la gestión y reserva de espacios en el Centro de Usos Múltiples (CUM). 

Ante la necesidad de una solución ágil, se ha optado por una **arquitectura Serverless (sin servidor)** basada en almacenamiento de datos e identidad en la nube. Al delegar la persistencia y la autenticación en la infraestructura de Google Cloud, el coste de mantenimiento del backend se reduce a cero, eliminando la necesidad de desplegar bases de datos relacionales o servidores dedicados (Node.js/PHP) en el entorno local.

---

## 2. ARQUITECTURA DEL SOFTWARE Y ENFOQUE DE DESARROLLO
La aplicación se ha desarrollado utilizando **JavaScript Vanilla (ES6+)** estructurado mediante **Módulos Nativos (`type="module"`)**. Este enfoque permite cumplir con los principios de alta cohesión y bajo acoplamiento exigidos en el desarrollo de software profesional.

### Organización de Módulos (Separación de Responsabilidades):
* **Capa de Negocio (`reservas.js`):** Contiene la lógica algorítmica pura. Es completamente agnóstica a la interfaz de usuario y a la red, facilitando futuras pruebas unitarias.
* **Capa de Infraestructura (`auth.js` y `calendar-api.js`):** Gestiona la comunicación asíncrona mediante el API Fetch y la capa de seguridad de identidad.
* **Capa de Presentación (`ui.js`):** Encargada exclusivamente del manejo, manipulación y renderizado de elementos del árbol DOM.
* **Controladores / Orquestadores (`main.js` y `mis-reservas.js`):** Actúan como puntos de entrada de las páginas, coordinando las tres capas anteriores basándose en los eventos del usuario.

---

## 3. CONTROL DE ACCESO E IDENTIDAD (OAUTH 2.0)
Para garantizar un acceso seguro sin necesidad de almacenar credenciales de usuario ni gestionar tablas de contraseñas, se ha implementado el flujo **OAuth 2.0 (Implicit Grant Flow)** utilizando la librería oficial *Google Identity Services*.

### Gestión del Ciclo de Vida del Token:
Cuando el usuario se autentica de forma correcta, la aplicación captura el token de acceso temporal y calcula su expiración de forma matemática para evitar peticiones denegadas:

$$Expiración = Date.now() + (expires\_in \times 1000)$$

El estado se persiste temporalmente en el objeto `localStorage` del navegador, permitiendo al usuario recargar la página sin perder la sesión, siempre y cuando no haya expirado el tiempo de vida otorgado por el servidor de autorización de Google.

---

## 4. RESOLUCIÓN DE CONFLICTOS Y REGLAS DE NEGOCIO
El núcleo de la lógica de negocio reside en el control de colisiones horarias. Para asegurar que dos usuarios no puedan reservar el mismo espacio de forma simultánea, se implementó una evaluación de solapamiento de intervalos temporales.

### Algoritmo de Solapamiento:
Dos reservas ($A$ y $B$) colisionan si el tiempo de inicio de una ocurre de forma estricta antes de la finalización de la otra:

$$Conflicto = (Inicio_A < Fin_B) \land (Inicio_B < Fin_A)$$

Esta condición lógica se evalúa de manera iterativa contra toda la colección de datos recuperada del calendario antes de autorizar cualquier petición `POST` o `PATCH` hacia el servidor.

### Privacidad por Diseño (Cumplimiento de RGPD):
Para conciliar la transparencia de un calendario público con la protección de datos personales de los solicitantes, se ha diseñado una estructura de datos híbrida:
* Las propiedades estándar `summary` y `description` guardan la información básica en texto plano estructurado (Nombre, Correo y Motivo) para la auditoría interna y el mapeo rápido por parte del administrador.
* Sin embargo, en la interfaz de cara al público general (`ui.js`), la aplicación **enmascara la información sensible**, renderizando únicamente la etiqueta estática **"Ocupado"** y los bloques horarios en el calendario visual, protegiendo la confidencialidad de los ciudadanos.

---

## 5. REACCIÓN VISUAL DINÁMICA (CÓDIGO DE INTERFAZ)
El renderizado del calendario visual mensual se realiza al vuelo mediante la manipulación dinámica del DOM con JavaScript, prescindiendo de librerías de terceros.

* **Ajuste del Calendario:** Sabiendo que los objetos `Date` de JavaScript inician la semana en Domingo (índice 0), se aplica aritmética modular para adaptar la grilla al estándar internacional europeo (donde el Lunes es el día 0):

    $$PosiciónCelda = (DíaSemanaNativo + 6) \pmod 7$$

* **Control del Estado del Formulario:** La interfaz se comporta de manera reactiva basándose en el estado de autenticación. Los campos de texto sensibles (`nombre` e `email`) se rellenan automáticamente y se bloquean dinámicamente (`disabled = true`) durante los flujos de edición de reservas propias, previniendo la manipulación deliberada o suplantación de identidad en las peticiones salientes.

---

## 6. LIMITACIONES TECNOLÓGICAS Y TRABAJO FUTURO (PLAN DE MIGRACIÓN)

### 6.1. Limitaciones del Modelo Actual (Google Calendar API)
Durante la fase de análisis y pruebas del proyecto, se ha identificado una limitación crítica en el modelo de seguridad inherente a la API v3 de Google Calendar cuando se consume exclusivamente desde el lado del cliente (*frontend*):

* **Acoplamiento de Permisos:** Para que los ciudadanos puedan realizar inserciones (`POST`) o modificaciones (`PATCH`) en el calendario municipal, es obligatorio que su cuenta autenticada disponga de permisos de edición sobre dicho recurso de Google.
* **Vulnerabilidad en la Integridad de los Datos:** Al otorgar estos permisos a nivel de Google Calendar, cualquier usuario avanzado podría saltarse la interfaz de nuestra aplicación (por ejemplo, usando herramientas como Postman o modificando el código desde la consola de desarrollo del navegador) y alterar o borrar eventos creados por otros usuarios, ya que la API de Google no ofrece un sistema nativo granular para restringir que un usuario solo edite "sus propios eventos" dentro de un mismo calendario compartido.

Si bien la aplicación actual mitiga esto en la interfaz ocultando y bloqueando controles visuales, no constituye una solución de seguridad robusta para un entorno de producción real y masivo.

### 6.2. Propuesta de Mejora: Migración a una Arquitectura BaaS (Supabase)
Para solucionar esta brecha de seguridad y escalar el proyecto a un nivel profesional, se plantea como trabajo futuro la migración del sistema de persistencia hacia una plataforma **BaaS (Backend as a Service)** como **Supabase** (u otro entorno basado en una base de datos relacional PostgreSQL con capa de autenticación integrada).

La arquitectura propuesta aportaría las siguientes mejoras estructurales:

1. **Políticas de Seguridad a Nivel de Fila (RLS - Row Level Security):** Supabase permite definir reglas directamente en la base de datos para asegurar de forma matemática que un usuario autenticado solo pueda ejecutar sentencias `UPDATE` o `DELETE` si el campo `user_id` de la fila coincide exactamente con el ID de su sesión activa.
2. **Abstracción de la Infraestructura:** Google Calendar pasaría a ser un mero reflejo visual de lectura. Las escrituras se harían en nuestra base de datos protegida y, mediante una función del servidor (*Edge Function*), se sincronizaría el calendario de forma segura utilizando una única clave administradora oculta para el público.
3. **Control Total del Historial:** Permitiría auditar de forma estricta qué usuario ha intentado reservar, detectar cancelaciones sospechosas o bloqueos de spam sin exponer las credenciales ni la API de edición del Ayuntamiento a los clientes.

---