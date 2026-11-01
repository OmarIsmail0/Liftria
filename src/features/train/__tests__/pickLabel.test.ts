import { addExerciseButtonLabel } from '../pickLabel';

test('the add button says Select exercises at zero and pluralizes the count', () => {
  expect(addExerciseButtonLabel('en', 0)).toBe('Select exercises');
  expect(addExerciseButtonLabel('en', 1)).toBe('Add 1 exercise');
  expect(addExerciseButtonLabel('en', 2)).toBe('Add 2 exercises');
  expect(addExerciseButtonLabel('en', 11)).toBe('Add 11 exercises');
  expect(addExerciseButtonLabel('ar', 0)).toBe('اختر تمارين');
  expect(addExerciseButtonLabel('ar', 1)).toBe('إضافة تمرين واحد');
  expect(addExerciseButtonLabel('ar', 2)).toBe('إضافة تمرينين');
  expect(addExerciseButtonLabel('ar', 11)).toBe('إضافة 11 تمرينًا');
});
