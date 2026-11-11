'use strict';
const crypto = require('crypto');
class IdempotencyConflict extends Error {
  constructor() { super('Esta tentativa já foi usada para outro conteúdo.'); this.name = 'IdempotencyConflict'; }
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function requestHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(payload ?? null))).digest('hex');
}
function validKey(key) { return typeof key === 'string' && /^[a-zA-Z0-9_-]{20,128}$/.test(key); }
module.exports = { IdempotencyConflict, requestHash, validKey };
