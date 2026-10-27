import {DB_SCHEMA_VERSION,dbOperation,type DbResult} from '../../services/database';

/** Every current application table, parents before dependents, without sqlite_sequence.
 * Update this manifest on every migration adding a table. Unknown tables forbid
 * export/restore instead of silently dropping data from a purported full backup. */
export const BACKUP_TABLES=[
 'app_settings','test_workout_sessions','test_workout_sets','test_nutrition_entries',
 'health_samples','health_aggregates','profile','targets','import_batches',
 'exercises','templates','template_exercises','plans','sessions','session_exercises',
 'sets','foods','food_portions','hiku_requests','diary_entries','favorite_foods',
 'saved_meals','saved_meal_items','weights','water_logs',
] as const;
export type BackupRow=Record<string,string|number|null>;
export type BackupData={format:'liftria-backup';formatVersion:1;schemaVersion:number;
 exportedAt:string;tables:Record<string,BackupRow[]>};
export type BackupPreview={schemaVersion:number;exportedAt:string;
 counts:Array<{table:string;count:number}>;total:number};
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=new Set<string>(BACKUP_TABLES);
const validCell=(v:unknown)=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v);
function validateTables(tables:Record<string,unknown>):Record<string,BackupRow[]>{
 const names=Object.keys(tables);
 if(names.length!==BACKUP_TABLES.length||names.some(x=>!keys.has(x)))throw new Error('Missing or unknown tables');
 const data:Record<string,BackupRow[]>={};
 for(const table of BACKUP_TABLES){
  const value=tables[table];
  if(!Array.isArray(value)||value.length>1000000)throw new Error('Invalid backup rows');
  data[table]=value.map(row=>{
   if(!obj(row)||Object.keys(row).some(k=>!/^[_a-z][_a-z0-9]*$/i.test(k) || !validCell(row[k])))
    throw new Error('Invalid backup cell');
   return row as BackupRow;
  });
 }
 return data;
}
export function parseBackup(raw:string):BackupData{
 if(raw.length>100*1024*1024)throw new Error('Backup is too large');
 const value:unknown=JSON.parse(raw);
 if(!obj(value)||value.format!=='liftria-backup'||value.formatVersion!==1||
   value.schemaVersion!==DB_SCHEMA_VERSION||typeof value.exportedAt!=='string'||
   !Number.isFinite(Date.parse(value.exportedAt))||!obj(value.tables))
  throw new Error('Unsupported backup format or schema version');
 return {format:'liftria-backup',formatVersion:1,schemaVersion:DB_SCHEMA_VERSION,
  exportedAt:value.exportedAt,tables:validateTables(value.tables)};
}
export function backupPreview(backup:BackupData):BackupPreview{
 const counts=BACKUP_TABLES.map(table=>({table,count:backup.tables[table]?.length??0}));
 return {schemaVersion:backup.schemaVersion,exportedAt:backup.exportedAt,
  counts,total:counts.reduce((sum,row)=>sum+row.count,0)};
}
export async function exportBackup():Promise<DbResult<BackupData>>{
 return dbOperation(async db=>{
  // Read all tables inside one transaction for a consistent snapshot.
  let data:Record<string,BackupRow[]>={};
  await db.withExclusiveTransactionAsync(async tx=>{
   const actual=(await tx.getAllAsync<{name:string}>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
    .map(x=>x.name).sort();
   if(actual.join('|')!==[...BACKUP_TABLES].sort().join('|'))
    throw new Error('Schema manifest mismatch');
   const tables:Record<string,BackupRow[]>={};
   for(const table of BACKUP_TABLES)
    tables[table]=await tx.getAllAsync<BackupRow>('SELECT * FROM '+table);
   data=tables;
  });
  return {format:'liftria-backup' as const,formatVersion:1 as const,
   schemaVersion:DB_SCHEMA_VERSION,exportedAt:new Date().toISOString(),tables:data};
 });
}
export async function restoreBackup(backup:BackupData,confirmation:string):Promise<DbResult<void>>{
 return dbOperation(async db=>{
  if(confirmation!=='RESTORE')throw new Error('Typed confirmation required');
  // Re-validate even when called programmatically, not just in the UI.
  const tables=validateTables(backup.tables);
  if(backup.format!=='liftria-backup'||backup.formatVersion!==1||
    backup.schemaVersion!==DB_SCHEMA_VERSION)throw new Error('Incompatible backup');
  await db.withExclusiveTransactionAsync(async tx=>{
   const actual=(await tx.getAllAsync<{name:string}>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
    .map(x=>x.name).sort();
   if(actual.join('|')!==[...BACKUP_TABLES].sort().join('|'))
    throw new Error('Schema manifest mismatch');
   // Reject unknown/missing columns BEFORE any deletion; restore is atomic regardless.
   for(const table of BACKUP_TABLES){
    const columns=(await tx.getAllAsync<{name:string}>('PRAGMA table_info('+table+')')).map(x=>x.name);
    const known=new Set(columns);
    for(const row of tables[table]??[]){
     if(columns.some(column=>!Object.prototype.hasOwnProperty.call(row,column))||
       Object.keys(row).some(column=>!known.has(column)))throw new Error('Backup column mismatch');
    }
   }
   await tx.execAsync('PRAGMA defer_foreign_keys = ON;');
   // Children first for deletes, parents first for inserts.
   for(const table of [...BACKUP_TABLES].reverse())await tx.runAsync('DELETE FROM '+table);
   for(const table of BACKUP_TABLES)for(const row of tables[table]??[]){
    const columns=Object.keys(row);
    await tx.runAsync('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+
     columns.map(()=>'?').join(',')+')',columns.map(column=>row[column]??null));
   }
  });
 });
}
