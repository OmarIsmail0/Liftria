/** ON-3: missing optional fields are valid; entered values have per-field range errors. */
export function profileFieldErrors(input: { name: string; age: string; heightCm: string; weightKg: string }) {
  const errors: { name?: string; age?: string; heightCm?: string; weightKg?: string } = {};
  if (input.name.trim().length > 30) errors.name = 'Name must be 30 characters or fewer.';
  if (input.age.trim()) {
    const age = Number(input.age);
    if (!Number.isInteger(age) || age < 16 || age > 100)
      errors.age = 'Enter an age between 16 and 100.';
  }
  for (const field of [{ key: 'heightCm' as const, min: 120, max: 230, label: 'Height' },
                       { key: 'weightKg' as const, min: 35, max: 300, label: 'Weight' }]) {
    const raw = input[field.key].trim();
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < field.min || Number(raw) > field.max))
      errors[field.key] = `${field.label} must be between ${field.min} and ${field.max}.`;
  }
  return errors;
}
