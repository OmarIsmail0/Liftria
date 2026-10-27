import {photoReviewReady} from '../draft';
import type {HikuItem,HikuReviewedItem} from '../mealSchema';
const makeItem=(name:string):HikuReviewedItem=>{
 const original:HikuItem={name_en:name,name_ar:name,grams:100,kcal:100,
  protein:3,carbs:20,fat:2,confidence:'check'};
 return {...original,original,nameDisplay:name,foodId:null,provenance:'hiku-estimate'};
};
test('photo review cannot Save until every remaining item is confirmed',()=>{
 const a=makeItem('Rice'),b=makeItem('Beans');
 expect(photoReviewReady([a,b],new Set())).toBe(false);
 expect(photoReviewReady([a,b],new Set([a.original]))).toBe(false);
 expect(photoReviewReady([a,b],new Set([a.original,b.original]))).toBe(true);
 expect(photoReviewReady([a],new Set([a.original]))).toBe(true);
 expect(photoReviewReady([],new Set([a.original,b.original]))).toBe(false);
});
test('changing grams keeps the original item identity for review',()=>{
 const a=makeItem('Rice');
 expect(photoReviewReady([{...a,grams:155}],new Set([a.original]))).toBe(true);
});
