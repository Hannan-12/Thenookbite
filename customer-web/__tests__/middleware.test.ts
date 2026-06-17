import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(host: string, path: string): NextRequest {
  const url = new URL(path, `http://${host}`);
  return new NextRequest(url, {
    headers: { host },
  });
}

describe('middleware', () => {
  describe('kitchen subdomain routing', () => {
    it('rewrites root path to /kitchen for kitchen subdomain', () => {
      const req = makeRequest('kitchen.thenookbite.com', '/');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toContain('/kitchen');
    });

    it('rewrites /orders to /kitchen/orders for kitchen subdomain', () => {
      const req = makeRequest('kitchen.thenookbite.com', '/orders');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toContain('/kitchen/orders');
    });

    it('does not rewrite if path already starts with /kitchen', () => {
      const req = makeRequest('kitchen.thenookbite.com', '/kitchen');
      const res = middleware(req);
      // Should pass through without rewrite
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    });
  });

  describe('admin subdomain routing', () => {
    it('rewrites root path to /admin for admin subdomain', () => {
      const req = makeRequest('admin.thenookbite.com', '/');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toContain('/admin');
    });

    it('rewrites /orders to /admin/orders for admin subdomain', () => {
      const req = makeRequest('admin.thenookbite.com', '/orders');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toContain('/admin/orders');
    });

    it('does not rewrite if path already starts with /admin', () => {
      const req = makeRequest('admin.thenookbite.com', '/admin');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    });
  });

  describe('regular domain (no subdomain)', () => {
    it('passes through without rewrite for main domain', () => {
      const req = makeRequest('thenookbite.com', '/');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    });

    it('passes through for localhost', () => {
      const req = makeRequest('localhost:3000', '/menu');
      const res = middleware(req);
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    });
  });
});
