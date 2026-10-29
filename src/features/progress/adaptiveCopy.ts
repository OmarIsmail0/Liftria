import {pluralForm,type AppLanguage,type TranslationKey,type TranslationParams} from '../../i18n';

type Translate=(key:TranslationKey,params?:TranslationParams)=>string;

type AdaptiveCountKey=
 'adaptive.count.needLoggedDays'|
 'adaptive.count.needWeighIns'|
 'adaptive.count.needHistoryDays'|
 'adaptive.count.loggedDays'|
 'adaptive.count.weighInDays'|
 'adaptive.count.betweenWeighInsDays'|
 'nutrients.reportedDays';

function countPhrase(t:Translate,language:AppLanguage,key:AdaptiveCountKey,count:number):string{
 return t((`${key}.${pluralForm(language,count)}`) as TranslationKey,{count});
}

export function adaptiveNeedDataCopy(t:Translate,language:AppLanguage,logged:number,weighIns:number,historyDays:number):string{
 return t('adaptive.needData',{
  logged:countPhrase(t,language,'adaptive.count.needLoggedDays',logged),
  weights:countPhrase(t,language,'adaptive.count.needWeighIns',weighIns),
  days:countPhrase(t,language,'adaptive.count.needHistoryDays',historyDays),
 });
}

export function adaptiveBurnMethodCopy(t:Translate,language:AppLanguage,logged:number,weighInDays:number,elapsedDays:number):string{
 return t('adaptive.burnMethod',{
  logged:countPhrase(t,language,'adaptive.count.loggedDays',logged),
  weights:countPhrase(t,language,'adaptive.count.weighInDays',weighInDays),
  days:countPhrase(t,language,'adaptive.count.betweenWeighInsDays',elapsedDays),
 });
}

export function nutrientsReportedDaysCopy(t:Translate,language:AppLanguage,days:number):string{
 return countPhrase(t,language,'nutrients.reportedDays',days);
}
