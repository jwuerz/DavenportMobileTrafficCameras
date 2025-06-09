
console.log('=== Firebase Environment Variables Check ===\n');

const requiredClientVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY'
];

const requiredServerVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_SERVICE_ACCOUNT_KEY'
];

console.log('CLIENT-SIDE VARIABLES (VITE_):');
requiredClientVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ SET' : '❌ MISSING';
  const preview = value ? `(${value.substring(0, 20)}...)` : '';
  console.log(`  ${varName}: ${status} ${preview}`);
});

console.log('\nSERVER-SIDE VARIABLES:');
requiredServerVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ SET' : '❌ MISSING';
  const preview = value ? `(${value.substring(0, 20)}...)` : '';
  console.log(`  ${varName}: ${status} ${preview}`);
});

console.log('\n=== Summary ===');
const allVars = [...requiredClientVars, ...requiredServerVars];
const setVars = allVars.filter(varName => process.env[varName]);
const missingVars = allVars.filter(varName => !process.env[varName]);

console.log(`Total required: ${allVars.length}`);
console.log(`Configured: ${setVars.length}`);
console.log(`Missing: ${missingVars.length}`);

if (missingVars.length > 0) {
  console.log('\nMissing variables:');
  missingVars.forEach(varName => console.log(`  - ${varName}`));
}
