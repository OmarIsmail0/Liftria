import {translate,type AppLanguage,type TranslationKey,type TranslationParams} from '../../../i18n';
import {adaptiveBurnMethodCopy,adaptiveNeedDataCopy,nutrientsReportedDaysCopy} from '../adaptiveCopy';

const translator=(language:AppLanguage)=>(key:TranslationKey,params?:TranslationParams)=>
 translate(language,key,params);

test('adaptive need-data copy pluralizes English counts',()=>{
 const text=adaptiveNeedDataCopy(translator('en'),'en',0,1,3);
 expect(text).toBe('Needs 0 more logged days / 1 more weigh-in / 3 more days of weight history before an estimate is shown.');
});

test('adaptive burn-card Arabic counts use the singular noun for 11 and above',()=>{
 const text=adaptiveNeedDataCopy(translator('ar'),'ar',14,14,14);
 expect(text).toBe('يلزم 14 يومًا إضافيًا لتسجيل الطعام / 14 قياسًا إضافيًا للوزن / 14 يومًا من سجل الوزن قبل إظهار التقدير.');
});

test('burn method copy pluralizes each counted phrase independently',()=>{
 const text=adaptiveBurnMethodCopy(translator('en'),'en',1,2,1);
 expect(text).toBe('1 logged day · 2 weigh-in days · 1 day between weigh-ins');
});

test('reported-days copy follows Arabic many-form wording',()=>{
 expect(nutrientsReportedDaysCopy(translator('ar'),'ar',11)).toBe('11 يومًا مبلّغًا عنه');
});
