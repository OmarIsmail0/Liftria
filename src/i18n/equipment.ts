import type { AppLanguage } from './index';

/** Pack vocabulary is English data; translate only known equipment types in display copy. */
const ARABIC_EQUIPMENT: Record<string,string> = {
  'body only':'وزن الجسم', bodyweight:'وزن الجسم', barbell:'بار حديد',
  dumbbell:'دمبل', dumbbells:'دمبل', cable:'كابل',
  machine:'جهاز', bands:'أشرطة مقاومة', 'resistance band':'شريط مقاومة',
  kettlebells:'كيتل بيل', kettlebell:'كيتل بيل',
  'medicine ball':'كرة طبية', 'exercise ball':'كرة تمرين',
  'foam roll':'أسطوانة تدليك', 'e-z curl bar':'بار EZ',
  other:'معدات أخرى',
};
export function equipmentLabel(language:AppLanguage, raw:string|null, fallback:string):string {
  if(raw===null || raw.trim()==='')return fallback;
  if(language==='en')return raw.trim().toLocaleLowerCase('en')==='body only'?'Bodyweight':
    raw.trim().replace(/\b[a-z]/g,character=>character.toUpperCase());
  return ARABIC_EQUIPMENT[raw.trim().toLocaleLowerCase('en')]??raw;
}
