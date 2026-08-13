'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { orderDayFromId } = require('./orders.js');
const STATUS_SEQUENCE = ['recebido', 'preparando', 'na_chapa', 'finalizando', 'saiu_entrega', 'entregue'];

class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyStatusEvents(order, events) {
  const result = clone(order);
  for (const event of [...events].sort((a, b) => a.ts.localeCompare(b.ts))) {
    if (event.kind !== 'status') continue;
    const expectedStatus = STATUS_SEQUENCE[STATUS_SEQUENCE.indexOf(result.status) + 1];
    if (event.status !== expectedStatus) continue;
    result.status = event.status;
    result.updatedAt = event.ts;
    result.history.push({ status: event.status, ts: event.ts });
  }
  return result;
}

function encryptionKey(secret) {
  if (!secret || String(secret).length < 32) {
    throw new StorageError('ORDER_DATA_SECRET deve ter pelo menos 32 caracteres.');
  }
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

function encryptDocument(document, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(document), 'utf8'),
    cipher.final(),
  ]);
  return JSON.stringify({
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: encrypted.toString('base64url'),
  });
}

function decryptDocument(payload, secret) {
  try {
    const envelope = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm') throw new Error('Formato inválido.');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(secret),
      Buffer.from(envelope.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const clear = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(clear);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError('Não foi possível descriptografar um pedido.', error);
  }
}

class FileOrderStore {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  _orderPath(id) {
    return path.join(this.rootDir, orderDayFromId(id), `${id}.json`);
  }

  _eventDirectory(id) {
    return path.join(this.rootDir, orderDayFromId(id), id, 'events');
  }

  async create(order) {
    const destination = this._orderPath(order.id);
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(temporary, JSON.stringify(order, null, 2), { encoding: 'utf8', flag: 'wx' });
      await fs.link(temporary, destination);
      await fs.rm(temporary, { force: true });
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw new StorageError('Não foi possível persistir o pedido localmente.', error);
    }
  }

  async get(id) {
    try {
      const order = JSON.parse(await fs.readFile(this._orderPath(id), 'utf8'));
      let eventNames = [];
      try {
        eventNames = (await fs.readdir(this._eventDirectory(id))).filter(name => name.endsWith('.json'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const events = await Promise.all(eventNames.map(name =>
        fs.readFile(path.join(this._eventDirectory(id), name), 'utf8').then(JSON.parse)
      ));
      return applyStatusEvents(order, events);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new StorageError('Não foi possível ler o pedido local.', error);
    }
  }

  async list(day) {
    const directory = path.join(this.rootDir, day);
    try {
      const names = (await fs.readdir(directory)).filter(name => name.endsWith('.json'));
      const orders = await Promise.all(names.map(name => this.get(path.basename(name, '.json'))));
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new StorageError('Não foi possível listar os pedidos locais.', error);
    }
  }

  async appendStatus(id, event) {
    const directory = this._eventDirectory(id);
    const name = `${event.ts.replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}.json`;
    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, name), JSON.stringify(event, null, 2), { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      throw new StorageError('Não foi possível atualizar o pedido local.', error);
    }
  }
}

class BlobOrderStore {
  constructor({ blob, fetchImpl = fetch, token, secret, prefix = 'sanka-orders' }) {
    if (!blob?.put || !blob?.list) throw new StorageError('Cliente do Vercel Blob inválido.');
    if (!token) throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado.');
    encryptionKey(secret);
    this.blob = blob;
    this.fetchImpl = fetchImpl;
    this.token = token;
    this.secret = secret;
    this.prefix = prefix;
  }

  _orderPrefix(id) {
    return `${this.prefix}/${orderDayFromId(id)}/${id}/`;
  }

  async _put(pathname, document) {
    try {
      return await this.blob.put(pathname, encryptDocument(document, this.secret), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: this.token,
      });
    } catch (error) {
      throw new StorageError('Não foi possível gravar o pedido no Vercel Blob.', error);
    }
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
      throw new StorageError('Não foi possível listar pedidos no Vercel Blob.', error);
    }
  }

  async _read(blob) {
    try {
      const response = await this.fetchImpl(blob.url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Blob respondeu ${response.status}.`);
      return decryptDocument(await response.text(), this.secret);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('Não foi possível ler um pedido do Vercel Blob.', error);
    }
  }

  async create(order) {
    await this._put(`${this._orderPrefix(order.id)}order.json`, { kind: 'order', order });
  }

  async get(id) {
    const blobs = await this._listAll(this._orderPrefix(id));
    if (!blobs.length) return null;
    const documents = await Promise.all(blobs.map(blob => this._read(blob)));
    const base = documents.find(document => document.kind === 'order')?.order;
    if (!base) return null;
    return applyStatusEvents(base, documents.filter(document => document.kind === 'status'));
  }

  async list(day) {
    const blobs = await this._listAll(`${this.prefix}/${day}/`);
    const groups = new Map();
    for (const blob of blobs) {
      const rest = blob.pathname.slice(`${this.prefix}/${day}/`.length);
      const id = rest.split('/')[0];
      if (!id) continue;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(blob);
    }
    const orders = await Promise.all(Array.from(groups.entries()).map(async ([id]) => this.get(id)));
    return orders.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async appendStatus(id, event) {
    const suffix = `${event.ts.replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
    await this._put(`${this._orderPrefix(id)}events/${suffix}.json`, event);
  }
}

function createDefaultOrderStore(env = process.env) {
  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = require('@vercel/blob');
    return new BlobOrderStore({
      blob,
      token: env.BLOB_READ_WRITE_TOKEN,
      secret: env.ORDER_DATA_SECRET,
    });
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new StorageError('BLOB_READ_WRITE_TOKEN não configurado para produção.');
  }
  return new FileOrderStore({
    rootDir: env.ORDER_STORAGE_DIR || path.join(process.cwd(), 'data', 'orders'),
  });
}

module.exports = {
  BlobOrderStore,
  FileOrderStore,
  StorageError,
  applyStatusEvents,
  createDefaultOrderStore,
  decryptDocument,
  encryptDocument,
};
