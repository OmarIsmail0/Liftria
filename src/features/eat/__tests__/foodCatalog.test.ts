import {bundledFoods,dayOffset,entryName,foodName,localDay,macroMismatch,mealAtTime,
  normalizeFoodSearch,searchFoods,snapshot,type Food} from '../foodCatalog';
const food=(id:string,name:string,nameAr:string|null,aliases:string[]=[],source:'egypt'|'usda'='egypt'):Food=>({
  id,name,nameAr,aliases,source,estimate:source==='egypt',kcal:100,protein:10,carbs:20,fat:1,
  fiber:0,portions:[{labelEn:'plate',labelAr:'طبق',grams:100}],
});
test('Arabic diacritics, alef, ya and ta marbuta normalize in local search',()=>{
  expect(normalizeFoodSearch('إِفْطَار')).toBe('افطار');
  expect(normalizeFoodSearch('فَتَّة')).toBe('فته');
  expect(normalizeFoodSearch('على')).toBe('علي');
});
test('offline aliases, prefix and fuzzy search with Egyptian tie preference',()=>{
  const foods=[food('usda:1','Koshari',null,[],'usda'),
    food('egypt:koshari','Koshari','كشري',['koshary','koshari']),food('egypt:fatta','Fatta','فتّة')];
  expect(searchFoods(foods,'كشري')[0]?.id).toBe('egypt:koshari');
  expect(searchFoods(foods,'koshari')[0]?.source).toBe('egypt');
  expect(searchFoods(foods,'koshary')[0]?.id).toBe('egypt:koshari');
  expect(searchFoods(foods,'فَتَّه')[0]?.id).toBe('egypt:fatta');
  expect(searchFoods(foods,'koshri').length).toBeGreaterThan(0);
  expect(foodName(foods[1]!, 'ar')).toBe('كشري');
});
test('snapshots round kcal only; quick adds can omit macros',()=>{
  expect(snapshot(food('e','Fatta','فتة'),155)).toEqual({kcal:155,protein:15.5,carbs:31,fat:1.55});
  expect(()=>snapshot(food('e','Fatta','فتة'),0)).toThrow();
  expect(macroMismatch(100,10,10,1)).toBe(false);
  expect(macroMismatch(100,0,0,0)).toBe(true);
});
test('local days and time windows cross boundaries without UTC-derived day',()=>{
  expect(dayOffset('2026-10-26',-1)).toBe('2026-10-25');
  expect(localDay(new Date(2026,9,26,23,50))).toBe('2026-10-26');
  expect(mealAtTime(new Date(2026,9,26,10,29))).toBe('breakfast');
  expect(mealAtTime(new Date(2026,9,26,10,30))).toBe('lunch');
  expect(mealAtTime(new Date(2026,9,26,15,0))).toBe('snacks');
  expect(mealAtTime(new Date(2026,9,26,17,0))).toBe('dinner');
  expect(mealAtTime(new Date(2026,9,26,4,0),true,'17:30')).toBe('breakfast');
  expect(mealAtTime(new Date(2026,9,26,15,0),true,'17:30')).toBe('dinner');
  expect(mealAtTime(new Date(2026,9,26,20,0),true,'17:30')).toBe('snacks');
});
test('real packs have unique stable ids and finite nonnegative nutrition',()=>{
  const foods=bundledFoods();
  expect(foods.length).toBe(8200);
  expect(new Set(foods.map(f=>f.id)).size).toBe(foods.length);
  expect(foods.filter(f=>f.source==='egypt')).toHaveLength(29);
  for(const f of foods){
    expect(f.id).toMatch(/^(usda:|egypt:)/);
    for(const n of [f.kcal,f.protein,f.carbs,f.fat])expect(Number.isFinite(n)).toBe(true); // USDA analytical values may be slightly negative
    expect(f.portions.every(p=>p.grams>0&&Number.isFinite(p.grams))).toBe(true);
  }
});

describe('search speed paths and diary names', () => {
  it('finds Egyptian dishes by alias and by a near-miss spelling', () => {
    const foods = bundledFoods();
    expect(searchFoods(foods, 'kushari')[0]?.id).toBe('egypt:koshari');
    expect(searchFoods(foods, 'كشري')[0]?.id).toBe('egypt:koshari');
  });
  it('skips typo matching when exact matches exist', () => {
    const results = searchFoods(bundledFoods(), 'kosh');
    expect(results.every(food => /kosh/i.test([food.name, ...food.aliases].join(' ')))).toBe(true);
  });
  it('shows a bundled food in Arabic and keeps other names as logged', () => {
    expect(entryName({ foodId: 'egypt:koshari', name: 'Koshari' }, 'ar')).not.toBe('Koshari');
    expect(entryName({ foodId: 'egypt:koshari', name: 'Koshari' }, 'en')).toBe('Koshari');
    expect(entryName({ foodId: null, name: 'Snack' }, 'ar')).toBe('Snack');
  });
});
