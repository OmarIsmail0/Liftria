/** Open a CSV that another app shared or that Files asked Liftria to view.
 * The preview is the same draft the document picker builds. Nothing is saved here. */
import { translate, type AppLanguage } from '../../i18n';
import {
  csvFileTypeError, detectImportSource, ImportParseError, MAX_CSV_BYTES, parseImportCsv, readCsv,
  readFailureMessage, utf8Bytes, type Importer, type ParsedImport,
} from './importCsv';

export type SharedKind='text'|'url'|'audio'|'image'|'video'|'file';
export type SharedPiece={
 value:string;shareType:SharedKind;mimeType?:string|null;contentUri?:string|null;originalName?:string|null;
};
export type ImportDraftBody={parsed:ParsedImport|null;error:ImportParseError|null;source:Importer;fileName:string};
export type SharedPreview=
 | {ok:true;draft:ImportDraftBody;sourceUri:string|null;text:string}
 | {ok:false;message:string};

const FILE_URL=/^(content|file):/i;

/** Expo Router path for an incoming share or document open. Other links stay as they are. */
export function redirectIncomingPath(path:string):string{
 const value=path.trim();
 if(!value)return path;
 const fileUrl=fileUrlOf(value);
 if(fileUrl)return '/import/incoming?url='+encodeURIComponent(fileUrl);
 if(isExpoShareUrl(value))return '/import/incoming';
 return path;
}
function fileUrlOf(value:string):string|null{
 if(FILE_URL.test(value))return value;
 try{
  const url=new URL(value);
  const protocol=url.protocol.replace(/:$/,'').toLowerCase();
  if(protocol==='content'||protocol==='file')return value;
 }catch{/* Not a URL. */}
 return null;
}
function isExpoShareUrl(value:string):boolean{
 try{
  const url=new URL(value);
  if(url.protocol.replace(/:$/,'')!=='liftria')return false;
  const host=url.hostname.toLowerCase();
  const name=url.pathname.replace(/^\/+|\/+$/g,'').toLowerCase();
  return host==='expo-sharing'||name==='expo-sharing';
 }catch{
  return /(^|\/)expo-sharing\/?$/.test(value);
 }
}
export function looksLikeWorkoutCsv(text:string):boolean{
 const sample=text.replace(/^\uFEFF/,'').trim();
 if(!sample.includes(',')&&!sample.includes(';'))return false;
 const header=sample.split(/\r?\n/,1)[0]??'';
 return /title|date|exercise|start_time|reps|workout/i.test(header);
}
function nameFromUri(uri:string):string{
 const cut=(uri.split('?')[0]??uri);
 const name=cut.slice(cut.lastIndexOf('/')+1);
 try{return decodeURIComponent(name)||'import.csv';}catch{return name||'import.csv';}
}
/** text/csv is reported as share type "text" even when the value is a content URI. */
function pieceUri(piece:SharedPiece):string|null{
 if(piece.contentUri)return piece.contentUri;
 if(FILE_URL.test(piece.value.trim()))return piece.value.trim();
 return null;
}
/** Read the shared bytes. A link, a photo, or an empty share gets its own sentence. */
export async function readSharedImport(input:{
 url:string|null;language:AppLanguage;payloads:SharedPiece[];
 readText:(uri:string)=>Promise<string>;
}):Promise<{ok:true;text:string;fileName:string;mimeType:string|null;sourceUri:string|null}|{ok:false;message:string}>{
 const {language}=input;
 const direct=fileUrlOf(input.url??'');
 if(direct)return readUri(direct,nameFromUri(direct),null,input);
 const file=input.payloads.find(piece=>piece.shareType!=='image'&&piece.shareType!=='video'&&
  piece.shareType!=='audio'&&piece.shareType!=='url'&&pieceUri(piece));
 if(file){
  const uri=pieceUri(file)!;
  return readUri(uri,file.originalName||nameFromUri(file.value||uri),file.mimeType??null,input);
 }
 const text=input.payloads.find(piece=>piece.shareType==='text'&&looksLikeWorkoutCsv(piece.value));
 if(text)return {ok:true,text:text.value,fileName:text.originalName||'shared.csv',mimeType:text.mimeType??'text/plain',sourceUri:null};
 const first=input.payloads[0];
 if(first?.shareType==='url')return {ok:false,message:translate(language,'im1.sharedLink')};
 if(first&&(first.shareType==='image'||first.shareType==='video'||first.shareType==='audio'))
  return {ok:false,message:translate(language,'im1.wrongFile')};
 if(first?.shareType==='text')return {ok:false,message:translate(language,'im1.sharedText')};
 return {ok:false,message:translate(language,'im1.noSharedFile')};
}
async function readUri(uri:string,fileName:string,mimeType:string|null,input:{
 language:AppLanguage;readText:(uri:string)=>Promise<string>;
}):Promise<{ok:true;text:string;fileName:string;mimeType:string|null;sourceUri:string|null}|{ok:false;message:string}>{
 const name=fileName.trim()||'import.csv';
 const wrong=csvFileTypeError(name,'csv',input.language,mimeType);
 if(wrong)return {ok:false,message:wrong};
 try{
  const text=await input.readText(uri);
  if(utf8Bytes(text).length>MAX_CSV_BYTES)return {ok:false,message:translate(input.language,'im1.tooLarge')};
  return {ok:true,text,fileName:name,mimeType,sourceUri:uri};
 }catch(reason){
  return {ok:false,message:readFailureMessage(reason,input.language)};
 }
}
/** The same draft the picker stores: detected source, or the parse error for the preview. */
export function draftFromSharedText(input:{
 text:string;fileName:string;language:AppLanguage;source?:Importer|null;
}):ImportDraftBody{
 const fileName=input.fileName.trim()||'import.csv';
 let source=input.source??null;
 if(!source){
  try{source=detectImportSource(readCsv(input.text).columns);}
  catch(error){
   if(error instanceof ImportParseError)return {parsed:null,error,source:'csv',fileName};
   source='csv';
  }
 }
 try{
  return {parsed:parseImportCsv(source,fileName,input.text,input.language),error:null,source,fileName};
 }catch(error){
  if(error instanceof ImportParseError)return {parsed:null,error,source,fileName};
  throw error;
 }
}
/** Shared file in, the preview draft out. `readText` stands in for the cache copy. */
export async function previewDraftFromShare(input:{
 url:string|null;language:AppLanguage;payloads:SharedPiece[];
 readText:(uri:string)=>Promise<string>;source?:Importer|null;
}):Promise<SharedPreview>{
 const read=await readSharedImport(input);
 if(!read.ok)return read;
 return {ok:true,sourceUri:read.sourceUri,text:read.text,draft:draftFromSharedText({
  text:read.text,fileName:read.fileName,language:input.language,source:input.source,
 })};
}
