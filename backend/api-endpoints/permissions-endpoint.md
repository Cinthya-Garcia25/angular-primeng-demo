# Endpoint de Permisos Dinámicos

## 🎯 Objetivo
Crear un endpoint que devuelva los permisos del usuario actual desde Supabase, permitiendo que cualquier cambio en la tabla de permisos se refleje automáticamente en el frontend.

## 📋 Endpoint Requerido

### GET /api/users/permissions
Devuelve los permisos globales y por grupo del usuario autenticado.

```typescript
// Response esperado
{
  "permissions": [
    "group:view",
    "ticket:view", 
    "ticket:edit_state",
    "user:view",
    "user:edit"
  ],
  "groupPermissions": [
    "ticket:add",
    "ticket:edit_state"
  ]
}
```

## 🔧 Implementación en Backend

### 1. Crear el endpoint en el API Gateway

```javascript
// En backend/apigateway/server.js
app.get('/api/users/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado
    
    // Obtener permisos globales del usuario
    const { data: userPerms } = await supabase
      .from('usuarios')
      .select('permissions')
      .eq('id', userId)
      .single();
    
    // Obtener permisos del grupo activo
    const groupId = req.headers['x-group-id'] || req.session?.selectedGroupId;
    let groupPerms = [];
    
    if (groupId) {
      const { data: memberPerms } = await supabase
        .from('grupo_miembros')
        .select('permisos')
        .eq('usuario_id', userId)
        .eq('grupo_id', groupId)
        .single();
      
      groupPerms = memberPerms?.permisos || [];
    }
    
    res.json({
      permissions: userPerms?.permissions || [],
      groupPermissions: groupPerms
    });
    
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

### 2. Actualizar el frontend para enviar el grupo activo

```typescript
// En el servicio de tickets o groups
const httpOptions = {
  headers: {
    'x-group-id': selectedGroupId,
    'Authorization': `Bearer ${token}`
  }
};
```

## 🗄️ Estructura de Tablas en Supabase

### Tabla: usuarios
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: grupo_miembros  
```sql
CREATE TABLE grupo_miembros (
  id UUID PRIMARY KEY,
  grupo_id UUID REFERENCES grupos(id),
  usuario_id UUID REFERENCES usuarios(id),
  permisos TEXT[] DEFAULT '{}',
  rol VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(grupo_id, usuario_id)
);
```

## 🔄 Flujo de Actualización Automática

1. **Admin modifica permisos** en Supabase (directo o via admin panel)
2. **Frontend se actualiza** cada 30 segundos automáticamente
3. **UI responde inmediatamente** mostrando/ocultando funcionalidades
4. **Usuario experimenta** los cambios sin necesidad de logout

## ⚡ Optimizaciones

### Cache con ETag
```javascript
app.get('/api/users/permissions', authenticateToken, async (req, res) => {
  const cacheKey = `perms:${req.user.id}:${req.headers['x-group-id']}`;
  const cached = cache.get(cacheKey);
  
  if (cached && req.headers['if-none-match'] === cached.etag) {
    return res.status(304).end();
  }
  
  // ... lógica de permisos ...
  
  const etag = generateETag(permissions);
  cache.set(cacheKey, { data: response, etag }, 30000); // 30s
  
  res.set('ETag', etag);
  res.json(response);
});
```

### WebSocket para actualizaciones en tiempo real
```javascript
// Opcional: WebSocket para cambios instantáneos
io.on('connection', (socket) => {
  socket.on('join-user-permissions', (userId) => {
    socket.join(`user-perms:${userId}`);
  });
});

// Cuando se actualizan permisos en Supabase
supabase
  .channel('permissions_changes')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'usuarios' },
    (payload) => {
      io.to(`user-perms:${payload.new.id}`).emit('permissions-updated');
    }
  )
  .subscribe();
```

## 🧪 Pruebas del Endpoint

```bash
# Test del endpoint
curl -H "Authorization: Bearer TOKEN" \
     -H "x-group-id: GROUP_ID" \
     http://localhost:3000/api/users/permissions

# Respuesta esperada
{
  "permissions": ["group:view", "ticket:view"],
  "groupPermissions": ["ticket:add"]
}
```

## 🎯 Resultado Final

- ✅ **Permisos dinámicos**: Cualquier cambio en Supabase se refleja en el frontend
- ✅ **Actualización automática**: Cada 30 segundos o vía WebSocket
- ✅ **Sin logout necesario**: Los cambios se aplican en tiempo real
- ✅ **Cache inteligente**: Evita peticiones innecesarias
- ✅ **Separación clara**: Permisos globales vs por grupo
