import { recoveryKindFromParam } from '../recoveryParam';

test('the developer recovery route maps its variant query to a recovery kind', () => {
  expect(recoveryKindFromParam(undefined)).toBe('failed');
  expect(recoveryKindFromParam('failed')).toBe('failed');
  expect(recoveryKindFromParam('newer-version')).toBe('newer');
  expect(recoveryKindFromParam('crash')).toBe('crash');
  expect(recoveryKindFromParam('nonsense')).toBe('failed');
});
