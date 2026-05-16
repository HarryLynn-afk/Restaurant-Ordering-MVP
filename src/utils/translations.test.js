import { describe, it, expect } from 'vitest';
import { translations } from './translations';

describe('translations', () => {
  it('exports an object with en and my keys', () => {
    expect(translations).toHaveProperty('en');
    expect(translations).toHaveProperty('my');
  });

  describe('en', () => {
    it('has common, customer, and admin sections', () => {
      expect(translations.en).toHaveProperty('common');
      expect(translations.en).toHaveProperty('customer');
      expect(translations.en).toHaveProperty('admin');
    });

    it('common.cancel is a non-empty string', () => {
      expect(typeof translations.en.common.cancel).toBe('string');
      expect(translations.en.common.cancel.length).toBeGreaterThan(0);
    });

    it('admin.status.filter contains all order status keys', () => {
      const filter = translations.en.admin.status.filter;
      for (const key of ['all', 'new', 'unpaid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']) {
        expect(filter).toHaveProperty(key);
        expect(typeof filter[key]).toBe('string');
      }
    });
  });

  describe('my parity with en', () => {
    const collectLeafPaths = (obj, prefix = '') => {
      const paths = [];
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'string') {
          paths.push(path);
        } else if (typeof v === 'object' && v !== null) {
          paths.push(...collectLeafPaths(v, path));
        }
      }
      return paths;
    };

    it('my has every leaf key that en has', () => {
      const enPaths = collectLeafPaths(translations.en);
      const myPaths = new Set(collectLeafPaths(translations.my));
      const missing = enPaths.filter((p) => !myPaths.has(p));
      expect(missing).toEqual([]);
    });

    it('my translations differ from en for common keys (confirms actual translation)', () => {
      expect(translations.my.common.cancel).not.toBe(translations.en.common.cancel);
      expect(translations.my.common.save).not.toBe(translations.en.common.save);
    });
  });
});
