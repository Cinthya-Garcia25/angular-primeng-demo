# Prueba del Endpoint de Permisos

## 🎯 Endpoint Creado

**Ruta**: `GET /api/users/permissions`  
**Servicio**: Users Service (puerto 3001)  
**Autenticación**: Requiere token JWT  

## 📋 Response Esperado

```json
{
  "statusCode": 200,
  "intOpCode": "SxUS200",
  "data": {
    "permissions": [
      "group:view",
      "ticket:view",
      "ticket:add",
      "user:view",
      "user:edit"
    ],
    "groupPermissions": [
      "ticket:add",
      "ticket:edit_state"
    ]
  }
}
```

## 🧪 Prueba Manual

### 1. Iniciar los servicios

```bash
# Terminal 1: API Gateway
cd backend/apigateway
npm run dev

# Terminal 2: Users Service  
cd backend/users
npm run dev
```

### 2. Probar con curl

```bash
# Obtener token (reemplazar con credenciales reales)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "tu_usuario", "password": "tu_password"}'

# Usar token para obtener permisos
curl -X GET http://localhost:3000/api/users/permissions \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "x-group-id: ID_DEL_GRUPO"
```

### 3. Probar en el frontend

1. **Iniciar el frontend**:
   ```bash
   cd frontend
   npm start
   ```

2. **Iniciar sesión** con tu usuario

3. **Abrir consola** (F12) y buscar:
   - `🔑 Permisos cargados para usuario...`
   - `🎫 canCreateTicket(): true/false`

4. **Hacer clic en el botón 🔑** (Recargar Permisos)

## 🔍 Verificación en Base de Datos

### Consulta SQL para verificar permisos:
```sql
-- Ver permisos globales del usuario
SELECT username, permisos_globales 
FROM usuarios 
WHERE username = 'tu_usuario';

-- Ver permisos por grupo
SELECT 
  u.username,
  g.nombre as grupo,
  gm.permisos
FROM usuarios u
JOIN grupo_miembros gm ON u.id = gm.usuario_id  
JOIN grupos g ON gm.grupo_id = g.id
WHERE u.username = 'tu_usuario';
```

## 🚀 Flujo Completo

1. **Usuario inicia sesión** → Frontend guarda token
2. **Frontend solicita permisos** → `GET /api/users/permissions`
3. **Backend consulta Supabase** → Obtiene `permisos_globales` + `grupo_miembros.permisos`
4. **Frontend recibe permisos** → Actualiza UI automáticamente
5. **Botón "Nuevo ticket"** → Aparece/desaparece según `ticket:add`

## 🔧 Configuración de Headers

El frontend envía:
- `Authorization: Bearer TOKEN` - Para autenticación
- `x-group-id: GROUP_ID` - Para permisos específicos del grupo

## 📝 Logs Esperados

En la consola del backend (Users Service):
```
🔑 Permisos cargados para usuario abc-123: {
  globales: ['group:view', 'ticket:view', 'ticket:add'],
  grupo: ['ticket:add', 'ticket:edit_state']
}
```

En la consola del frontend:
```
🔄 Refrescando permisos desde backend... {groupId: "uuid-grupo"}
🎫 canCreateTicket() en DynamicPermissionsService: true
🔍 Todos los permisos: ['group:view', 'ticket:view', 'ticket:add', ...]
```

## ✅ Checklist de Funcionalidad

- [ ] Endpoint responde con código 200
- [ ] Permisos globales cargan desde `usuarios.permisos_globales`
- [ ] Permisos de grupo cargan desde `grupo_miembros.permisos`
- [ ] Botón "Nuevo ticket" aparece si `ticket:add` está presente
- [ ] Botón "Nuevo ticket" NO aparece si `ticket:add` NO está presente
- [ ] Recarga manual funciona con botón 🔑
- [ ] Actualización automática cada 30 segundos funciona
