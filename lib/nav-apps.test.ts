import { describe, it, expect } from 'vitest';
import {
  NAV_APPS,
  NAV_BOTTOM,
  pathMatches,
  findActiveApp,
  findActiveItem,
  filterAppsByRole,
  isAdminRole,
} from './nav-apps';

describe('pathMatches', () => {
  it('matches root exactly', () => {
    expect(pathMatches('/', '/')).toBe(true);
    expect(pathMatches('/students', '/')).toBe(false);
  });
  it('matches deeper paths via prefix', () => {
    expect(pathMatches('/code-reviews', '/code-reviews')).toBe(true);
    expect(pathMatches('/code-reviews/suivi', '/code-reviews')).toBe(true);
  });
  it('does not match partial segments', () => {
    expect(pathMatches('/code-reviews-other', '/code-reviews')).toBe(false);
  });
});

describe('isAdminRole', () => {
  it('accepts Admin and Super Admin', () => {
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole('Super Admin')).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('admin')).toBe(false); // lowercase intentionally distinct
  });
});

describe('filterAppsByRole', () => {
  it('returns all apps for admin', () => {
    const filtered = filterAppsByRole(NAV_APPS, 'Admin');
    expect(filtered).toHaveLength(NAV_APPS.length);
  });
  it('hides admin-only apps for non-admin', () => {
    const filtered = filterAppsByRole(NAV_APPS, 'user');
    expect(filtered.every((a) => !a.adminOnly)).toBe(true);
    // External Zone01 apps should remain
    expect(filtered.some((a) => a.key === '01deck-app')).toBe(true);
    expect(filtered.some((a) => a.key === 'intra')).toBe(true);
    expect(filtered.some((a) => a.key === 'emargement')).toBe(true);
  });
  it('filters NAV_BOTTOM the same way', () => {
    const filtered = filterAppsByRole(NAV_BOTTOM, 'user');
    expect(filtered.every((a) => !a.adminOnly)).toBe(true);
  });
});

describe('findActiveApp', () => {
  it('matches dashboard exactly', () => {
    expect(findActiveApp('/')?.key).toBe('dashboard');
  });
  it('matches an internal page to its parent app', () => {
    expect(findActiveApp('/students')?.key).toBe('pedagogie');
    expect(findActiveApp('/planning/absences')?.key).toBe('planning');
    expect(findActiveApp('/code-reviews/suivi')?.key).toBe('pedagogie');
  });
  it('returns null for unknown paths', () => {
    expect(findActiveApp('/foo/bar/baz')).toBeNull();
  });
});

describe('findActiveItem', () => {
  it('returns the deepest matching item', () => {
    const app = NAV_APPS.find((a) => a.key === 'pedagogie')!;
    expect(findActiveItem(app, '/code-reviews/suivi')?.url).toBe('/code-reviews/suivi');
    expect(findActiveItem(app, '/code-reviews')?.url).toBe('/code-reviews');
  });
});
