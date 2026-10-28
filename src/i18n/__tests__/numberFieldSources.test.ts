type Entry={name:string;isDirectory:()=>boolean;isFile:()=>boolean};
const {readdirSync,readFileSync}=jest.requireActual('fs') as {
  readdirSync:(dir:string,options:{withFileTypes:true})=>Entry[];
  readFileSync:(file:string,encoding:'utf8')=>string;
};
const {join,relative}=jest.requireActual('path') as {
  join:(...parts:string[])=>string;
  relative:(from:string,to:string)=>string;
};

/**
 * Source guard: a stored or computed number reaching a Field as `String(n)` or
 * `n.toFixed(d)` is how Eat -> Targets came to show "23.112000000000002".
 * Every number put into field text goes through formatEditableNumber instead.
 */
const appDir=join(process.cwd(),'app');
function ownerScreens(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.name==='dev')return [];
    const file=join(dir,entry.name);
    return entry.isDirectory()?ownerScreens(file):entry.isFile()&&file.endsWith('.tsx')?[file]:[];
  });
}
const atLine=(code:string,index:number)=>code.slice(0,index).split('\n').length;
test('owner-facing routes format field text with formatEditableNumber',()=>{
  const raw:string[]=[];
  for(const file of ownerScreens(appDir)){
    const code=readFileSync(file,'utf8'),fileName=relative(appDir,file).replace(/\\/g,'/');
    const prefills=/set[A-Z][A-Za-z]*\([^;\n]*(?:String\(|toFixed\()/g;
    for(const hit of code.matchAll(prefills))
      raw.push(fileName+':'+atLine(code,hit.index??0)+': '+(hit[0]??'').trim());
  }
  expect(raw).toEqual([]);
});
