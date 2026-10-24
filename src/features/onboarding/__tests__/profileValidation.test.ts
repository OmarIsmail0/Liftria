import { profileFieldErrors } from '../profileValidation';

test('ON-3 all fields optional; no red/global error on empty values', () => {
  expect(profileFieldErrors({ name: '', age: '', heightCm: '', weightKg: '' })).toEqual({});
});
test('ON-3 each field validates independently with the correct range', () => {
  const errors = profileFieldErrors({ name: 'a'.repeat(31), age: '15', heightCm: '119.9', weightKg: '301' });
  expect(Object.keys(errors)).toEqual(['name', 'age', 'heightCm', 'weightKg']);
  expect(profileFieldErrors({ name: 'a'.repeat(30), age: '100', heightCm: '230', weightKg: '300' })).toEqual({});
  expect(profileFieldErrors({ name: '', age: 'none', heightCm: 'NaN', weightKg: 'Infinity' })).toMatchObject({
    age: expect.any(String), heightCm: expect.any(String), weightKg: expect.any(String),
  });
});
