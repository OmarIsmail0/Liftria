import {BACKUP_TABLES,parseBackup,backupPreview,type BackupData} from '../backup';
import {csvRows} from '../csvExport';
test('backup JSON round trip preserves nulls, text and every schema table',()=>{
 const tables=Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]])) as BackupData['tables'];
 tables.diary_entries=[{id:'a',name_snapshot:'فول "مدمس"',protein:null,kcal:250}];
 tables.app_settings=[{key:'adaptive.checkin.2026-10-26',value:'{"status":"dismissed"}'}];
 tables.water_logs=[{day:'2026-10-27',glasses:0,glass_ml:250,logged_at:'2026-10-27T00:00:00Z'}];
 const backup:BackupData={format:'liftria-backup',formatVersion:1,schemaVersion:6,
  exportedAt:'2026-10-27T00:00:00Z',tables};
 const restored=parseBackup(JSON.stringify(backup));
 expect(restored).toEqual(backup);
 expect(backupPreview(restored).total).toBe(3);
});
test('restore parser rejects missing tables, foreign/unsupported formats and bad cells',()=>{
 const backup={format:'liftria-backup',formatVersion:1,schemaVersion:6,
  exportedAt:'2026-10-27T00:00:00Z',tables:Object.fromEntries(BACKUP_TABLES.map(name=>[name,[]]))};
 expect(()=>parseBackup(JSON.stringify({...backup,schemaVersion:999}))).toThrow();
 expect(()=>parseBackup(JSON.stringify({...backup,tables:{}}))).toThrow();
 expect(()=>parseBackup(JSON.stringify({...backup,tables:{...backup.tables,profile:[{id:{bad:1}}]}}))).toThrow();
});
test('CSV quotes values and prevents Excel formula injection',()=>{
 expect(csvRows([['Food','Value'],['=1+1','a,"b"'],['فول',null]]))
  .toBe('"Food","Value"\r\n"\'=1+1","a,""b"""\r\n"فول",""\r\n');
});
