import ts from 'typescript';

type Entry={name:string;isDirectory:()=>boolean;isFile:()=>boolean};
const {readdirSync,readFileSync}=jest.requireActual('fs') as {
  readdirSync:(dir:string,options:{withFileTypes:true})=>Entry[];
  readFileSync:(file:string,encoding:'utf8')=>string;
};
const {join,relative}=jest.requireActual('path') as {
  join:(...parts:string[])=>string;
  relative:(from:string,to:string)=>string;
};

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

/**
 * Spoken labels and mixed sentences live in src/features and in concatenations
 * (`'Resume '+name`, `Enter ${label}`, `{done} of {total} sets`). The literal-prop
 * scan above never saw them. dev screens and src/design stay out of this guard.
 */
const featureRoots=[appDir,join(process.cwd(),'src','features')];
const watchedProps=new Set(['accessibilityLabel','label','title','subtitle','description','placeholder','detail']);
const unitWords=new Set(['kg','lb']);
function featureScreens(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.name==='dev'||entry.name==='__tests__')return [];
    const file=join(dir,entry.name);
    return entry.isDirectory()?featureScreens(file):entry.isFile()&&file.endsWith('.tsx')?[file]:[];
  });
}
function latinWords(value:string):string[]{
  return value.match(/[A-Za-z]+/g)??[];
}
function allowedCopy(value:string):boolean{
  const trimmed=value.trim();
  if(!trimmed||!/[A-Za-z]/.test(trimmed)||tokens.has(trimmed))return true;
  const words=latinWords(trimmed);
  return words.length>0&&words.every(word=>unitWords.has(word));
}
function languagePolarity(expr:ts.Expression):'en-true'|'en-false'|null{
  if(!ts.isBinaryExpression(expr))return null;
  const op=expr.operatorToken.kind;
  const eq=op===ts.SyntaxKind.EqualsEqualsEqualsToken||op===ts.SyntaxKind.EqualsEqualsToken;
  const ne=op===ts.SyntaxKind.ExclamationEqualsEqualsToken||op===ts.SyntaxKind.ExclamationEqualsToken;
  if(!eq&&!ne)return null;
  const sides=[expr.left,expr.right];
  const lang=sides.find(side=>ts.isIdentifier(side)&&side.text==='language');
  const lit=sides.find((side):side is ts.StringLiteral=>ts.isStringLiteral(side)&&(side.text==='en'||side.text==='ar'));
  if(!lang||!lit)return null;
  const wantsEnglish=lit.text==='en';
  if(eq)return wantsEnglish?'en-true':'en-false';
  return wantsEnglish?'en-false':'en-true';
}
type Piece={text:string;node:ts.Node};
function displayedLiterals(node:ts.Node):Piece[]{
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return [{text:node.text,node}];
  if(ts.isTemplateExpression(node)){
    const parts:Piece[]=[{text:node.head.text,node:node.head}];
    for(const span of node.templateSpans){
      parts.push(...displayedLiterals(span.expression));
      parts.push({text:span.literal.text,node:span.literal});
    }
    return parts;
  }
  if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||
    ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node))return displayedLiterals(node.expression);
  if(ts.isBinaryExpression(node)){
    const op=node.operatorToken.kind;
    if(op===ts.SyntaxKind.PlusToken||op===ts.SyntaxKind.AmpersandAmpersandToken||
      op===ts.SyntaxKind.BarBarToken||op===ts.SyntaxKind.QuestionQuestionToken)
      return [...displayedLiterals(node.left),...displayedLiterals(node.right)];
    return [];
  }
  if(ts.isConditionalExpression(node)){
    const polarity=languagePolarity(node.condition);
    if(polarity==='en-true')return displayedLiterals(node.whenFalse);
    if(polarity==='en-false')return displayedLiterals(node.whenTrue);
    return [...displayedLiterals(node.whenTrue),...displayedLiterals(node.whenFalse)];
  }
  return [];
}
function displayedIdentifiers(node:ts.Node,params:Set<string>,out:Set<string>):void{
  if(ts.isIdentifier(node)){if(params.has(node.text))out.add(node.text);return;}
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return;
  if(ts.isTemplateExpression(node)){for(const span of node.templateSpans)displayedIdentifiers(span.expression,params,out);return;}
  if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||
    ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node)){displayedIdentifiers(node.expression,params,out);return;}
  if(ts.isBinaryExpression(node)){
    const op=node.operatorToken.kind;
    if(op===ts.SyntaxKind.PlusToken||op===ts.SyntaxKind.AmpersandAmpersandToken||
      op===ts.SyntaxKind.BarBarToken||op===ts.SyntaxKind.QuestionQuestionToken){
      displayedIdentifiers(node.left,params,out);
      displayedIdentifiers(node.right,params,out);
    }
    return;
  }
  if(ts.isConditionalExpression(node)){
    const polarity=languagePolarity(node.condition);
    if(polarity==='en-true')displayedIdentifiers(node.whenFalse,params,out);
    else if(polarity==='en-false')displayedIdentifiers(node.whenTrue,params,out);
    else{displayedIdentifiers(node.whenTrue,params,out);displayedIdentifiers(node.whenFalse,params,out);}
  }
}
function attributeExpression(attr:ts.JsxAttribute):ts.Expression|null{
  const init=attr.initializer;
  if(!init)return null;
  if(ts.isStringLiteral(init))return init;
  if(ts.isJsxExpression(init))return init.expression??null;
  return null;
}
function isJsxChild(node:ts.Node):boolean{
  return !!node.parent&&(ts.isJsxElement(node.parent)||ts.isJsxFragment(node.parent));
}
function functionName(node:ts.Node):string|null{
  if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node)||ts.isFunctionExpression(node))&&
    node.name&&ts.isIdentifier(node.name))return node.name.text;
  if((ts.isFunctionExpression(node)||ts.isArrowFunction(node))&&ts.isVariableDeclaration(node.parent)&&
    ts.isIdentifier(node.parent.name))return node.parent.name.text;
  return null;
}
type CallableWithBody=ts.FunctionDeclaration|ts.FunctionExpression|ts.ArrowFunction|ts.MethodDeclaration|ts.ConstructorDeclaration;
function displayedParamIndexes(fn:CallableWithBody):Set<number>{
  const names=fn.parameters.map(param=>ts.isIdentifier(param.name)?param.name.text:'');
  const params=new Set(names.filter(name=>name.length>0));
  const displayed=new Set<string>();
  const scan=(node:ts.Node):void=>{
    if(node!==fn&&ts.isFunctionLike(node))return;
    if(ts.isJsxAttribute(node)&&ts.isIdentifier(node.name)&&watchedProps.has(node.name.text)){
      const expr=attributeExpression(node);
      if(expr)displayedIdentifiers(expr,params,displayed);
    }
    if(ts.isJsxExpression(node)&&node.expression&&isJsxChild(node))
      displayedIdentifiers(node.expression,params,displayed);
    ts.forEachChild(node,scan);
  };
  if(fn.body)scan(fn.body);
  const indexes=new Set<number>();
  names.forEach((name,index)=>{if(displayed.has(name))indexes.add(index);});
  return indexes;
}
function lineOf(source:ts.SourceFile,node:ts.Node):number{
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
}
test('feature and route copy has no English in screen text or spoken labels',()=>{
  const unlocalized:string[]=[];
  for(const file of featureRoots.flatMap(featureScreens)){
    const code=readFileSync(file,'utf8');
    const source=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const fileName=relative(process.cwd(),file).replace(/\\/g,'/');
    const functions=new Map<string,Set<number>>();
    const collect=(node:ts.Node):void=>{
      if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)||
        ts.isMethodDeclaration(node)||ts.isConstructorDeclaration(node))&&node.body){
        const name=functionName(node);
        if(name)functions.set(name,displayedParamIndexes(node));
      }
      ts.forEachChild(node,collect);
    };
    collect(source);
    const push=(node:ts.Node,text:string)=>{
      if(allowedCopy(text))return;
      unlocalized.push(fileName+':'+lineOf(source,node)+': '+text.replace(/\s+/g,' ').trim());
    };
    const visit=(node:ts.Node):void=>{
      if(ts.isJsxAttribute(node)&&ts.isIdentifier(node.name)&&watchedProps.has(node.name.text)){
        const expr=attributeExpression(node);
        if(expr)for(const piece of displayedLiterals(expr))push(piece.node,piece.text);
      }
      if(ts.isJsxText(node))push(node,node.getText());
      if(ts.isJsxExpression(node)&&node.expression&&isJsxChild(node))
        for(const piece of displayedLiterals(node.expression))push(piece.node,piece.text);
      if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){
        const indexes=functions.get(node.expression.text);
        if(indexes)node.arguments.forEach((arg,index)=>{
          if(!indexes.has(index))return;
          for(const piece of displayedLiterals(arg))push(piece.node,piece.text);
        });
      }
      ts.forEachChild(node,visit);
    };
    visit(source);
  }
  expect(unlocalized).toEqual([]);
});
