import {BACKUP_TABLES,parseBackup,backupPreview,previewGroups,progressPhotoByteCount,restoreColumns,validateBackupTables,type BackupData,type ColumnInfo} from '../backup';
import {csvRows} from '../csvExport';
test('backup JSON round trip preserves nulls, text and every schema table',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]])) as BackupData['tables'];
 tables.diary_entries=[{id:'a',name_snapshot:'فول "مدمس"',protein:null,kcal:250}];
 tables.app_settings=[{key:'adaptive.checkin.2026-10-26',value:'{"status":"dismissed"}'}];
 tables.water_logs=[{day:'2026-10-27',glasses:0,glass_ml:250,logged_at:'2026-10-27T00:00:00Z'}];
 tables.body_measurements=[{id:'m1',site:'waist',cm:82.5,note:'بعد التمرين',measured_at:'2026-10-27T00:00:00Z',source:'liftria'}];
 tables.progress_photos=[{id:'p1',pose:'front',jpeg_base64:'AQID',width:2,height:2,note:null,taken_at:'2026-10-27T00:00:00Z',source:'liftria'}];
 const backup:BackupData={format:'liftria-backup',formatVersion:1,schemaVersion:8,
  exportedAt:'2026-10-27T00:00:00Z',tables};
 const restored=parseBackup(JSON.stringify(backup));
 expect(restored).toEqual(backup);
 expect(backupPreview(restored).total).toBe(5);
 expect(progressPhotoByteCount(restored)).toBe(4);
 expect(previewGroups(restored).reduce((n,g)=>n+g.count,0)).toBe(5);
 expect(previewGroups(restored).find(g=>g.group==='water')?.count).toBe(1);
 expect(previewGroups(restored).find(g=>g.group==='measurements')?.count).toBe(1);
 expect(previewGroups(restored).find(g=>g.group==='photos')?.count).toBe(1);
});
test('restore parser rejects missing tables, foreign/unsupported formats and bad cells',()=>{
 const backup={format:'liftria-backup',formatVersion:1,schemaVersion:8,
  exportedAt:'2026-10-27T00:00:00Z',tables:Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]]))};
 expect(()=>parseBackup(JSON.stringify({...backup,schemaVersion:999}))).toThrow();
 expect(()=>parseBackup(JSON.stringify({...backup,tables:{}}))).toThrow();
 expect(()=>parseBackup(JSON.stringify({...backup,tables:{...backup.tables,profile:[{id:{bad:1}}]}}))).toThrow();
});
test('CSV quotes values and prevents Excel formula injection',()=>{
 expect(csvRows([['Food','Value'],['=1+1','a,"b"'],['فول',null]]))
  .toBe('"Food","Value"\r\n"\'=1+1","a,""b"""\r\n"فول",""\r\n');
});

test('a v6 backup can restore into hypothetical v7 with a new table and optional column',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]])) as BackupData['tables'];
 tables.diary_entries=[{id:'old',name_snapshot:'Rice',kcal:300}];
 const next={schemaVersion:7,tables:[...BACKUP_TABLES,'new_v7_table'],
  introducedIn:{...Object.fromEntries(BACKUP_TABLES.map(t=>[t,6])),new_v7_table:7}};
 const backup={format:'liftria-backup',formatVersion:1,schemaVersion:6,
  exportedAt:'2026-10-27T00:00:00Z',tables};
 const parsed=parseBackup(JSON.stringify(backup),next);
 expect(parsed.schemaVersion).toBe(6);
 expect(parsed.tables.new_v7_table).toEqual([]);
 const newColumn:ColumnInfo[]=[
  {name:'id',notnull:1,dflt_value:null,pk:1},
  {name:'name_snapshot',notnull:1,dflt_value:null,pk:0},
  {name:'kcal',notnull:1,dflt_value:null,pk:0},
  {name:'sugar',notnull:0,dflt_value:null,pk:0},
  {name:'future_field',notnull:1,dflt_value:"'default'",pk:0},
 ];
 expect(restoreColumns(parsed.tables.diary_entries![0]!,newColumn))
  .toEqual(['id','name_snapshot','kcal']);
 expect(()=>restoreColumns(parsed.tables.diary_entries![0]!,[
  ...newColumn,{name:'must_have',notnull:1,dflt_value:null,pk:0}])).toThrow();
 expect(()=>restoreColumns({...parsed.tables.diary_entries![0],unknown_column:1},newColumn)).toThrow();
});
test('v6 backup rejects newer-version tables and unknown names',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]]));
 const manifest={schemaVersion:7,tables:[...BACKUP_TABLES,'future_table'],
  introducedIn:{...Object.fromEntries(BACKUP_TABLES.map(t=>[t,6])),future_table:7}};
 expect(()=>validateBackupTables({...tables,future_table:[]},6,manifest)).toThrow('Table introduced');
 expect(()=>validateBackupTables({...tables,unknown_table:[]},6,manifest)).toThrow('Unknown');
 expect(()=>validateBackupTables(tables,8,manifest)).toThrow('Unsupported');
 const v6=Object.fromEntries(BACKUP_TABLES.filter(name=>name!=='body_measurements'&&name!=='progress_photos').map(name=>[name,[]]));
 const v7=Object.fromEntries(BACKUP_TABLES.filter(name=>name!=='progress_photos').map(name=>[name,[]]));
 expect(()=>validateBackupTables(v6,6)).not.toThrow();
 expect(()=>validateBackupTables(v7,7)).not.toThrow();
 expect(()=>validateBackupTables(tables,6)).toThrow('Table introduced');
 expect(()=>validateBackupTables(tables,7)).toThrow('Table introduced');
 expect(()=>validateBackupTables(tables,8)).not.toThrow();
});
test('a v6 backup without body_measurements restores as an empty table',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.filter(name=>name!=='body_measurements'&&name!=='progress_photos').map(name=>[name,[]]));
 const parsed=parseBackup(JSON.stringify({format:'liftria-backup',formatVersion:1,schemaVersion:6,
  exportedAt:'2026-10-27T00:00:00Z',tables}));
 expect(parsed.tables.body_measurements).toEqual([]);
 expect(parsed.tables.progress_photos).toEqual([]);
 expect(parsed.schemaVersion).toBe(6);
});
test('a v7 backup without progress photos restores as an empty table',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.filter(name=>name!=='progress_photos').map(name=>[name,[]]));
 const parsed=parseBackup(JSON.stringify({format:'liftria-backup',formatVersion:1,schemaVersion:7,
  exportedAt:'2026-10-27T00:00:00Z',tables}));
 expect(parsed.tables.progress_photos).toEqual([]);
 expect(parsed.tables.body_measurements).toEqual([]);
 expect(parsed.schemaVersion).toBe(7);
 expect(progressPhotoByteCount(parsed)).toBe(0);
});
