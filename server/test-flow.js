const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING FLOW TEST ---');
  try {
    // 1. Register/Login
    console.log('1. Testing Registration/Login...');
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    let res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password })
    });
    let data = await res.json();
    console.log('Register Response:', data);
    
    // We might have mock auth in dev. Let's just use login
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    data = await res.json();
    console.log('Login Response (mock):', data);
    const token = data.token || 'mock_token';
    
    // 2. Create Manga
    console.log('\n2. Testing Create Manga...');
    res = await fetch(`${API_URL}/mangas`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ title: 'Test Manga', description: 'Test', author: 'Test' })
    });
    data = await res.json();
    console.log('Create Manga Response:', data);
    const mangaId = data.data?._id;
    if (!mangaId) throw new Error('Manga creation failed');

    // 3. Create Chapter
    console.log('\n3. Testing Create Chapter...');
    res = await fetch(`${API_URL}/chapters`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ mangaId, title: 'Chapter 1', chapterNumber: 1, price: 0 })
    });
    data = await res.json();
    console.log('Create Chapter Response:', data);
    const chapterId = data.data?._id;
    if (!chapterId) throw new Error('Chapter creation failed');

    // 4. Test Panel Detection (Need a dummy image URL or file)
    console.log('\n4. Testing Panel Detection endpoint (mocking page image)...');
    res = await fetch(`${API_URL}/panels/${chapterId}/1/detect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        imageUrl: 'https://via.placeholder.com/800x1100', 
        imageWidth: 800, 
        imageHeight: 1100 
      })
    });
    data = await res.json();
    console.log('Panel Detect Response:', data);

    // 5. Test Character Detection
    console.log('\n5. Testing Character Detection endpoint...');
    res = await fetch(`${API_URL}/panels/${chapterId}/1/detect-characters`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    data = await res.json();
    console.log('Character Detect Response:', data);

    console.log('\n--- FLOW TEST COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('\n--- FLOW TEST FAILED ---');
    console.error(err);
  }
}

runTest();
