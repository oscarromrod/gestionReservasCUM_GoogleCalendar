# Gestión de Reservas CUM - Google Calendar

Esta aplicación usa Google Calendar para gestionar reservas del Centro de Usos Múltiples.

## Configuración necesaria

Antes de abrir la aplicación en el navegador, debes crear un archivo de configuración llamado `js/config.js`.

### 1. Copia el archivo de ejemplo

En la carpeta `js/` hay un archivo llamado `config.example.js`.
Cópialo y renómbralo a:

```bash
js/config.js
```

### 2. Rellena las credenciales

Abre `js/config.js` y reemplaza los valores de ejemplo por tus credenciales reales:

```js
export const GOOGLE_CLIENT_ID = "TU_CLIENT_ID.apps.googleusercontent.com";
export const CALENDAR_ID = "id-del-calendario@group.calendar.google.com";
```

### 3. ¿Dónde encontrar el `GOOGLE_CLIENT_ID`?

1. Ve a Google Cloud Console: https://console.cloud.google.com
2. Selecciona el proyecto que usarás para esta app.
3. Navega a **APIs y servicios** > **Credenciales**.
4. Crea o usa un **ID de cliente OAuth 2.0** para una aplicación web.
5. Copia el valor de **ID de cliente** y pégalo en `GOOGLE_CLIENT_ID`.

> Nota: si no tienes una credencial OAuth, crea una nueva con tipo "Aplicación web".

### 4. ¿Dónde encontrar el `CALENDAR_ID`?

1. Abre Google Calendar: https://calendar.google.com
2. En la columna izquierda, selecciona el calendario del CUM.
3. Abre **Configuración y uso compartido** del calendario.
4. Busca la sección **Integrar calendario**.
5. Copia el valor de **ID del calendario** y pégalo en `CALENDAR_ID`.

### 5. Uso de la aplicación

- Abre `index.html` en un servidor local (por ejemplo, Live Server en VS Code).
- Inicia sesión con Google usando el botón **Acceder con Google**.
- El sistema cargará el calendario y permitirá crear reservas.

### 6. Importante

- `js/config.js` no está incluido en el repositorio y debe crearse localmente.
- `js/config.example.js` es solo una plantilla de ejemplo.
- No compartas tus credenciales públicamente.
