import type { Plan, Template } from '../../services/database/gymRepositories';

export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;
export function scheduledTemplate(plan: Plan | null, templates: Template[], day: Date): Template | null {
  if (!plan || !plan.active) return null;
  const schedule = plan.schedule;
  const key = DAYS[day.getDay()];
  const id = plan.type === 'rotation' && Array.isArray(schedule)
    ? schedule[plan.nextIndex % (schedule.length || 1)]
    : !Array.isArray(schedule) ? (schedule[key] ?? schedule[String(day.getDay())]) : null;
  return templates.find(template => template.id === id) ?? null;
}
export function weekDays(today: Date): {date:Date; label:string; today:boolean}[] {
  const date = new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const first = new Date(date);
  first.setDate(date.getDate() - date.getDay());
  return DAYS.map((label,index) => {
    const item = new Date(first);item.setDate(first.getDate()+index);
    return {date:item,label,today:item.toDateString()===date.toDateString()};
  });
}
export function isLocalDate(value: string, date: Date): boolean {
  const candidate = new Date(value);
  return !Number.isNaN(candidate.valueOf()) && candidate.toDateString() === date.toDateString();
}
