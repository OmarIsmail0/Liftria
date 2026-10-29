import { translate, type AppLanguage } from '../../i18n';
/** ON-3: missing optional fields are valid; entered values have per-field range errors. */
export function profileFieldErrors(input: { name: string; age: string; heightCm: string; weightKg: string },
  language: AppLanguage = 'en') {
  const errors: { name?: string; age?: string; heightCm?: string; weightKg?: string } = {};
  if (input.name.trim().length > 30) errors.name = translate(language, 'onboarding.validation.nameTooLong');
  if (input.age.trim()) {
    const age = Number(input.age);
    if (!Number.isInteger(age) || age < 16 || age > 100)
      errors.age = translate(language, 'onboarding.validation.ageRange');
  }
  for (const field of [{ key: 'heightCm' as const, min: 120, max: 230, message: 'onboarding.validation.heightRange' as const },
                       { key: 'weightKg' as const, min: 35, max: 300, message: 'onboarding.validation.weightRange' as const }]) {
    const raw = input[field.key].trim();
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < field.min || Number(raw) > field.max))
      errors[field.key] = translate(language, field.message);
  }
  return errors;
}
