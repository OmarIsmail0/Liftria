/** Owner-approved model choice. USD per million tokens, Anthropic global API.
 * Verified 2026-10-26: https://platform.claude.com/docs/en/about-claude/pricing
 * High-context Haiku pricing applies to the entire request above 100k input tokens.
 */
export const HIKU_PRICE_SOURCE='https://platform.claude.com/docs/en/about-claude/pricing';
export const HIKU_PRICE_VERSION='2026-10-26';
export const HIKU_MODELS=[
 {id:'claude-haiku-5-5',nameEn:'Fast and low cost',nameAr:'سريع وبتكلفة أقل',
  inputPerMillion:0.10,outputPerMillion:0.50,
  longInputPerMillion:0.50,longOutputPerMillion:2.50},
 {id:'claude-sonnet-5-5',nameEn:'More accurate',nameAr:'دقة أعلى',
  inputPerMillion:2,outputPerMillion:10,
  longInputPerMillion:2,longOutputPerMillion:10},
] as const;
export type HikuModelId=typeof HIKU_MODELS[number]['id'];
export const DEFAULT_HIKU_MODEL:HikuModelId='claude-haiku-5-5';
export function hikuModel(id:HikuModelId){return HIKU_MODELS.find(m=>m.id===id)!;}
export type HikuCostBand='unknown'|'less-than-cent'|'amount';
export function estimateHikuCostUsd(model:HikuModelId,inputTokens:number,outputTokens:number):number|null{
 if(!Number.isSafeInteger(inputTokens)||inputTokens<0||
    !Number.isSafeInteger(outputTokens)||outputTokens<0)return null;
 const rate=hikuModel(model),long=model==='claude-haiku-5-5'&&inputTokens>100000;
 return (inputTokens*(long?rate.longInputPerMillion:rate.inputPerMillion)+
   outputTokens*(long?rate.longOutputPerMillion:rate.outputPerMillion))/1000000;
}
export function classifyHikuCostUsd(cost:number|null):HikuCostBand{
 if(cost===null||!Number.isFinite(cost)||cost<0)return 'unknown';
 if(cost>0&&cost<0.01)return 'less-than-cent';
 return 'amount';
}
export function formatHikuUsd(cost:number):string{
 return '$'+cost.toFixed(2);
}
