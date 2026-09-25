import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTrivyTableColumns, normalizeTrivyRows } from './trivy.js';

test('buildTrivyTableColumns includes expected raw fields', () => {
  const columns = buildTrivyTableColumns();
  assert.ok(columns.includes('vulnerability_id'));
  assert.ok(columns.includes('package_name'));
  assert.ok(columns.includes('severity'));
});

test('normalizeTrivyRows maps database keys to display values', () => {
  const rows = normalizeTrivyRows([
    {
      id: 1,
      vulnerability_id: 'CVE-2024-0001',
      package_name: 'openssl',
      installed_version: '3.0.0',
      fixed_version: '3.0.1',
      severity: 'HIGH',
      status: 'fixed',
      title: 'openssl issue',
      target: 'ubuntu:22.04',
      type: 'os-pkgs',
      published_date: '2024-01-01T00:00:00Z',
      last_modified_date: '2024-02-01T00:00:00Z',
      primary_url: 'https://example.com'
    }
  ]);

  assert.equal(rows[0].vulnerability_id, 'CVE-2024-0001');
  assert.equal(rows[0].package_name, 'openssl');
  assert.equal(rows[0].severity, 'HIGH');
  assert.equal(rows[0].target, 'ubuntu:22.04');
});
