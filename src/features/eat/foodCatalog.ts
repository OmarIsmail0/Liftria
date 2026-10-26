import usdaRows from '../../../assets/data/foods/usda-foods.json';
import egyptRows from '../../../assets/data/foods/egypt-foods.json';
import type { AppLanguage } from '../../i18n';

export type MealKey='breakfast'|'lunch'|'dinner'|'snacks';
export const MEALS: readonly MealKey[]=['breakfast','lunch','dinner','snacks'];
export type FoodSource='usda'|'egypt'|'custom'|'hiku';
export type Portion={labelEn:string;labelAr:string|null;grams:number};
export type Food={
  id:string; name:string;nameAr:string|null;aliases:string[];
  source:FoodSource;estimate:boolean; kcal:number;
  protein:number|null;carbs:number|null;fat:number|null;fiber:number|null;
  portions:Portion[];
};
type PackRow={
  id:string;name:string;name_ar?:string;aliases?:string[];source:string;estimate?:boolean;
  kcal:number;protein:number;carbs:number;fat:number;fiber:number|null;
  portions:(readonly [string,number]|readonly [string,string,number])[];
};
export function unpackFood(row:PackRow):Food {
  return {id:row.id,name:row.name,nameAr:row.name_ar??null,
    aliases:row.aliases??[],source:row.source==='egypt'?'egypt':'usda',
    estimate:row.estimate===true,kcal:row.kcal,protein:row.protein,carbs:row.carbs,
    fat:row.fat,fiber:row.fiber,portions:row.portions.map(p=>(
      typeof p[1]==='number'?{labelEn:p[0],labelAr:null,grams:p[1]}:
        {labelEn:p[0],labelAr:p[1],grams:p[2]})),
  };
}
let cache:Food[]|null=null;
export function bundledFoods():Food[] {
  if(!cache)cache=[...(egyptRows as PackRow[]),...(usdaRows as PackRow[])].map(unpackFood);
  return cache;
}
export function foodName(food:Food,language:AppLanguage):string {
  return language==='ar'?(food.nameAr??food.name):food.name;
}
/** Arabic normalization preserves meaningful letters while unifying common spellings. */
export function normalizeFoodSearch(query:string):string {
  return query.toLowerCase().normalize('NFKD')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/[̀-ͯ]/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function closeWord(a:string,b:string):boolean{
  if(Math.abs(a.length-b.length)>2||a.length<3)return false;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++)next.push(Math.min(
      (next[j-1]??100)+1,(previous[j]??100)+1,
      (previous[j-1]??100)+(a[i-1]===b[j-1]?0:1)));
    previous=next;
  }
  return (previous[b.length]??100)<= (a.length>5?2:1);
}
export function searchFoods(foods:readonly Food[],text:string,limit=40):Food[]{
  const query=normalizeFoodSearch(text);
  if(!query)return foods.slice(0,limit);
  const ranked: {food:Food;rank:number}[]=[];
  for(const food of foods){
    const names=[food.name,food.nameAr??'',...food.aliases].map(normalizeFoodSearch).filter(Boolean);
    let score=99;
    for(const name of names){
      if(name===query)score=Math.min(score,0);
      else if(name.startsWith(query))score=Math.min(score,1);
      else if(name.split(' ').some(word=>word.startsWith(query)))score=Math.min(score,2);
      else if(name.includes(query))score=Math.min(score,3);
      else if(name.split(' ').some(word=>closeWord(word,query)))score=Math.min(score,4);
    }
    if(score<99)ranked.push({food,rank:score});
  }
  ranked.sort((a,b)=>a.rank-b.rank ||
    Number(b.food.source==='egypt')-Number(a.food.source==='egypt') ||
    a.food.name.localeCompare(b.food.name,'en') || a.food.id.localeCompare(b.food.id));
  return ranked.slice(0,limit).map(row=>row.food);
}
export function localDay(date:Date):string{
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0');
  return year+'-'+month+'-'+String(date.getDate()).padStart(2,'0');
}
export function dayOffset(day:string,offset:number):string{
  const [year,month,date]=day.split('-').map(Number);
  const shifted=new Date(year??2000,(month??1)-1,(date??1)+offset,12);
  return localDay(shifted);
}
export function mealAtTime(date:Date):MealKey{
  const minute=date.getHours()*60+date.getMinutes();
  return minute<630?'breakfast':minute<900?'lunch':minute<1020?'snacks':'dinner';
}
export type Nutrition={kcal:number;protein:number|null;carbs:number|null;fat:number|null};
export function snapshot(food:Food,grams:number):Nutrition {
  if(!Number.isFinite(grams)||grams<=0||grams>2000)throw new Error('Invalid food portion');
  const multiply=(value:number|null)=>value===null?null:value*grams/100;
  return {kcal:Math.round(food.kcal*grams/100),
    protein:multiply(food.protein),carbs:multiply(food.carbs),fat:multiply(food.fat)};
}
export function macroMismatch(kcal:number,protein:number,carbs:number,fat:number):boolean{
  if(![kcal,protein,carbs,fat].every(Number.isFinite)||kcal<0)return true;
  const calculated=4*protein+4*carbs+9*fat;
  return Math.abs(kcal-calculated)>0.2*Math.max(1,kcal);
}
