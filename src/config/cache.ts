// src/config/cache.ts
// Cache simples em memória com TTL — evita queries repetidas ao banco
// para rotas públicas de listagem que mudam pouco

import NodeCache from "node-cache";

// TTL padrão: 60 segundos
const cache = new NodeCache({ stdTTL: 60, checkperiod: 30, useClones: false });

export function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return Promise.resolve(hit);
  return fn().then((val) => {
    cache.set(key, val, ttl);
    return val;
  });
}

export function invalidate(...keys: string[]) {
  cache.del(keys);
}

export function invalidateByPrefix(prefix: string) {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
}

export { cache };
