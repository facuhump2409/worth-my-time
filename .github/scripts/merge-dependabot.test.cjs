const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checksPassed } = require('./merge-dependabot.cjs');

const check = (name, slug, conclusion = 'success') => ({
  name, app: { slug }, status: conclusion ? 'completed' : 'in_progress', conclusion,
});
const status = (state, login = 'vercel[bot]') => ({ context: 'Vercel', creator: { login }, state });
const ci = check('Validate PWA', 'github-actions');
const vercel = check('Vercel', 'vercel');

test('requires CI and a trusted Vercel success, ignoring only the merge job', () => {
  assert.equal(checksPassed([ci, vercel, check('Merge verified Dependabot updates', 'github-actions', null)], []), true);
  assert.equal(checksPassed([ci], [status('success'), status('pending')]), true);
  assert.equal(checksPassed([ci], [status('success', 'unrelated-app')]), false);
  assert.equal(checksPassed([vercel], []), false);
  assert.equal(checksPassed([ci], []), false);
});

test('blocks pending, failed or newly superseded external checks', () => {
  assert.equal(checksPassed([ci, vercel, check('Extra check', 'external', 'failure')], []), false);
  assert.equal(checksPassed([ci, check('Vercel', 'vercel', null)], []), false);
  assert.equal(checksPassed([ci], [status('pending'), status('success')]), false);
});
