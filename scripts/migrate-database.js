'use strict';

async function main() {
  throw new Error('Migrações automáticas desativadas. Use o procedimento manual revisado e autorização específica.');
}

main().catch(() => {
  console.error('Não foi possível aplicar as migrações do banco.');
  process.exitCode = 1;
});
