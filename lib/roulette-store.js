'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { decryptDocument, encryptDocument, StorageError } = require('./order-store.js');

class DuplicateSpinError extends Error {
  constructor() {
    super('Já existe um giro para este telefone hoje.');
    this.name = 'DuplicateSpinError';
  }
}

class DuplicateUseError extends Error {
  constructor() {
    super('Este código já foi utilizado.');
    this.name = 'DuplicateUseError';
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyRouletteEvents(record, events = []) {
  const result = clone(record);
  for (const event of [...events].sort((a, b) => a.ts.localeCompare(b.ts))) {
    if (event.kind === 'used' && result.status === 'issued') {
      result.status = 'used';
      result.usedAt = event.ts;
      result.orderId = event.orderId;
      result.benefit = event.benefit;
    } else if (event.kind === 'expired' && result.status === 'issued') {
      result.status = 'expired';
      result.expiredAt = event.ts;
    } else if (event.kind === 'cancelled') {
      result.status = 'cancelled';
      result.cancelledAt = event.ts;
      result.cancelReason = event.reason || '';
      result.cancelledOrderId = event.orderId || result.orderId || null;
    }
  }
  return result;
}

class FileRouletteStore {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  _spinPath(day, phoneHash) {
    return path.join(this.rootDir, day, 'spins', `${phoneHash}.json`);
  }

  _eventsDir(day, phoneHash) {
    return path.join(this.rootDir, day, 'spins', phoneHash, 'events');
  }

  async create(record) {
    const destination = this._spinPath(record.day, record.phoneHash);
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(temporary, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
      await fs.link(temporary, destination);
      await fs.rm(temporary, { force: true });
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      if (error.code === 'EEXIST') throw new DuplicateSpinError();
      throw new StorageError('Não foi possível persistir o giro localmente.', error);
    }
  }

  async _events(day, phoneHash) {
    const directory = this._eventsDir(day, phoneHash);
    try {
      const names = (await fs.readdir(directory)).filter(name => name.endsWith('.json'));
      return await Promise.all(names.map(name => fs.readFile(path.join(directory, name), 'utf8').then(JSON.parse)));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new StorageError('Não foi possível ler os eventos da roleta.', error);
    }
  }

  async getByPhone(day, phoneHash) {
    try {
      const record = JSON.parse(await fs.readFile(this._spinPath(day, phoneHash), 'utf8'));
      return applyRouletteEvents(record, await this._events(day, phoneHash));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      if (error instanceof StorageError) throw error;
      throw new StorageError('Não foi possível ler o giro local.', error);
    }
  }

  async listDay(day) {
    const directory = path.join(this.rootDir, day, 'spins');
    try {
      const names = (await fs.readdir(directory)).filter(name => name.endsWith('.json'));
      return await Promise.all(names.map(name => this.getByPhone(day, path.basename(name, '.json'))));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new StorageError('Não foi possível listar os giros locais.', error);
    }
  }

  async findByCodeHash(day, codeHash) {
    const records = await this.listDay(day);
    return records.find(record => record?.codeHash === codeHash) || null;
  }

  async _writeEvent(record, name, event, duplicateError) {
    const directory = this._eventsDir(record.day, record.phoneHash);
    const destination = path.join(directory, `${name}.json`);
    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(destination, JSON.stringify(event, null, 2), { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST' && duplicateError) throw duplicateError;
      if (error.code === 'EEXIST') return;
      throw new StorageError('Não foi possível registrar o evento da roleta.', error);
    }
  }

  claimUse(record, event) {
    return this._writeEvent(record, 'used', event, new DuplicateUseError());
  }

  markExpired(record, event) {
    return this._writeEvent(record, 'expired', event);
  }

  markCancelled(record, event) {
    return this._writeEvent(record, 'cancelled', event);
  }
}

class BlobRouletteStore {
  constructor({ blob, fetchImpl = fetch, token, secret, prefix = 'sanka-roulette' }) {
    if (!blob?.put || !blob?.list) throw new StorageError('Cliente do Vercel Blob inválido.');
    if (!token) throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado.');
    encryptDocument({ test: true }, secret);
    this.blob = blob;
    this.fetchImpl = fetchImpl;
    this.token = token;
    this.secret = secret;
    this.prefix = prefix;
  }

  _spinPrefix(day, phoneHash) {
    return `${this.prefix}/${day}/spins/${phoneHash}/`;
  }

  async _putNew(pathname, document) {
    return this.blob.put(pathname, encryptDocument(document, this.secret), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: this.token,
    });
  }

  async _listAll(prefix) {
    const found = [];
    let cursor;
    try {
      do {
        const page = await this.blob.list({ prefix, cursor, limit: 1000, token: this.token });
        found.push(...page.blobs);
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return found;
    } catch (error) {
      throw new StorageError('Não foi possível listar os giros no Vercel Blob.', error);
    }
  }

  async _read(blob) {
    try {
      const response = await this.fetchImpl(blob.url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Blob respondeu ${response.status}.`);
      return decryptDocument(await response.text(), this.secret);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Não foi possível ler um giro no Vercel Blob.', error);
    }
  }

  async create(record) {
    const pathname = `${this._spinPrefix(record.day, record.phoneHash)}spin.json`;
    try {
      await this._putNew(pathname, { kind: 'spin', record });
    } catch (error) {
      const existing = await this.getByPhone(record.day, record.phoneHash).catch(() => null);
      if (existing) throw new DuplicateSpinError();
      throw new StorageError('Não foi possível persistir o giro no Vercel Blob.', error);
    }
  }

  async getByPhone(day, phoneHash) {
    const blobs = await this._listAll(this._spinPrefix(day, phoneHash));
    if (!blobs.length) return null;
    const documents = await Promise.all(blobs.map(blob => this._read(blob)));
    const record = documents.find(document => document.kind === 'spin')?.record;
    if (!record) return null;
    return applyRouletteEvents(record, documents.filter(document => document.kind !== 'spin'));
  }

  async listDay(day) {
    const prefix = `${this.prefix}/${day}/spins/`;
    const blobs = await this._listAll(prefix);
    const hashes = new Set();
    for (const blob of blobs) {
      const phoneHash = blob.pathname.slice(prefix.length).split('/')[0];
      if (phoneHash) hashes.add(phoneHash);
    }
    return Promise.all([...hashes].map(phoneHash => this.getByPhone(day, phoneHash)));
  }

  async findByCodeHash(day, codeHash) {
    const records = await this.listDay(day);
    return records.find(record => record?.codeHash === codeHash) || null;
  }

  async _writeEvent(record, name, event, duplicateError) {
    const pathname = `${this._spinPrefix(record.day, record.phoneHash)}events/${name}.json`;
    try {
      await this._putNew(pathname, event);
    } catch (error) {
      const current = await this.getByPhone(record.day, record.phoneHash).catch(() => null);
      if (duplicateError && current?.status === 'used') throw duplicateError;
      if ((name === 'expired' && current?.status === 'expired') || (name === 'cancelled' && current?.status === 'cancelled')) return;
      throw new StorageError('Não foi possível registrar o evento da roleta no Vercel Blob.', error);
    }
  }

  claimUse(record, event) {
    return this._writeEvent(record, 'used', event, new DuplicateUseError());
  }

  markExpired(record, event) {
    return this._writeEvent(record, 'expired', event);
  }

  markCancelled(record, event) {
    return this._writeEvent(record, 'cancelled', event);
  }
}

function createDefaultRouletteStore(env = process.env) {
  if (env.BLOB_READ_WRITE_TOKEN) {
    return new BlobRouletteStore({
      blob: require('@vercel/blob'),
      token: env.BLOB_READ_WRITE_TOKEN,
      secret: env.ORDER_DATA_SECRET,
    });
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado para a roleta em produção.');
  }
  return new FileRouletteStore({
    rootDir: env.ROULETTE_STORAGE_DIR || path.join(process.cwd(), 'data', 'roulette'),
  });
}

module.exports = {
  BlobRouletteStore,
  DuplicateSpinError,
  DuplicateUseError,
  FileRouletteStore,
  applyRouletteEvents,
  createDefaultRouletteStore,
};
