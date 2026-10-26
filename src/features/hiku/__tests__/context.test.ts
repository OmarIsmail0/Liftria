import {contextForSend} from '../context';
import {hikuTextPrompt} from '../client';
test('Hiku privacy defaults send no diary or training summary',()=>{
 const stored={today:'Food logged today: 500 kcal',training:'Training today: Upper A'};
 expect(contextForSend(stored,false,false)).toEqual({today:undefined,training:undefined});
 const prompt=hikuTextPrompt('أكلت كشري','ar',contextForSend(stored,false,false));
 expect(prompt).toContain('أكلت كشري');
 expect(prompt).not.toContain('500 kcal');
 expect(prompt).not.toContain('Upper A');
});
test('every opt-in snippet is in the same text shown in the preview',()=>{
 const stored={today:'Food logged today: 500 kcal',training:'Training today: Upper A'};
 const context=contextForSend(stored,true,false);
 const prompt=hikuTextPrompt('Koshari','en',context);
 expect(prompt).toContain(stored.today);
 expect(prompt).not.toContain(stored.training);
});
