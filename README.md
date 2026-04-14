# ERPJir — Sistema de Gestión de Tickets

Proyecto desarrollado como parte de la materia **Seguridad en el Desarrollo de Aplicaciones**.

Aplicación web fullstack con arquitectura de microservicios que permite gestionar tickets, grupos y usuarios con un sistema de permisos granular por rol y por grupo.

---

## Tecnologías

### Frontend

- Angular 17+ (standalone components, signals)
- PrimeNG
- TypeScript

### Backend

- Node.js
- Express (microservicio Users)
- Fastify (microservicio Tickets, Groups, API Gateway)
- JSON Schema + AJV (validación de requests)
- JWT (autenticación)

### Base de datos

- Supabase (PostgreSQL)

### Deploy

- Vercel (frontend)
- Railway (backend)

---

## Arquitectura

```text
Frontend (Vercel)
      ↓  /api/*
API Gateway (Railway :3000)
      ├── jwtValidator      → valida token JWT
      ├── permissionChecker → verifica permisos
      └── serviceProxy      → reenvía al microservicio
            ├── Users Service   (:3001)
            ├── Tickets Service (:3002)
            └── Groups Service  (:3003)
                      ↓
                Supabase (DB)
```

El frontend solo habla con el **API Gateway**. Los microservicios nunca son accesibles directamente desde el exterior.

---

## Estructura del proyecto

```text
angular-primeng-demo/
├── frontend/                  # Angular app
│   └── src/app/
│       ├── interceptors/      # authInterceptor (agrega JWT + x-group-id)
│       ├── guards/            # authGuard, permissionGuard
│       ├── services/          # tickets, groups, users, auth, permissions
│       ├── pages/             # dashboard, kanban, admin, profile
│       └── directives/        # hasPermission, hasGroupPermission
│
└── backend/
    ├── apigateway/            # Punto de entrada único (Fastify, :3000)
    │   └── src/
    │       ├── middleware/    # jwt-validator, permission-checker, rate-limiter
    │       ├── proxy/         # service-proxy (reenvía al microservicio)
    │       └── config/        # routes-map (conecta prefijos con microservicios)
    ├── users/                 # Autenticación y usuarios (Express, :3001)
    ├── tickets/               # Gestión de tickets (Fastify, :3002)
    └── groups/                # Grupos y permisos (Fastify, :3003)
```

---

## Sistema de permisos

Hay dos niveles de permisos:

**Permisos globales** — asignados directamente al usuario:

```text
permissions:manage  →  superadmin
users:manage        →  gestión de usuarios
groups:manage       →  gestión de grupos
```

**Permisos de grupo** — asignados al usuario dentro de un grupo específico:

```text
ticket:view        →  ver solo sus tickets
tickets:view       →  ver todos los tickets del grupo
ticket:add         →  crear tickets
ticket:edit        →  editar tickets
ticket:edit:state  →  cambiar estado
```

---

## Interceptores

### Frontend

El `authInterceptor` agrega automáticamente en cada request:

```text
Authorization: Bearer <token>   ← del cookie
x-group-id: <uuid>              ← del sessionStorage
```

### Backend (API Gateway)

Los middlewares interceptan cada request antes de llegar al microservicio:

1. `jwtValidator` — verifica el JWT y carga permisos frescos
2. `permissionChecker` — bloquea si no tiene el permiso requerido

---

## JSON Schema

La validación del body se hace con **JSON Schema + AJV** en cada microservicio:

- Schemas definidos en `src/schemas/*.schema.js`
- En **Express** (Users): middleware manual `validate(schema)`
- En **Fastify** (Tickets, Groups): `{ schema: { body: schema } }` nativo

Si el body no cumple el schema responde `400` automáticamente sin ejecutar el handler.

---

## Esquema de respuesta universal

Todos los microservicios responden con el mismo formato:

```json
{
  "statusCode": 200,
  "intOpCode": "SxTS200",
  "data": []
}
```

| Prefijo | Microservicio |
|---------|---------------|
| `SxGW`  | API Gateway   |
| `SxUS`  | Users         |
| `SxTS`  | Tickets       |
| `SxGS`  | Groups        |
| `SxCS`  | Comments      |

---

## URLs desplegadas

- **Frontend:** [angular-primeng-demo...vercel.app](https://angular-primeng-demo-git-main-2023371019s-projects.vercel.app)
- **API Gateway:** [api-gateway...railway.app](https://api-gateway-production-7cd8.up.railway.app)
- **Users Service:** [users...railway.app](https://users-production-7c6e.up.railway.app)
- **Groups Service:** [groups...railway.app](https://groups-production.up.railway.app)
- **Tickets Service:** [tickets...railway.app](https://tickets-production-d305.up.railway.app)

---

## Ejecutar en local

Abrir una terminal por cada servicio:

```bash
# API Gateway (puerto 3000)
cd backend/apigateway && npm run dev

# Users (puerto 3001)
cd backend/users && npm run dev

# Tickets (puerto 3002)
cd backend/tickets && npm run dev

# Groups (puerto 3003)
cd backend/groups && npm run dev

# Frontend
cd frontend && npm start
```

### Health check

```bash
curl http://localhost:3000/health
```

---

## Variables de entorno

Cada microservicio necesita su propio `.env`:

```text
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
PORT=
```

Ver [users/.env.example](backend/users/.env.example) como referencia.

---

## Documentación de la API

Ver [API.md](API.md) para la referencia completa de endpoints.
