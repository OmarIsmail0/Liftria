import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Source guard: runtime and dynamic expression translations still need visual checks. */
const appDir=join(process.cwd(),'app');
function ownerScreens(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.name==='dev')return [];
    const file=join(dir,entry.name);
    return entry.isDirectory()?ownerScreens(file):entry.isFile()&&file.endsWith('.tsx')?[file]:[];
  });
}
const tokens=new Set(['Hiku','L','DELETE','sk-ant-…','−15 s','+15 s','+30 s']);
const atLine=(code:string,index:number)=>code.slice(0,index).split('\n').length;
test('owner-facing routes do not use direct English JSX labels or Typography text',()=>{
  const unlocalized:string[]=[];
  for(const file of ownerScreens(appDir)){
    const code=readFileSync(file,'utf8'),fileName=relative(appDir,file).replace(/\\/g,'/');
    const props=/\b(?:accessibilityLabel|label|title|subtitle|description|placeholder)=["']([^"']+)["']/g;
    for(const hit of code.matchAll(props)){
      const value=hit[1]??'';
      if(/[A-Za-z]/.test(value)&&!tokens.has(value))
        unlocalized.push(fileName+':'+atLine(code,hit.index??0)+': '+value);
    }
    const children=/<(?:Typography|Text)\b[^>]*>\s*([A-Za-z][^<{]*)/g;
    for(const hit of code.matchAll(children)){
      const value=(hit[1]??'').trim();
      if(value&&!tokens.has(value))
        unlocalized.push(fileName+':'+atLine(code,hit.index??0)+': '+value);
    }
  }
  expect(unlocalized).toEqual([]);
});
