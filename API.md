# API Reference

Todos los endpoints pasan por el **API Gateway**.
Reemplaza `BASE_URL` con la URL pública del apigateway desplegado.

---

## URLs del proyecto

| Servicio | URL |
|----------|-----|
| Frontend | `https://angular-primeng-demo-git-main-2023371019s-projects.vercel.app` |
| API Gateway | `https://api-gateway-production-7cd8.up.railway.app` |
| Users Service | `https://users-production-7c6e.up.railway.app` |
| Groups Service | `https://groups-production.up.railway.app` |
| Tickets Service | `https://tickets-production-d305.up.railway.app` |

---

## Headers requeridos en rutas protegidas

```
Authorization: Bearer <token>
x-group-id: <uuid>        (opcional — activa permisos del grupo seleccionado)
```

---

## Health Check

| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `BASE_URL/health` | No |

**Respuesta**
```json
{
  "statusCode": 200,
  "intOpCode": "SxGW200",
  "data": [{ "status": "ok", "service": "apigateway" }]
}
```

---

## Auth

### POST `/api/auth/login`
Autenticación pública. Devuelve el token JWT.

```json
{
  "username": "string",
  "password": "string"
}
```

### POST `/api/auth/register`
Registro público de usuario.

```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "nombre_completo": "string",
  "telefono": "string",
  "direccion": "string"
}
```

### POST `/api/auth/users`
Crear usuario desde panel admin. Requiere permiso `user:add`.

```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "nombre_completo": "string",
  "permissions": ["user:view"],
  "group_ids": ["uuid"]
}
```

---

## Users

| Método | Endpoint | Auth | Permiso |
|--------|----------|------|---------|
| GET | `/api/users` | Sí | `users:view` |
| GET | `/api/users/permissions` | Sí | — |
| GET | `/api/users/:id` | Sí | `user:view` |
| PUT | `/api/users/:id` | Sí | `user:edit` |
| DELETE | `/api/users/:id` | Sí | `user:remove` |
| PATCH | `/api/users/:id/deactivate` | Sí | `user:remove` |
| PATCH | `/api/users/:id/activate` | Sí | `user:add` |
| PUT | `/api/users/:id/permissions` | Sí | `permissions:manage` |

### PUT `/api/users/:id`
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "nombre_completo": "string",
  "telefono": "string",
  "direccion": "string",
  "is_active": true
}
```

### PUT `/api/users/:id/permissions`
```json
{
  "permissions": ["user:view", "user:edit", "group:view"]
}
```

---

## Groups

| Método | Endpoint | Auth | Permiso |
|--------|----------|------|---------|
| GET | `/api/groups` | Sí | — |
| GET | `/api/groups/my-groups` | Sí | — |
| GET | `/api/groups/:id` | Sí | — |
| POST | `/api/groups` | Sí | `group:add` |
| PUT | `/api/groups/:id` | Sí | `group:edit` |
| DELETE | `/api/groups/:id` | Sí | `group:remove` |
| GET | `/api/groups/:id/members/me` | Sí | — |
| POST | `/api/groups/:id/members` | Sí | `group:edit` |
| DELETE | `/api/groups/:id/members/:userId` | Sí | `group:edit` |
| GET | `/api/groups/:id/members/:userId/permissions` | Sí | `group:edit` |
| PUT | `/api/groups/:id/members/:userId/permissions` | Sí | `group:edit` |
| GET | `/api/groups/:id/permissions` | Sí | `group:view` |
| GET | `/api/groups/:id/permissions/audit` | Sí | `permissions:manage` |

### POST `/api/groups`
```json
{
  "name": "string",
  "description": "string"
}
```

### PUT `/api/groups/:id`
```json
{
  "name": "string",
  "description": "string"
}
```

### POST `/api/groups/:id/members`
```json
{
  "userId": "uuid"
}
```

### PUT `/api/groups/:id/members/:userId/permissions`
```json
{
  "permissions": ["ticket:view", "ticket:add", "ticket:edit", "ticket:edit:state"]
}
```

---

## Permissions

| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/permissions` | Sí |

---

## Tickets

| Método | Endpoint | Auth | Permiso |
|--------|----------|------|---------|
| GET | `/api/tickets` | Sí | `ticket:view` |
| GET | `/api/tickets/:id` | Sí | `ticket:view` |
| POST | `/api/tickets` | Sí | `ticket:add` |
| PUT | `/api/tickets/:id` | Sí | `ticket:edit` |
| PATCH | `/api/tickets/:id/status` | Sí | `ticket:edit:state` |
| PATCH | `/api/tickets/:id/priority` | Sí | `ticket:edit:priority` |
| PATCH | `/api/tickets/:id/deadline` | Sí | `ticket:edit:deadline` |
| PATCH | `/api/tickets/:id/assign` | Sí | `ticket:edit:assign` |
| POST | `/api/tickets/:id/comments` | Sí | `ticket:edit` |
| DELETE | `/api/tickets/:id` | Sí | `ticket:delete` |

### GET `/api/tickets`
Query param opcional: `?grupo_id=uuid`

### POST `/api/tickets`
```json
{
  "grupo_id": "uuid",
  "titulo": "string",
  "descripcion": "string",
  "estado_codigo": "pendiente",
  "prioridad_codigo": "alta",
  "asignado_id": "uuid",
  "fecha_final": "2025-12-31T00:00:00Z"
}
```

Valores válidos para `estado_codigo`: `pendiente` `en_progreso` `revision` `hecho` `bloqueado`

Valores válidos para `prioridad_codigo`: `alta` `media` `baja`

### PUT `/api/tickets/:id`
```json
{
  "titulo": "string",
  "descripcion": "string",
  "estado_codigo": "en_progreso",
  "prioridad_codigo": "media",
  "asignado_id": "uuid",
  "fecha_final": "2025-12-31T00:00:00Z"
}
```

### PATCH `/api/tickets/:id/status`
```json
{
  "estado_codigo": "hecho"
}
```

### PATCH `/api/tickets/:id/priority`
```json
{
  "prioridad_codigo": "baja"
}
```

### PATCH `/api/tickets/:id/deadline`
```json
{
  "fecha_final": "2025-12-31T00:00:00Z"
}
```

### PATCH `/api/tickets/:id/assign`
```json
{
  "asignado_id": "uuid"
}
```

### POST `/api/tickets/:id/comments`
```json
{
  "text": "string"
}
```

---

## Permisos disponibles

### Permisos globales (se asignan al usuario)

| Permiso | Descripción |
|---------|-------------|
| `user:add` | Crear usuarios |
| `user:edit` | Editar usuarios |
| `user:remove` | Desactivar / eliminar usuarios |
| `user:view` | Ver detalle de un usuario |
| `users:view` | Ver listado de usuarios |
| `users:manage` | Gestión completa de usuarios |
| `group:add` | Crear grupos |
| `group:edit` | Editar grupos y miembros |
| `group:remove` | Eliminar grupos |
| `group:view` | Ver grupos |
| `groups:manage` | Gestión completa de grupos |
| `permissions:manage` | Gestionar permisos (superadmin) |

### Permisos de grupo (se asignan al miembro dentro del grupo)

| Permiso | Descripción |
|---------|-------------|
| `ticket:view` | Ver un ticket |
| `tickets:view` | Ver todos los tickets del grupo |
| `ticket:add` | Crear tickets |
| `ticket:edit` | Editar tickets |
| `ticket:edit:state` | Cambiar estado de tickets |
| `ticket:edit:delete` | Eliminar tickets |
| `ticket:edit:priority` | Cambiar prioridad |
| `ticket:edit:deadline` | Cambiar fecha límite |
| `ticket:edit:assign` | Asignar tickets |
