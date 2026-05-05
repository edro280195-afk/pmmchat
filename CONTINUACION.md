# Prompt de continuación — PMMChat robustez empresarial

## Contexto del proyecto

Dos proyectos:
- **Angular 21** (frontend): `C:\Codigos\PMMChat-angular`
- **.NET 8 API** (backend): `C:\Users\eduardo.rdz\source\repos\PMMChat.Api\PMMChat.Api`

Stack API: Dapper + SignalR + Hangfire + FluentValidation + JWT Bearer + MySQL.  
Stack Angular: Standalone components, Signals, OnPush, @angular/cdk.  
Dos schemas MySQL: `pmmtraf` (usuarios, solo lectura) y `pmmutileria` (datos del chat).

---

## Lo que YA está implementado (no volver a tocar)

### API (.NET 8)
- Refresh token rotation completa: `AuthService`, `IAuthService`, `AuthController`, `JwtHelper`, `AuthResponse`, `RefreshTokenRequest`
- Rate limiting: política "auth" (10/min) y "api" (300/min) en `ServiceCollectionExtensions.cs`
- Serilog con rolling file (30 días) en `Program.cs`
- Health check en `/health` con respuesta JSON en `WebApplicationExtensions.cs`
- Redis backplane opcional para SignalR (configurable vía `ConnectionStrings:Redis`)
- Hangfire dashboard seguro (localhost-only en producción)
- Hangfire job diario `purge-expired-refresh-tokens` → `AuthService.PurgeExpiredRefreshTokensAsync()`
- Bug fix: tabla `MessageAttachments` en `MessageRepository.GetAttachmentsAsync()`
- Bug fix: `GetParticipantsAsync` filtra `IsDeleted = 0`
- Bug fix: `RemoveParticipantAsync` hace soft-delete en lugar de DELETE
- `UserRepository` usa `CreateConnection()` + queries con prefix `pmmtraf.`
- `DapperContext` limpio — solo `DefaultConnection`
- `appsettings.json` actualizado con: `ConnectionStrings:Redis`, `Jwt:RefreshTokenExpiryDays`, `Jwt:RequireHttps`, `Hangfire`, `Serilog`
- `appsettings.Development.json`: `Jwt:RequireHttps = false`

### Angular 21
- `MessageList` extraído como componente dumb en `conversation/components/message-list/`
  - `message-list.ts` — inputs/outputs completos, helpers: `isOwnMessage`, `isMediaOnly`, `getFirstUrl`, `getGroupedReactions`, `getRepliedMessage`, `getDateSeparator`
  - `message-list.html` — template completo movido desde `conversation.html`
  - `message-list.scss` — estilos de skeleton y spinner
- `conversation.html` usa `<app-message-list>` con todos los bindings
- `conversation.ts` importa `MessageList`; eliminados `Avatar`, `FileSizePipe`, `DatePipe`, `LinkPreviewComponent`, `RenderContentPipe`, `AudioPlayerComponent`, `LongPressDirective`, `DomSanitizer`
- `conversation.scss` tiene estilos para `&__scroll-to-bottom` y `.scroll-badge`
- Botón flotante "ir al fondo" con contador de mensajes nuevos (`showScrollToBottom`, `newMessagesCount`)
- `onScroll()` con debounce 80ms; `scrollToBottomAndRead()`
- Límite de archivos: 50 MB
- Emoji search con keywords español/inglés en `message-input.ts`
- SignalR reconnect paralelo con `Promise.allSettled` en `signalr.service.ts`
- JWT interceptor con auto-refresh transparente en `jwt.interceptor.ts`
- `auth.service.ts` con `refresh()`, `logout()` (revoca token en servidor), `storeSession()`
- `user.model.ts` con `refreshToken` y `refreshTokenExpiresAt`

**Ambos proyectos compilan sin errores** (verificado con `dotnet build` y `ng build`).

---

## Pendiente — lo que falta implementar

### 1. Ejecutar migración de base de datos (BLOQUEANTE para correr la API)
El script está en:
```
C:\Users\eduardo.rdz\source\repos\PMMChat.Api\RefreshTokens_migration.sql
```
Ejecutarlo contra la base de datos `pmmutileria`. Sin esto, el login falla con error SQL en el INSERT de RefreshTokens.

### 2. Búsqueda FULLTEXT en mensajes
**Archivo:** `C:\Users\eduardo.rdz\source\repos\PMMChat.Api\PMMChat.Api\Repositories\MessageRepository.cs`  
**Método:** `SearchAsync` — actualmente usa `LIKE '%query%'` (lento en tablas grandes).  
**Qué hacer:**
1. Crear índice en MySQL: `ALTER TABLE Messages ADD FULLTEXT INDEX idx_ft_content (Content);`
2. Cambiar la query a: `WHERE MATCH(Content) AGAINST(@Query IN BOOLEAN MODE)`
3. Agregar `+` prefix para palabras requeridas o dejar como está para búsqueda natural.

### 3. Virtual scroll con CDK
**Contexto:** `@angular/cdk@21.1.0` ya está instalado. `ScrollingModule` ya importado en `message-list.ts`.  
**Problema:** Los mensajes tienen altura variable (texto, imágenes, adjuntos, reactions), lo que impide usar `CdkVirtualScrollViewport` directamente con `itemSize` fijo.  
**Opciones a evaluar:**
- `AutoSizeVirtualScrollStrategy` del CDK (experimental) para alturas variables
- Paginación simple en lugar de virtual scroll (más sencillo y predecible)
- Mantener scroll normal pero con `content-visibility: auto` en `.message` para que el browser optimice el rendering fuera del viewport

**Archivos relevantes:**
- `C:\Codigos\PMMChat-angular\src\app\features\chat\conversation\components\message-list\message-list.html`
- `C:\Codigos\PMMChat-angular\src\app\features\chat\conversation\components\message-list\message-list.ts`
- `C:\Codigos\PMMChat-angular\src\app\features\chat\conversation\conversation.ts` — contiene `loadOlder()` y el scroll container

---

## Notas importantes al retomar

- El `DefaultConnection` en appsettings apunta a `pmmutileria`. Las queries que necesitan usuarios van con prefix `pmmtraf.TableName` (ver `UserRepository.cs` y `AuthService.cs`).
- `conversation.ts` usa `ChangeDetectionStrategy.OnPush`. Si agregas signals nuevas, asegúrate de exponer con `signal()` o `computed()`, no con propiedades planas.
- `editContent` en `conversation.ts` es un string plano (no signal) — funciona porque Angular lo reconcilia vía el event binding `(editContentChange)`.
- `MessageList` es un componente dumb (sin inyecciones de servicio excepto `LinkPreviewService`). Toda la lógica de negocio sigue en `Conversation`.
- Las warns de `NU1603` en dotnet build (AspNetCore.HealthChecks.MySql 9.0.0, Http.Resilience 9.0.0) son inofensivas — se resolvieron versiones superiores, funciona correctamente.
