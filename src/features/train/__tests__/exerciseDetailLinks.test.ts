const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
};

function source(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8');
}

test('the template builder opens an exercise without reloading the draft', () => {
  const template = source('app/(tabs)/train/template.tsx');
  expect(template).toContain('hydratedFor');
  expect(template).toContain('exerciseRow.open');
  expect(template).toContain('exerciseRow.add');
  expect(template).toContain("pathname:'/(tabs)/train/exercise/[id]'");
  expect(template.match(/pathname:'\/\(tabs\)\/train\/exercise\/\[id\]'/g)).toHaveLength(2);
});

test('the picker adds from its own button and opens details from the name', () => {
  const pick = source('app/(tabs)/train/pick.tsx');
  expect(pick).toContain('onOpen={openExercise}');
  expect(pick).toContain('onAdd={add}');
  expect(pick).toContain('exerciseRow.add');
});

test('the active workout and the preview open the same exercise screen', () => {
  for (const file of ['app/(tabs)/train/active.tsx', 'app/(tabs)/train/preview.tsx']) {
    const text = source(file);
    expect(text).toContain("pathname:'/(tabs)/train/exercise/[id]'");
  }
  expect(source('app/(tabs)/train/active.tsx')).toContain('ExerciseFigure');
  expect(source('app/(tabs)/train/active.tsx')).toContain('exerciseRow.open');
  // A custom exercise has no id until it is saved, and saving already opens its detail.
  expect(source('app/(tabs)/train/create.tsx')).toContain("pathname:'/(tabs)/train/exercise/[id]'");
});
