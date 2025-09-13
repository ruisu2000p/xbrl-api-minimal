// Test import
const path = require('path');
const fs = require('fs');

const authClientPath = path.join(__dirname, 'lib', 'supabase', 'auth-client.ts');
console.log('Checking path:', authClientPath);
console.log('File exists:', fs.existsSync(authClientPath));

if (fs.existsSync(authClientPath)) {
  const content = fs.readFileSync(authClientPath, 'utf8');
  console.log('First 100 chars:', content.substring(0, 100));
  console.log('File size:', content.length);
}