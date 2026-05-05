# PMMChat

Cliente de chat empresarial de escritorio para Grupo PMM. Aplicación multiplataforma construída con Angular 21 (frontend) + Tauri 2 (escritorio) + ASP.NET Core 8 (backend).

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Angular 21 (standalone components), TypeScript 5.9, SCSS |
| **Escritorio** | Tauri 2 (Rust) |
| **Tiempo real** | SignalR |
| **Backend** | ASP.NET Core 8, Entity Framework, JWT, Serilog |
| **Base de datos** | MySQL/PostgreSQL (configurable) |
| **Cache** | Redis (opcional) |

## Estructura del Proyecto

```
PMMChat-angular/
├── src/app/
│   ├── core/                    # Servicios, modelos, guards, interceptores
│   │   ├── services/             # Auth, Chat, Message, SignalR, File, Presence, etc.
│   │   ├── models/               # User, Message, Room, Presence, Mention
│   │   ├── guards/               # auth.guard.ts
│   │   └── interceptors/        # jwt.interceptor.ts
│   ├── features/                # Módulos de funcionalidad
│   │   ├── auth/login/          # Login con JWT
│   │   └── chat/                # Chat principal
│   │       ├── layout/           # ChatLayout (sidebar, settings, mentions)
│   │       ├── conversation/     # Conversación (mensajes, input, header)
│   │       ├── sidebar/          # Lista de salas
│   │       ├── settings/         # Configuración de usuario
│   │       ├── people/           # Buscar usuarios
│   │       └── mentions-panel/   # Panel de menciones @usuario
│   └── shared/                  # Componentes, pipes, directivas reutilizables
│       ├── components/          # Avatar, Toast, ConfirmModal, AudioPlayer, TitleBar
│       ├── pipes/                # RelativeTime, SecureMedia, RenderContent, FileSize
│       └── directives/           # LongPress, AutoResize
├── src-tauri/                    # App de escritorio Tauri
│   ├── src/                     # Código Rust
│   ├── icons/                   # Iconos de la app
│   └── tauri.conf.json          # Configuración de Tauri
├── public/sounds/               # Sonidos de notificación
└── src/environments/            # Configuración por ambiente

PMMChat.Api/ (Backend)
├── Controllers/                 # Auth, Messages, ChatRooms, Files, Presence, etc.
├── Services/                    # Lógica de negocio
├── Repositories/                # Acceso a datos
├── Hubs/                        # SignalR Hub (ChatHub)
├── Models/
│   ├── DTOs/Requests/           # Request bodies
│   └── DTOs/Responses/         # Response bodies
├── Entities/                   # Entidades de EF Core
├── Middleware/                 # Custom middleware
├── Extensions/                  # Extensiones DI
└── Validators/                 # Validadores Fluent
```

## Características Implementadas

### Autenticación
- Login con usuario/contraseña
- JWT tokens con refresh token
- Sesión multi-pestaña (BroadcastChannel)
- Rate limiting en endpoints de auth
- Guard de ruta protegidos

### Mensajería
- Mensajes de texto con soporte markdown
- Replies (responder a mensajes)
- Edición y eliminación de mensajes
- Reacciones/emojis por mensaje
- Mensajes anclados (pinned)
- Historial con paginación (cursor-based)
- Búsqueda de mensajes (local y global)
- Indicador de "escribiendo..."

### Archivos Adjuntos
- Subida de archivos (drag & drop, clipboard, file picker)
- Preview de imágenes (lightbox)
- Audio notas (grabación directa)
- Tipos permitidos: imágenes, audio, video, PDF, Word, Excel, ZIP, TXT
- Límite: 50 MB por archivo
- Descarga directa

### Chat Directo y Grupos
- Chatos directos 1:1
- Grupos con admin/miembros
- Crear/renombrar/eliminar grupos
- Agregar/remover participantes
- Roles: Admin (1) / Miembro (2)

### Menciones (@usuario)
- Autocomplete al escribir @
- Notificaciones cuando te mencionan
- Panel de menciones no leídas
- Resaltado de menciones en mensajes

### Presencia
- Estado en línea/desconectado/ausente
- Heartbeat cada 60s
- Last seen para desconectados
- Actualización en tiempo real

### Notificaciones
- Notificaciones de escritorio (nativas)
- Sonidos de notificación
- Contador de no leídos en título
- Badge en sala del sidebar
- Configuración de sonido/notificaciones

### UI/UX
- Theming: oscuro/claro
- Diseño responsive
- Skeleton loaders
- Scroll infinito (carga older messages)
- Botón "ir al fondo" cuando hay nuevos mensajes
- Keyboard shortcuts (Escape para cerrar)
- PWA (service worker, manifest)

### Desktop (Tauri)
- Window management
- Iconos nativos
- Build para Windows/macOS/Linux

## Primeros Pasos

### Requisitos Previos

- **Node.js** 20+ 
- **npm** 10+
- **.NET SDK** 8.0+
- **Rust** (para Tauri)
- **Visual Studio 2022** o **VS Code** (recomendado)

### 1. Configurar el Backend

```bash
cd C:\Users\eduardo.rdz\source\repos\PMMChat.Api\PMMChat.Api
```

Editar `appsettings.Development.json` con las cadenas de conexión:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PMMChat;User=root;Password=tu_password;",
    "reportesConnection": "Server=...;Database=reportes;...",
    "pmmtrafConnection": "Server=...;Database=pmmtraf;...",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Key": "TuClaveSecretaMuyLargaDeAlMenos32Caracteres"
  }
}
```

Iniciar la API:

```bash
dotnet run
# O desde Visual Studio: F5 en PMMChat.Api
```

La API estará disponible en `https://localhost:7175`
- Swagger: `https://localhost:7175/swagger`
- SignalR Hub: `https://localhost:7175/hubs/chat`

### 2. Configurar el Frontend

```bash
cd C:\Codigos\PMMChat-angular
npm install
```

Editar `src/environments/environment.ts` si el backend no está en `localhost:7175`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7175/api',
  signalrUrl: 'https://localhost:7175/hubs/chat',
};
```

### 3. Ejecutar en Desarrollo

**Solo Angular (navegador):**
```bash
npm start
# Abrir http://localhost:4200
```

**Con Tauri (escritorio):**
```bash
npm run tauri dev
```

Esto inicia Angular + abre la ventana de Tauri automáticamente.

### 4. Build de Producción

**Frontend Angular:**
```bash
npm run build
# Output: dist/PMMChat-angular/
```

**App de Escritorio:**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

## Endpoints del Backend

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login con usuario/contraseña |
| POST | `/api/auth/refresh` | Refrescar JWT con refresh token |
| POST | `/api/auth/logout` | Cerrar sesión y revocar refresh token |

### Salas (ChatRooms)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/rooms` | Lista de salas del usuario |
| POST | `/api/rooms` | Crear sala (directo o grupo) |
| GET | `/api/rooms/{id}/participants` | Participantes de la sala |
| POST | `/api/rooms/{id}/participants` | Agregar participante |
| DELETE | `/api/rooms/{id}/participants/{userId}` | Remover participante |
| PATCH | `/api/rooms/{id}/name` | Renombrar grupo |
| DELETE | `/api/rooms/{id}` | Eliminar (ocultar) sala |

### Mensajes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/rooms/{id}/messages` | Obtener mensajes (paginado) |
| POST | `/api/rooms/{id}/messages` | Enviar mensaje |
| PATCH | `/api/messages/{id}` | Editar mensaje |
| DELETE | `/api/messages/{id}` | Eliminar mensaje |
| POST | `/api/rooms/{id}/messages/{msgId}/read` | Marcar como leído |
| GET | `/api/rooms/{id}/messages/search?q=...` | Buscar en sala |
| GET | `/api/messages/search?q=...` | Búsqueda global |

### Archivos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/files/{id}` | Descargar archivo |
| POST | `/api/rooms/{roomId}/messages/{msgId}/attachments` | Subir adjunto |
| GET | `/api/rooms/{id}/attachments` | Adjuntos de la sala |

### Pins
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/rooms/{roomId}/messages/{msgId}/pin` | Anclar mensaje |
| DELETE | `/api/rooms/{roomId}/messages/{msgId}/pin` | Desanclar mensaje |
| GET | `/api/rooms/{id}/pinned` | Lista de mensajes anclados |

### Presencia
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/presence` | Presencia de contactos |
| GET | `/api/presence/{userId}` | Presencia de un usuario |

### Menciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/mentions` | Menciones no leídas |
| POST | `/api/mentions/{id}/read` | Marcar mención como leída |

### Usuarios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/search?q=...` | Buscar usuarios |
| GET | `/api/users/{id}` | Obtener usuario por ID |

### SignalR (Hub)

**Conexión:** `https://localhost:7175/hubs/chat`

**Métodos del cliente:**
- `JoinRoom(roomId)` - Unirse a una sala
- `LeaveRoom(roomId)` - Salir de una sala
- `Typing(roomId, isTyping)` - Indicador de escritura

**Eventos del servidor:**
- `ReceiveMessage` - Nuevo mensaje
- `MessageEdited` - Mensaje editado
- `MessageDeleted` - Mensaje eliminado
- `UserTyping` - Usuario está escribiendo
- `UserOnline` / `UserOffline` - Presencia
- `RoomRead` - Mensaje leído
- `ReactionAdded` / `ReactionRemoved` - Reacciones
- `YouWereMentioned` - Te mencionaron
- `MessagePinned` / `MessageUnpinned` - Pins

## Scripts Disponibles

```bash
# Desarrollo
npm start                    # Iniciar Angular en dev server
npm run watch                # Build watch mode
npm run tauri dev            # Desarrollo con Tauri

# Producción
npm run build                # Build Angular
npm run tauri build          # Build app de escritorio
npm run tauri build -- --bundles nsis  # Solo installer Windows

# Testing
npm test                     # Unit tests con Vitest (ng test)
npm run test:watch           # Tests en modo watch
npm run test:coverage        # Tests con coverage
```

## Tests Unitarios

El proyecto incluye tests con Vitest para los servicios core:

- `auth.service.spec.ts` - Tests de autenticación (login, logout, refresh, sesión)
- `chat.service.spec.ts` - Tests de gestión de salas (crear, eliminar, participantes)
- `message.service.spec.ts` - Tests de mensajería (enviar, editar, eliminar, reactions)
- `theme.service.spec.ts` - Tests de theming (temas, fuentes, sonidos)

Ejecutar tests:
```bash
npm test                     # Ejecutar todos los tests
npm run test:coverage        # Con coverage HTML
```

## Configuración de Producción

### Backend (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=produccion;Database=PMMChat;..."
  },
  "Jwt": {
    "Key": "CLAVE_MUY_SEGURA_32_CHARS_MINIMO",
    "RequireHttps": true
  }
}
```

### Frontend (environment.prod.ts)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.tudominio.com/api',
  signalrUrl: 'https://api.tudominio.com/hubs/chat',
};
```

## Notas de Desarrollo

- Los archivos `.ts` y `.html` están juntos (Angular standalone, no hay `.module.ts`)
- Los modelos DTO del backend están en `PMMChat.Api/Models/DTOs/`
- Los servicios del frontend usan `signal()` de Angular para estado reactivo
- Los sonidos están en `public/sounds/` y se cargan dinámicamente
- La base de datos usa FluentMigrator o migrations de EF Core (verificar en proyecto)
- Redis es opcional; si no se configura, se usa cache en memoria

## Licencia

Propiedad de Grupo PMM. Todos los derechos reservados.