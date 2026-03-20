// Test authentication and upload endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testAuth() {
  try {
    // Test login
    console.log('Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Token:', loginData.token.substring(0, 50) + '...');
      
      return loginData.token;
    } else {
      const errorData = await loginResponse.json();
      console.error('❌ Login failed:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Auth test error:', error.message);
    return null;
  }
}

async function testUploadWithoutAuth() {
  try {
    console.log('\nTesting upload without auth (should fail)...');
    const response = await fetch(`${BASE_URL}/api/ingest/upload`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Upload test error:', error.message);
  }
}

async function testUploadWithAuth(token) {
  try {
    console.log('\nTesting upload with auth (test endpoint)...');
    const response = await fetch(`${BASE_URL}/api/ingest/upload-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Upload with auth test error:', error.message);
  }
}

async function runTests() {
  const token = await testAuth();
  await testUploadWithoutAuth();
  if (token) {
    await testUploadWithAuth(token);
  }
}

runTests();
