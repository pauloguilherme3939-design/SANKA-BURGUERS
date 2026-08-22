'use strict';

require('dotenv').config();
const { createDefaultPostgresDatabase } = require('../lib/postgres-database.js');

async function main() {
  const database = createDefaultPostgresDatabase();
  await database.ensureSchema();
  console.log('Migrações do banco aplicadas com sucesso.');
}

main().catch(() => {
  console.error('Não foi possível aplicar as migrações do banco.');
  process.exitCode = 1;
});
