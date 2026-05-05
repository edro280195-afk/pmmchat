# Plan de Implementación: Sincronización de Preferencias (UserSettings)

Este plan detalla los pasos para persistir las configuraciones del sistema (tema, fuente, sonidos, etc.) en la base de datos, reemplazando la dependencia exclusiva de `localStorage`.

## User Review Required

> [!IMPORTANT]
> Se requiere que el Backend exponga un endpoint de tipo **UPSERT** (Update or Insert) para las configuraciones, de modo que el Frontend no tenga que preocuparse por si el registro ya existe.

## Objetivos
1.  Persistir cambios de configuración en tiempo real en la tabla `UserSettings`.
2.  Cargar las preferencias del usuario al iniciar sesión o refrescar la aplicación.
3.  Optimizar las peticiones al servidor mediante debouncing en sliders (Intensidad de Glass).

---

## Propuestas de Cambio

### [BACKEND] Requerimientos de API
Se necesita un controlador de configuraciones con los siguientes endpoints:

1.  **GET `/api/settings/{userId}`**: Retorna el objeto completo de configuraciones.
2.  **POST `/api/settings`**: Recibe un objeto parcial o completo para guardar/actualizar.

---

### [FRONTEND] Componentes y Servicios

#### [MODIFY] [theme.service.ts](file:///c:/Codigos/PMMChat-angular/src/app/core/services/theme.service.ts)
Refactorizar para integrar la API:
-   **Carga**: En el constructor (o al detectar login), llamar al endpoint `GET`.
-   **Guardado**: Crear un método `syncWithDb()` que use un `Subject` con `debounceTime` para procesar las actualizaciones.
-   **Prioridad**: El `localStorage` se mantiene como caché inmediata para que la UI no se sienta lenta, pero la base de datos es la "fuente de verdad" final.

#### [MODIFY] [auth.service.ts](file:///c:/Codigos/PMMChat-angular/src/app/core/services/auth.service.ts)
-   Disparar la carga de configuraciones inmediatamente después de un login exitoso.

---

## Tareas Detalladas

### Fase 1: Infraestructura de Servicio
- [ ] Crear interfaz `UserSettings` en el frontend que coincida exactamente con la tabla SQL.
- [ ] Implementar `SettingsService` (o extender `ThemeService`) con llamadas `HttpClient`.

### Fase 2: Sincronización de Salida (Frontend -> DB)
- [ ] Interceptar cambios en Signals de `ThemeService`.
- [ ] Implementar lógica de `debounceTime(500)` para el campo `GlassIntensity`.
- [ ] Asegurar que `SoundEnabled` y `NotificationsEnabled` se sincronicen al hacer toggle.

### Fase 3: Sincronización de Entrada (DB -> Frontend)
- [ ] Implementar método `loadUserSettings()` que actualice todos los Signals del sistema.
- [ ] Manejar el caso de "Usuario Nuevo" (usar defaults si la API retorna 404 o vacío).

---

## Plan de Verificación

### Pruebas Manuales
1.  **Persistencia entre Navegadores**: Cambiar el tema en Chrome, cerrar sesión, abrir en Edge y verificar que el tema sea el mismo.
2.  **Rendimiento del Slider**: Mover el slider de intensidad rápidamente y verificar en la consola de red (Network) que solo se dispare una petición al soltarlo/detenerse.
3.  **Carga Inicial**: Limpiar `localStorage`, refrescar la página y verificar que el sistema recupere las preferencias de la DB.
