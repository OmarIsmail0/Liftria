import type { ImportParseError, ParsedImport } from './importCsv';
import type { ImportOutcome } from './importRepository';
import type { ImportPlan } from './importPlanning';
type Draft={parsed:ParsedImport|null;error:ImportParseError|null;source:string;fileName:string};
let draft:Draft|null=null;
let pending:ImportPlan|null=null;
let outcome:{ok:true;result:ImportOutcome}|{ok:false;reason:string}|null=null;
/** Transient RAM only: no raw CSV bytes, no preview sets written to SQLite. */
export const setImportDraft=(next:Draft)=>{draft=next;pending=null;outcome=null;};
export const getImportDraft=()=>draft;
export const setPendingImport=(plan:ImportPlan)=>{pending=plan;outcome=null;};
export const peekPendingImport=()=>pending;
export const takePendingImport=()=>{const value=pending;pending=null;return value;};
export const setImportOutcome=(value:typeof outcome)=>{outcome=value;};
export const getImportOutcome=()=>outcome;
export const clearImportDraft=()=>{draft=null;pending=null;outcome=null;};
