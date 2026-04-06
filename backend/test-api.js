/**
 * Script de prueba end-to-end para verificar el API Gateway + microservicios.
 * Uso: node backend/test-api.js
 * Requiere que los 4 servicios estén corriendo.
 */

const BASE = 'http://localhost:3000';
const TEST_USER = {
    username: `testuser_${Date.now()}`,
    email:    `test_${Date.now()}@example.com`,
    password: 'Test@12345!',
    nombre_completo: 'Usuario de Prueba',
    telefono: '1234567890',
    direccion: 'Calle de Prueba 123'
};

let token = null;
let passed = 0;
let failed = 0;

// ── Helpers ─────────────────────────────────────────────────────────────────
async function req(method, path, body, authToken) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
}

function check(label, condition, details = '') {
    if (condition) {
        console.log(`  ✅  ${label}`);
        passed++;
    } else {
        console.log(`  ❌  ${label}${details ? ' → ' + details : ''}`);
        failed++;
    }
}

function section(title) {
    console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

// ── Tests ────────────────────────────────────────────────────────────────────
async function testGatewayHealth() {
    section('Gateway health');
    const r = await req('GET', '/health');
    check('GET /health → 200',           r.status === 200);
    check('Responde con status ok',       r.body?.data?.[0]?.status === 'ok');
}

async function testPublicRoutes() {
    section('Rutas públicas (sin token)');

    // Register
    const reg = await req('POST', '/api/auth/register', TEST_USER);
    check('POST /api/auth/register → 201',             reg.status === 201);
    check('Esquema global: statusCode 201',             reg.body?.statusCode === 201);
    check('Esquema global: intOpCode SxAS201',          reg.body?.intOpCode === 'SxAS201');
    check('Esquema global: data es array',              Array.isArray(reg.body?.data));
    check('data[0] tiene id, username, email',
        reg.body?.data?.[0]?.id && reg.body?.data?.[0]?.username);

    // Login
    const log = await req('POST', '/api/auth/login', {
        username: TEST_USER.username,
        password: TEST_USER.password
    });
    check('POST /api/auth/login → 200',                log.status === 200);
    check('Esquema global: statusCode 200',             log.body?.statusCode === 200);
    check('Esquema global: intOpCode SxAS200',          log.body?.intOpCode === 'SxAS200');
    check('data[0] tiene token',                        !!log.body?.data?.[0]?.token);
    check('data[0].user tiene permissions (array)',     Array.isArray(log.body?.data?.[0]?.user?.permissions));

    token = log.body?.data?.[0]?.token ?? null;
    if (token) console.log('  🔑  Token obtenido y guardado para siguientes pruebas');
}

async function testAuthErrors() {
    section('Manejo de errores de auth');

    const bad = await req('POST', '/api/auth/login', { username: 'noexiste', password: 'wrong' });
    check('Login con credenciales inválidas → 401',     bad.status === 401);
    check('Tiene campo message en error',               !!bad.body?.message);
    check('data es null en error',                      bad.body?.data === null);

    const noToken = await req('GET', '/api/groups');
    check('GET /api/groups sin token → 401',            noToken.status === 401);
    check('intOpCode SxGW401',                          noToken.body?.intOpCode === 'SxGW401');
}

async function testProtectedRoutes() {
    if (!token) { console.log('\n⚠️  Sin token — saltando pruebas protegidas'); return; }
    section('Rutas protegidas (con token)');

    const groups = await req('GET', '/api/groups', null, token);
    check('GET /api/groups → 200',                     groups.status === 200);
    check('Esquema global: intOpCode SxGS200',          groups.body?.intOpCode === 'SxGS200');
    check('data es array',                              Array.isArray(groups.body?.data));

    const tickets = await req('GET', '/api/tickets', null, token);
    check('GET /api/tickets → 200',                    tickets.status === 200);
    check('Esquema global: intOpCode SxTS200',          tickets.body?.intOpCode === 'SxTS200');
    check('data es array',                              Array.isArray(tickets.body?.data));
}

async function testPermissionDenied() {
    if (!token) return;
    section('Control de permisos (403)');

    // El usuario recién registrado no tiene user:add
    const addUser = await req('POST', '/api/auth/users', {
        username: 'otro', email: 'otro@test.com', password: 'pass'
    }, token);
    check('POST /api/auth/users sin permiso user:add → 403', addUser.status === 403);
    check('intOpCode SxGW403',                              addUser.body?.intOpCode === 'SxGW403');
    check('message indica el permiso requerido',            addUser.body?.message?.includes('user:add'));

    // El usuario no tiene group:add
    const addGroup = await req('POST', '/api/groups', { name: 'test', description: 'test' }, token);
    check('POST /api/groups sin permiso group:add → 403',   addGroup.status === 403);
}

async function testInvalidToken() {
    section('Token inválido');
    const r = await req('GET', '/api/groups', null, 'token.falso.aqui');
    check('Token malformado → 401',                    r.status === 401);
    check('intOpCode SxGW401',                         r.body?.intOpCode === 'SxGW401');
}

async function testUnknownRoute() {
    section('Ruta desconocida');
    const r = await req('GET', '/api/ruta-que-no-existe');
    check('Ruta inexistente → 401 ó 404',              r.status === 401 || r.status === 404);
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function run() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     Test end-to-end — API Gateway + Microservicios  ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`  Gateway: ${BASE}`);

    try {
        await testGatewayHealth();
        await testPublicRoutes();
        await testAuthErrors();
        await testProtectedRoutes();
        await testPermissionDenied();
        await testInvalidToken();
        await testUnknownRoute();
    } catch (err) {
        console.error('\n🔴 Error de conexión:', err.message);
        console.error('   Asegúrate de que los 4 servicios están corriendo.\n');
        process.exit(1);
    }

    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  Resultado: ${passed} ✅  pasaron  |  ${failed} ❌  fallaron`);
    console.log('══════════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
}

run();
