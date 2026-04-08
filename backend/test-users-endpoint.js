const BASE = 'http://localhost:3000';

async function testUsers() {
  try {
    // Login primero
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.[0]?.token;
    
    if (!token) {
      console.log('No se pudo obtener token');
      console.log('Login response:', JSON.stringify(loginData, null, 2));
      return;
    }
    
    console.log('Token obtenido, probando /api/users...');
    
    // Probar /api/users
    const usersRes = await fetch(`${BASE}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    
    console.log('Status:', usersRes.status);
    console.log('Response:', JSON.stringify(usersData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUsers();
