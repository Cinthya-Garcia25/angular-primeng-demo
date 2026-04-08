const BASE = 'http://localhost:3000';

async function createAndTestAdmin() {
  try {
    // Primero registrar un admin normal sin permisos
    console.log('Creando usuario admin base...');
    const registerRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        email: 'admin@demo.com',
        password: 'admin123',
        nombre_completo: 'Administrador del Sistema'
      })
    });
    
    const registerData = await registerRes.json();
    console.log('Register status:', registerRes.status);
    console.log('Register response:', JSON.stringify(registerData, null, 2));
    
    if (registerRes.status === 201) {
      console.log('Usuario admin creado exitosamente');
    }
    
    // Ahora intentar login
    console.log('\nIntentando login...');
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    const token = loginData.data?.[0]?.token;
    if (!token) {
      console.log('No se pudo obtener token');
      return;
    }
    
    console.log('\nToken obtenido, probando /api/users...');
    
    // Probar /api/users
    const usersRes = await fetch(`${BASE}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    
    console.log('Users endpoint status:', usersRes.status);
    console.log('Users response:', JSON.stringify(usersData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAndTestAdmin();
