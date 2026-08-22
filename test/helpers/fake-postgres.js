'use strict';

class FakePostgresDatabase {
  constructor({ fail = false } = {}) {
    this.fail = fail;
    this.orders = new Map();
    this.events = [];
    this.attempts = [];
    this.counters = new Map();
    this.schemaChecks = 0;
  }

  async ensureSchema() {
    this.schemaChecks += 1;
    if (this.fail) throw new Error('Banco indisponível.');
  }

  async query(text, params = []) {
    if (this.fail) throw new Error('Banco indisponível.');

    if (text.includes('sanka:order:create')) {
      const [id, day, createdAt, payload] = params;
      if (this.orders.has(id)) throw new Error('duplicate key');
      this.orders.set(id, { id, day, createdAt, payload });
      return [];
    }

    if (text.includes('sanka:order:event')) {
      const [eventId, orderId, kind, createdAt, payload] = params;
      if (!this.orders.has(orderId)) throw new Error('foreign key');
      this.events.push({ eventId, orderId, kind, createdAt, payload });
      return [];
    }

    if (text.includes('sanka:order:get')) {
      const order = this.orders.get(params[0]);
      return order ? this._joinedRows([order]) : [];
    }

    if (text.includes('sanka:order:list')) {
      const orders = [...this.orders.values()]
        .filter(order => order.day === params[0])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return this._joinedRows(orders);
    }

    if (text.includes('sanka:abuse:record')) {
      const [attemptId, bucket, policy, dimension, subjectHash, timestamp, payload] = params;
      const key = [bucket, policy, dimension, subjectHash].join('|');
      const count = (this.counters.get(key)?.count || 0) + 1;
      this.counters.set(key, { count, updatedAt: timestamp });
      this.attempts.push({ attemptId, bucket, policy, dimension, subjectHash, timestamp, payload });
      return [{ count }];
    }

    if (text.includes('sanka:abuse:prune')) {
      const cutoff = params[0];
      this.attempts = this.attempts.filter(item => item.timestamp >= cutoff);
      for (const [key, value] of this.counters) {
        if (value.updatedAt < cutoff) this.counters.delete(key);
      }
      return [];
    }

    throw new Error(`Consulta não suportada no banco de teste: ${text.slice(0, 60)}`);
  }

  _joinedRows(orders) {
    const rows = [];
    for (const order of orders) {
      const events = this.events
        .filter(event => event.orderId === order.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId));
      if (!events.length) {
        rows.push({ order_id: order.id, order_payload: order.payload, event_payload: null });
        continue;
      }
      for (const event of events) {
        rows.push({ order_id: order.id, order_payload: order.payload, event_payload: event.payload });
      }
    }
    return rows;
  }

  rawPersistedText() {
    return JSON.stringify({
      orders: [...this.orders.values()],
      events: this.events,
      attempts: this.attempts,
      counters: [...this.counters.entries()],
    });
  }
}

module.exports = { FakePostgresDatabase };
