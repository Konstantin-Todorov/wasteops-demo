const { execSync } = require('child_process');
const path = require('path');

async function runMigrations() {
  console.log('[migrate] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[migrate] Migrations complete.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
