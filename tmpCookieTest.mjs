import http from 'http';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ headers: res.headers, statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log("Logging in...");
  const login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/sign-in/email',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'hacker2@test.com', password: 'password123' }));
  
  const cookies = login.headers['set-cookie'];
  console.log("Cookies received:", cookies);
  
  if (!cookies) return;
  
  console.log("Fetching /exercises...");
  const execReq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/exercises',
    method: 'GET',
    headers: { 'Cookie': cookies[0] }
  });
  
  console.log("Exercises status:", execReq.statusCode);
  
  console.log("Fetching /...");
  const homeReq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    headers: { 'Cookie': cookies[0] }
  });
  
  console.log("Home status:", homeReq.statusCode);
}
run();
