'use strict';

const crypto = require('crypto');
const { createDefaultAbuseStore } = require('./abuse-store.js');

const DEVICE_COOKIE = 'sanka_abuse_device';
const RETENTION_MS = 48 * 60 * 60 * 1000;
const POLICIES = Object.freeze({
  order_create: {
    windowMs: 10 * 60 * 1000,
    limits: { phone: 6, device: 10, network: 100 },
  },
  roulette_spin: {
    windowMs: 60 * 60 * 1000,
    limits: { phone: 3, device: 5, network: 60 },
  },
  roulette_consume: {
    windowMs: 60 * 60 * 1000,
    limits: { device: 15, network: 100 },
  },
  admin_failure: {
    windowMs: 15 * 60 * 1000,
    limits: { device: 10, network: 20 },
  },
  admin_action: {
    windowMs: 15 * 60 * 1000,
    limits: { device: 200, network: 300 },
  },
});

class RateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super('Muitas tentativas. Aguarde um pouco e tente novamente.');
    this.name = 'RateLimitError';
    this.status = 429;
    this.code = 'RATE_LIMITED';
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }
}

function requireSecret(secret) {
  if (!secret || String(secret).length < 32) throw new Error('ORDER_DATA_SECRET inválido para proteção contra abuso.');
  return String(secret);
}

function subjectHash(secret, dimension, value) {
  return crypto.createHmac('sha256', secret).update(`abuse:${dimension}:${value}`, 'utf8').digest('hex');
}

function parseCookies(header = '') {
  return String(header).split(';').reduce((cookies, entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return cookies;
    cookies[entry.slice(0, separator).trim()] = entry.slice(separator + 1).trim();
    return cookies;
  }, {});
}

function networkGroup(req) {
  const forwarded = req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'];
  let address = String(forwarded || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().toLowerCase();
  if (address.startsWith('::ffff:')) address = address.slice(7);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return `${address.split('.').slice(0, 3).join('.')}.0/24`;
  if (address.includes(':')) return `${address.split(':').slice(0, 4).join(':')}::/64`;
  return 'unknown';
}

function deviceId(req, res) {
  const existing = parseCookies(req.headers?.cookie)[DEVICE_COOKIE];
  if (/^[a-f0-9]{32}$/.test(existing || '')) return existing;
  const generated = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `${DEVICE_COOKIE}=${generated}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return generated;
}

function createAbuseProtection({ store, secret, now = () => new Date() } = {}) {
  const safeSecret = requireSecret(secret);
  const safeStore = store || createDefaultAbuseStore();
  let lastPruneAt = 0;

  return {
    async enforce(policyName, req, res, subjects = {}) {
      const policy = POLICIES[policyName];
      if (!policy) throw new Error(`Política de controle desconhecida: ${policyName}`);
      const timestamp = now().getTime();
      const bucket = Math.floor(timestamp / policy.windowMs) * policy.windowMs;
      const rawSubjects = {
        ...subjects,
        device: deviceId(req, res),
        network: networkGroup(req),
      };

      if (timestamp - lastPruneAt >= 60 * 60 * 1000) {
        await safeStore.pruneOlderThan(timestamp - RETENTION_MS);
        lastPruneAt = timestamp;
      }

      for (const [dimension, limit] of Object.entries(policy.limits)) {
        const raw = rawSubjects[dimension];
        if (!raw) continue;
        const record = {
          bucket,
          policy: policyName,
          dimension,
          subjectHash: subjectHash(safeSecret, dimension, raw),
          ts: timestamp,
          windowStart: bucket,
        };
        const count = await safeStore.recordAndCount(record);
        if (count > limit) {
          throw new RateLimitError(Math.ceil((bucket + policy.windowMs - timestamp) / 1000));
        }
      }
    },
  };
}

let defaultProtection;
function getDefaultAbuseProtection() {
  if (!defaultProtection) {
    defaultProtection = createAbuseProtection({
      store: createDefaultAbuseStore(),
      secret: process.env.ORDER_DATA_SECRET,
    });
  }
  return defaultProtection;
}

function safeAdminPasswordMatches(authorization, password) {
  if (!password) return false;
  const supplied = Buffer.from(String(authorization || ''), 'utf8');
  const expected = Buffer.from(`Bearer ${password}`, 'utf8');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = {
  DEVICE_COOKIE,
  POLICIES,
  RETENTION_MS,
  RateLimitError,
  createAbuseProtection,
  getDefaultAbuseProtection,
  networkGroup,
  safeAdminPasswordMatches,
  subjectHash,
};
