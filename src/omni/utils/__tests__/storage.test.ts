// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerOrUpdateUser,
  getRegisteredUsers,
  findUserByEmail,
  loginUser,
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  saveUserWorkspace,
  loadUserWorkspace,
} from '../storage';

test('registerOrUpdateUser registers a new user account with persistence', () => {
  const result = registerOrUpdateUser('Bruno Moura', 'bruno@teste.com', 'Tech Brand', 'CEO');
  assert.equal(result.isNew, true);
  assert.equal(result.user.name, 'Bruno Moura');
  assert.equal(result.user.email, 'bruno@teste.com');
  assert.equal(result.user.company, 'Tech Brand');

  const found = findUserByEmail('bruno@teste.com');
  assert.ok(found);
  assert.equal(found?.id, result.user.id);
});

test('loginUser logs in registered user and sets active session', () => {
  registerOrUpdateUser('Ana Lima', 'ana@empresa.com');
  const logged = loginUser('ana@empresa.com');
  assert.ok(logged);
  assert.equal(logged?.email, 'ana@empresa.com');

  const current = getCurrentSession();
  assert.ok(current);
  assert.equal(current?.email, 'ana@empresa.com');

  clearCurrentSession();
  assert.equal(getCurrentSession(), null);

  // User still exists in registry after session cleared
  assert.ok(findUserByEmail('ana@empresa.com'));
});

test('saveUserWorkspace and loadUserWorkspace retains brands and marketing data', () => {
  const { user } = registerOrUpdateUser('Carlos', 'carlos@omni.com');
  const mockBrand = {
    id: 'brand_test_1',
    name: 'Loja Exemplo',
    industry: 'Moda',
    tagline: 'Estilo próprio',
    tone: 'Sofisticado',
    targetAudience: 'Jovens',
    valueProposition: 'Preço justo e qualidade',
    monthlyBudget: 5000,
    currency: 'BRL',
    accentColor: '#10b981',
    logoInitial: 'LE',
    socialHandles: { instagram: '@lojaexemplo' },
  };

  saveUserWorkspace({
    user,
    brands: [mockBrand],
    activeBrandId: mockBrand.id,
    updatedAt: new Date().toISOString(),
  });

  const loaded = loadUserWorkspace(user.id);
  assert.ok(loaded);
  assert.equal(loaded?.brands.length, 1);
  assert.equal(loaded?.brands[0].name, 'Loja Exemplo');
  assert.equal(loaded?.activeBrandId, 'brand_test_1');
});
