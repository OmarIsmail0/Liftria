import { canDeleteEverything } from '../storage';
test('ST-6 destructive confirmation requires the precise word in uppercase', () => {
  expect(canDeleteEverything('DELETE')).toBe(true);
  for (const value of ['delete','Delete',' DELETE','DELETE ','DELETE\n','']) expect(canDeleteEverything(value)).toBe(false);
});
