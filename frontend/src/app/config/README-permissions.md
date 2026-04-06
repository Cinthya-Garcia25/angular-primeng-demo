# Sistema de Permisos - Guía de Administración

## 📋 Resumen de Permisos

### 👤 USUARIO NORMAL
**Permisos globales por default**:
```typescript
[
  'group:view',           // Puede ver grupos
  'ticket:view',          // Puede ver tickets
  'ticket:edit_state',    // Puede cambiar estado de tickets
  'user:view',           // Puede ver su perfil
  'user:edit'           // Puede editar su perfil
]
```

**✅ Acciones permitidas**:
- Ver solo los tickets asignados a él
- **Cambiar estado de sus tickets asignados** (tiene `ticket:edit_state`)
- Comentar en sus tickets (creados o asignados)
- Ver grupos donde está miembro
- Ver y editar su propio perfil

**❌ Acciones NO permitidas**:
- **Crear nuevos tickets** (solo admins pueden crear)
- Ver todos los tickets del grupo
- Editar campos de tickets (título, descripción, asignación)
- Eliminar tickets
- Gestionar usuarios o grupos
- Asignar permisos

---

### 👑 USUARIO ADMINISTRADOR
**Permisos globales**: Todos los permisos de la lista

```typescript
// Permisos completos del admin:
[
  // Grupos
  'group:view', 'groups:view',
  'group:edit', 'groups:edit', 
  'group:add', 'groups:add',
  'group:delete', 'groups:delete',
  
  // Usuarios  
  'user:view', 'users:view',
  'user:edit', 'users:edit',
  'users:manage',
  'user:add', 'user:delete',
  
  // Tickets
  'ticket:view', 'tickets:view',
  'ticket:edit', 'tickets:edit',
  'ticket:add', 'tickets:add', 
  'ticket:delete',
  'ticket:edit_state',
  
  // Sistema
  'permissions:manage'
]
```

**✅ Acciones permitidas**:
- Ver TODOS los tickets del grupo
- Editar cualquier ticket completo
- Eliminar tickets
- Crear tickets sin restricciones
- Gestionar usuarios y grupos
- Asignar permisos
- Ver estadísticas completas

---

## 🎯 Lógica de Filtrado Automático

### Vista de Tickets (Kanban y Tabla)
```typescript
// Si tiene permisos de gestión o edición → ve todos los tickets
if (canViewAllTickets()) {
  return allTickets;
}

// Si es usuario normal → solo sus tickets asignados
const me = currentUser.toLowerCase();
return tickets.filter(t => 
  t.asignado?.username.toLowerCase() === me
);
```

**Permisos para ver todos los tickets**:
- `ticket:edit` - Puede editar tickets
- `ticket:delete` - Puede eliminar tickets  
- `users:manage` - Puede gestionar usuarios
- `group:delete` / `groups:delete` - Puede eliminar grupos
- `permissions:manage` - Puede gestionar permisos

**Nota**: `ticket:add` NO da permiso para ver todos los tickets, solo para crear.

### Permisos en Detalle de Ticket
```typescript
// Crear ticket
canCreateTicket = hasPermission('ticket:add')

// Editar ticket completo
canEditAll = isCreator || hasPermission('ticket:edit')

// Cambiar estado  
canEditStatus = canEditAll || (isAssignee && hasPermission('ticket:edit_state'))

// Comentar
canComment = isCreator || isAssignee || hasPermission('ticket:edit')

// Eliminar
canDelete = hasPermission('ticket:delete')
```

---

## 🔧 Configuración en Base de Datos

### Para crear un usuario ADMIN:
```sql
UPDATE usuarios 
SET permissions = ARRAY[
  'group:view', 'groups:view',
  'group:edit', 'groups:edit', 
  'group:add', 'groups:add',
  'group:delete', 'groups:delete',
  'user:view', 'users:view',
  'user:edit', 'users:edit',
  'users:manage',
  'user:add', 'user:delete',
  'ticket:view', 'tickets:view',
  'ticket:edit', 'tickets:edit',
  'ticket:add', 'tickets:add', 
  'ticket:delete',
  'ticket:edit_state',
  'permissions:manage'
]
WHERE username = 'admin';
```

### Para crear un usuario NORMAL (con permisos por default):
```sql
UPDATE usuarios 
SET permissions = ARRAY[
  'group:view',
  'ticket:view',
  'ticket:edit_state',
  'user:view',
  'user:edit'
]
WHERE username = 'usuario_normal';
```

---

## 📝 Permisos por Grupo (Opcional)

Los usuarios también pueden tener permisos específicos por grupo:
```sql
-- Para dar permiso de crear tickets a un usuario normal en un grupo específico
UPDATE grupo_miembros 
SET permisos = ARRAY['ticket:add', 'ticket:edit_state']
WHERE usuario_id = 'user_id' AND grupo_id = 'group_id';

-- NOTA: Por defecto, los usuarios normales no tienen permiso para crear tickets
-- Solo los administradores pueden crear tickets globalmente
```

---

## 🚀 Implementación en Código

Los permisos se verifican automáticamente usando:
- `ADMIN_PERMISSIONS` - Array con todos los permisos de admin (16 permisos)
- `USER_PERMISSIONS` - Array con permisos por default de usuario normal (5 permisos)
- `canViewAllTickets()` - Método que verifica si es admin
- `canCreateTicket()` - Método que verifica permiso `ticket:add` (solo admins tienen)
- Filtrado automático en vistas Kanban y tabla
- Controles de UI según permisos específicos

El sistema garantiza que los usuarios normales **tengan permisos básicos por default** pero **solo vean y trabajen con sus tickets asignados**, mientras que los administradores tienen **acceso completo a todo el sistema**.
