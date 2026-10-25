import { isLocalDate, scheduledTemplate, weekDays } from '../weekPlan';
import type { Plan, Template } from '../../../services/database/gymRepositories';

const templates = [{ id: 'A',name:'Upper A',restSec:90,notes:null,exercises:[] },
                   { id: 'B',name:'Lower B',restSec:90,notes:null,exercises:[] }] satisfies Template[];
test('weekly plan selects weekday, rest days never fabricate a template', () => {
  const plan:Plan = {id:'p',name:'Four days',type:'weekly',schedule:{Sun:null,Mon:'A',Wed:'B'},
    nextIndex:0,active:true};
  expect(scheduledTemplate(plan,templates,new Date(2026,9,26))?.id).toBe('A');
  expect(scheduledTemplate(plan,templates,new Date(2026,9,27))).toBeNull();
  expect(scheduledTemplate({...plan,active:false},templates,new Date(2026,9,26))).toBeNull();
});
test('rotation advances only when explicitly changed by persisted workflow', () => {
  const plan:Plan = {id:'p',name:'Rotation',type:'rotation',schedule:['A','B'],
    nextIndex:1,active:true};
  expect(scheduledTemplate(plan,templates,new Date(2026,9,27))?.id).toBe('B');
  expect(scheduledTemplate({...plan,nextIndex:2},templates,new Date(2026,9,27))?.id).toBe('A');
});
test('week strip uses local calendar and flags only the current day', () => {
  const days=weekDays(new Date(2026,9,25));
  expect(days).toHaveLength(7);
  expect(days.filter(day=>day.today)).toHaveLength(1);
  expect(days[0]?.label).toBe('Sun');
  expect(isLocalDate(new Date(2026,9,25,13).toISOString(),new Date(2026,9,25))).toBe(true);
});
