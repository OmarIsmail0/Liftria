import {summarizeEntries,type DiaryEntry} from '../diaryRepository';
const entry=(meal:DiaryEntry['meal'],kcal:number,
  protein:number|null):DiaryEntry=>({id:meal+kcal,day:'2026-10-26',meal,foodId:null,
    name:'Test',grams:null,kcal,protein,carbs:protein,fat:protein,
    source:'quick',createdAt:'2026-10-26T10:00:00Z',editedAt:'2026-10-26T10:00:00Z'});
test('unlogged day is not zero calories; meal totals sum exact rounded item snapshots',()=>{
  const empty=summarizeEntries([]);
  expect(empty.logged).toBe(false);
  expect(empty.count).toBe(0);
  expect(empty.byMeal.breakfast.count).toBe(0);
  const day=summarizeEntries([entry('breakfast',133,2.5),entry('breakfast',202,3.5),
    entry('dinner',450,null)]);
  expect(day).toMatchObject({logged:true,count:3,kcal:785,protein:6,carbs:6,fat:6});
  expect(day.byMeal.breakfast).toEqual({count:2,kcal:335});
  expect(day.byMeal.lunch).toEqual({count:0,kcal:0});
});
test('quick add calories remain calories only with null macro fields',()=>{
  const value=summarizeEntries([entry('lunch',350,null)]);
  expect(value.kcal).toBe(350);
  expect(value.protein).toBeNull();
  expect(value.carbs).toBeNull();
  expect(value.fat).toBeNull();
});
