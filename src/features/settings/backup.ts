import {DB_SCHEMA_VERSION,dbOperation,type DbResult} from '../../services/database';

/** Every current application table, parents before dependents, without sqlite_sequence.
 * Update this manifest on every migration adding a table. Unknown tables forbid
 * export/restore instead of silently dropping data from a purported full backup. */
export const BACKUP_TABLES=[
 'app_settings','test_workout_sessions','test_workout_sets','test_nutrition_entries',
 'health_samples','health_aggregates','profile','targets','import_batches',
 'exercises','templates','template_exercises','plans','sessions','session_exercises',
 'sets','foods','food_portions','hiku_requests','diary_entries','favorite_foods',
 'saved_meals','saved_meal_items','weights','body_measurements','progress_photos','water_logs',
] as const;
export type BackupRow=Record<string,string|number|null>;
export type BackupData={format:'liftria-backup';formatVersion:1;schemaVersion:number;
 exportedAt:string;tables:Record<string,BackupRow[]>};
export type BackupPreview={schemaVersion:number;exportedAt:string;
 counts:{table:string;count:number}[];total:number};
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
/** The first backup format shipped with schema v6. Tables added later record the
 * schema version that introduced them, so an older file may omit them. */
export type BackupManifest={schemaVersion:number;tables:readonly string[];
 introducedIn:Readonly<Record<string,number>>};
export const BACKUP_MANIFEST:BackupManifest={
 schemaVersion:DB_SCHEMA_VERSION,tables:BACKUP_TABLES,
 introducedIn:{
  ...Object.fromEntries(BACKUP_TABLES.filter(table=>table!=='body_measurements'&&table!=='progress_photos').map(table=>[table,6])),
  body_measurements:7,
  progress_photos:8,
 },
};
export const MIN_BACKUP_SCHEMA_VERSION=6;
const validCell=(v:unknown)=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v);
/** Validate the file against the receiving schema. A missing table is only legal
 * if that table was introduced after the file's schema version. */
export function validateBackupTables(tables:Record<string,unknown>,backupVersion:number,
 manifest:BackupManifest=BACKUP_MANIFEST):Record<string,BackupRow[]>{
 if(!Number.isInteger(backupVersion)||backupVersion<MIN_BACKUP_SCHEMA_VERSION||
  backupVersion>manifest.schemaVersion)throw new Error('Unsupported backup schema version');
 const allowed=new Set(manifest.tables),names=Object.keys(tables);
 if(names.some(name=>!allowed.has(name)))throw new Error('Unknown backup table');
 const data:Record<string,BackupRow[]>={};
 for(const table of manifest.tables){
  const added=manifest.introducedIn[table];
  if(!Number.isInteger(added)||added!<MIN_BACKUP_SCHEMA_VERSION||
    added!>manifest.schemaVersion)throw new Error('Invalid backup table manifest');
  const value=tables[table];
  if(value!==undefined&&added!>backupVersion)throw new Error('Table introduced after backup version');
  if(value===undefined){
   if(added!<=backupVersion)throw new Error('Missing backup table: '+table);
   data[table]=[];continue;
  }
  if(!Array.isArray(value)||value.length>1000000)throw new Error('Invalid backup rows');
  data[table]=value.map(row=>{
   if(!obj(row)||Object.keys(row).some(k=>!/^[_a-z][_a-z0-9]*$/i.test(k) || !validCell(row[k])))
    throw new Error('Invalid backup cell');
   return row as BackupRow;
  });
 }
 return data;
}
export function parseBackup(raw:string,manifest:BackupManifest=BACKUP_MANIFEST):BackupData{
 if(raw.length>100*1024*1024)throw new Error('Backup is too large');
 const value:unknown=JSON.parse(raw);
 if(!obj(value)||value.format!=='liftria-backup'||value.formatVersion!==1||
   typeof value.schemaVersion!=='number'||typeof value.exportedAt!=='string'||
   !Number.isFinite(Date.parse(value.exportedAt))||!obj(value.tables))
  throw new Error('Unsupported backup format');
 return {format:'liftria-backup',formatVersion:1,schemaVersion:value.schemaVersion,
  exportedAt:value.exportedAt,tables:validateBackupTables(value.tables,value.schemaVersion,manifest)};
}
/** SQLite table_info compatibility: omitted columns must be nullable or supply a
 * default. Caller inserts only the original columns so new defaults apply. */
export type ColumnInfo={name:string;notnull:number;dflt_value:string|null;pk:number};
export function restoreColumns(row:BackupRow,info:readonly ColumnInfo[]):string[]{
 const columns=Object.keys(row),known=new Set(info.map(c=>c.name));
 if(columns.length===0||columns.some(name=>!known.has(name)))throw new Error('Unknown backup column');
 for(const column of info){
  if(!Object.prototype.hasOwnProperty.call(row,column.name)&&column.notnull!==0&&
   column.dflt_value===null)throw new Error('Missing required backup column: '+column.name);
 }
 return columns;
}
export const BACKUP_GROUPS={
 workouts:['sessions','test_workout_sessions'],
 sets:['sets','test_workout_sets','session_exercises'],
 diary:['diary_entries','test_nutrition_entries','saved_meals','saved_meal_items'],
 foods:['foods','food_portions','favorite_foods'],
 weights:['weights'],
 measurements:['body_measurements'],
 photos:['progress_photos'],
 water:['water_logs'],
 health:['health_samples','health_aggregates'],
 plans:['plans','templates','template_exercises','exercises','import_batches'],
 settings:['app_settings','profile','targets','hiku_requests'],
} as const;
export type BackupGroup=keyof typeof BACKUP_GROUPS;
export function previewGroups(backup:BackupData):{group:BackupGroup;count:number}[]{
 return (Object.entries(BACKUP_GROUPS) as [BackupGroup,readonly string[]][]).map(([group,names])=>({
  group,count:names.reduce((total,name)=>total+(backup.tables[name]?.length??0),0),
 }));
}
export function backupPreview(backup:BackupData):BackupPreview{
 const counts=BACKUP_TABLES.map(table=>({table,count:backup.tables[table]?.length??0}));
 return {schemaVersion:backup.schemaVersion,exportedAt:backup.exportedAt,
  counts,total:counts.reduce((sum,row)=>sum+row.count,0)};
}
/** Stored JPEG text length, the same basis as kept-photo LENGTH(value). */
export function progressPhotoByteCount(backup:BackupData):number{
 let bytes=0;
 for(const row of backup.tables.progress_photos??[]){
  const jpeg=row.jpeg_base64;
  if(typeof jpeg==='string')bytes+=jpeg.length;
 }
 return bytes;
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
  if(backup.format!=='liftria-backup'||backup.formatVersion!==1||
    !Number.isInteger(backup.schemaVersion)||backup.schemaVersion<MIN_BACKUP_SCHEMA_VERSION||
    backup.schemaVersion>DB_SCHEMA_VERSION)throw new Error('Incompatible backup');
  const tables=validateBackupTables(backup.tables,backup.schemaVersion);
  await db.withExclusiveTransactionAsync(async tx=>{
   const actual=(await tx.getAllAsync<{name:string}>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
    .map(x=>x.name).sort();
   if(actual.join('|')!==[...BACKUP_TABLES].sort().join('|'))
    throw new Error('Schema manifest mismatch');
   // Validate every populated row and future nullable/defaulted column BEFORE deletes.
   const columnsByTable=new Map<string,ColumnInfo[]>();
   for(const table of BACKUP_TABLES){
    const info=await tx.getAllAsync<ColumnInfo>('PRAGMA table_info('+table+')');
    columnsByTable.set(table,info);
    for(const row of tables[table]??[])restoreColumns(row,info);
   }
   await tx.execAsync('PRAGMA defer_foreign_keys = ON;');
   // Children first for deletes, parents first for inserts.
   for(const table of [...BACKUP_TABLES].reverse())await tx.runAsync('DELETE FROM '+table);
   for(const table of BACKUP_TABLES)for(const row of tables[table]??[]){
    const columns=restoreColumns(row,columnsByTable.get(table)??[]);
    await tx.runAsync('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+
     columns.map(()=>'?').join(',')+')',columns.map(column=>row[column]??null));
   }
  });
 });
}
