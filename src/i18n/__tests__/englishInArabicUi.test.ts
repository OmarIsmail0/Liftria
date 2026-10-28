import { en } from '../en';
import { COPY_PROPS, scanSource, stripAllowed } from './englishCopyScanner';

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
 * Source guard for "no English in the Arabic UI". The older screenLiteralCopy test only reads
 * `app/` and literal props; this one also reads `src/features/**` and the English hidden in
 * concatenation, template literals, JSX text and conditional branches.
 */
const roots=['app',join('src','features')].map(dir=>join(process.cwd(),dir));

/**
 * Real tokens that stay Latin in Arabic text (`kg` and `lb` are the app's weight-unit convention).
 * Do not add sentences or words here: a missing translation belongs in en.ts / ar.ts.
 */
const allowed=['kg','lb','sk-ant-…','DELETE','Hevy','Strong','FitNotes'];
const translationKeys=new Set<string>(Object.keys(en));

/**
 * Out of scope for this guard, and why:
 * - dev and test files: emulator routes and developer-only diagnostics, never shown to users.
 * - the Health screens and their feature module: owned separately, not part of this change.
 */
const excluded=[
  /(^|\/)dev\//,/(^|\/)__tests__\//,
  /^app\/\(tabs\)\/progress\/health[^/]*\.tsx$/,
  /^src\/features\/health\//,
  /^src\/features\/diagnostics\//,
];

function sourceFiles(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const file=join(dir,entry.name);
    if(entry.isDirectory())return sourceFiles(file);
    return entry.isFile()&&/\.tsx?$/.test(entry.name)&&!entry.name.endsWith('.d.ts')?[file]:[];
  });
}
const scanned=roots.flatMap(sourceFiles)
  .map(file=>({file,name:relative(process.cwd(),file).replace(/\\/g,'/')}))
  .filter(({name})=>!excluded.some(pattern=>pattern.test(name)));

test('the guard reads the app and the feature modules',()=>{
  const names=scanned.map(f=>f.name);
  expect(names).toContain('src/features/train/WorkoutMiniBar.tsx');
  expect(names).toContain('src/features/train/workoutData.ts');
  expect(names).toContain('app/(tabs)/today.tsx');
  expect(names.some(name=>name.includes('/dev/'))).toBe(false);
});

test('no English reaches the Arabic UI outside t()',()=>{
  const hits=scanned.flatMap(({file,name})=>
    scanSource(name,readFileSync(file,'utf8'),allowed,translationKeys)
      .map(hit=>name+':'+hit.line+' ['+hit.where+'] '+hit.text.replace(/\s+/g,' ')));
  expect(hits).toEqual([]);
});

describe('scanner',()=>{
  const scan=(code:string,file='sample.tsx')=>scanSource(file,code,allowed).map(hit=>hit.text);
  test('catches concatenation, templates and JSX text',()=>{
    expect(scan("const a=<P accessibilityLabel={'Resume '+title+', '+n+' sets logged'}/>;"))
      .toEqual(['Resume','sets logged']);
    expect(scan('const a=<P accessibilityLabel={`Enter ${label}`}/>;')).toEqual(['Enter']);
    expect(scan('const a=<T>{done} of {total} sets</T>;')).toEqual(['of','sets']);
    expect(scan('const a=<B label={ok?"Yes":"No"}/>;')).toEqual(['Yes','No']);
    expect(scan('const a=<T>Resume</T>;')).toEqual(['Resume']);
    expect(scan('const a=[{label:"Heavy",value:1}];')).toEqual(['Heavy']);
  });
  test('catches English returned by plain modules',()=>{
    expect(scan("export const f=(n:number)=>{return n?'Rest over':'No rest timer';};",'sample.ts'))
      .toEqual(['Rest over','No rest timer']);
    expect(scan("export function g(){const errors:Record<string,string>={};errors.age='Enter an age.';return errors;}",'sample.ts'))
      .toEqual(['Enter an age.']);
  });
  test('a literal that is an en.ts key is a key, not copy',()=>{
    const keys=new Set(['custom.weighted']);
    expect(scanSource('s.tsx',"const a=[{label:'custom.weighted'}];",allowed,keys)).toEqual([]);
    expect(scanSource('s.tsx',"const a=[{label:'custom.unknown'}];",allowed,keys).length).toBe(1);
  });
  test('ignores translated text, keys, units and inline bilingual pairs',()=>{
    expect(scan("const a=<B label={t('common.save')} accessibilityLabel={t('x',{n})} tone=\"secondary\"/>;")).toEqual([]);
    expect(scan('const a=<T>{n} kg · {m} lb</T>;')).toEqual([]);
    expect(scan('const a=<T>{n}{unit}</T>;')).toEqual([]);
    expect(scan("const a=<B label={ar?'حفظ':'Save'}/>;")).toEqual([]);
    expect(scan("export const f=()=>{return db.run('SELECT id FROM sets');};",'sample.ts')).toEqual([]);
    expect(scan("export const f=()=>{return 'granted';};",'sample.ts')).toEqual([]);
  });
  test('allow-list boundaries are ASCII-only, so Arabic neighbours do not hide English',()=>{
    expect(stripAllowed('80 kg',allowed).trim()).toBe('80');
    expect(stripAllowed('kgs',allowed)).toBe('kgs');
    expect(stripAllowed('٨٠kg',allowed).trim()).toBe('٨٠');
    expect(COPY_PROPS.has('accessibilityLabel')).toBe(true);
  });
});
