import { parseImportCsv } from '../importCsv';
import { previewDraftFromShare, redirectIncomingPath, type SharedPiece } from '../importIncoming';
const {readFileSync}=jest.requireActual('fs') as {readFileSync:(file:string,encoding:'utf8')=>string};
const {join}=jest.requireActual('path') as {join:(...parts:string[])=>string};

const fixture=readFileSync(join(process.cwd(),'src/features/import/__tests__/fixtures/hevy-current.csv'),'utf8');
const readFixture=async()=>fixture;

test('a share and an opened file go to the import screen, and other links do not',()=>{
 expect(redirectIncomingPath('liftria://expo-sharing')).toBe('/import/incoming');
 expect(redirectIncomingPath('liftria:///expo-sharing')).toBe('/import/incoming');
 const content='content://com.android.providers.downloads.documents/document/1234';
 expect(redirectIncomingPath(content)).toBe('/import/incoming?url='+encodeURIComponent(content));
 expect(decodeURIComponent(redirectIncomingPath('file:///tmp/workouts.csv').split('url=')[1]!))
  .toBe('file:///tmp/workouts.csv');
 expect(redirectIncomingPath('liftria://settings/data')).toBe('liftria://settings/data');
 expect(redirectIncomingPath('liftria://')).toBe('liftria://');
});

test('a shared Hevy file with a content-provider name opens the same preview as the picker',async()=>{
 const payload:SharedPiece={
  value:'content://com.android.providers.downloads.documents/document/1234',
  shareType:'text',mimeType:'text/csv',contentUri:'file:///cache/document:1234',originalName:'document:1234',
 };
 const preview=await previewDraftFromShare({
  url:'liftria://expo-sharing',language:'en',payloads:[payload],readText:readFixture,
 });
 expect(preview.ok).toBe(true);
 if(!preview.ok)return;
 const direct=parseImportCsv('hevy','document:1234',fixture);
 expect(preview.draft.source).toBe('hevy');
 expect(preview.draft.error).toBeNull();
 expect(preview.draft.parsed?.workouts).toEqual(direct.workouts);
 expect(preview.sourceUri).toBe('file:///cache/document:1234');
});

test('an opened content URI is read into that same preview',async()=>{
 const url='content://com.android.providers.downloads.documents/document/1234';
 const preview=await previewDraftFromShare({url,language:'en',payloads:[],readText:readFixture});
 expect(preview.ok).toBe(true);
 if(!preview.ok)return;
 expect(preview.draft.source).toBe('hevy');
 expect(preview.draft.parsed?.workouts).toHaveLength(1);
 expect(preview.draft.parsed?.workouts[0]?.sets[0]?.kind).toBe('warm-up');
});

test('CSV text shared without a file is still the Hevy preview',async()=>{
 const preview=await previewDraftFromShare({
  url:null,language:'en',payloads:[{value:fixture,shareType:'text',mimeType:'text/plain'}],
  readText:async()=>{throw new Error('no file');},
 });
 expect(preview.ok).toBe(true);
 if(!preview.ok)return;
 expect(preview.draft.parsed?.workouts[0]?.title).toBe('Push A');
 expect(preview.sourceUri).toBeNull();
});

test('a photo, a link, an empty share and a spreadsheet each say what went wrong',async()=>{
 const photo=await previewDraftFromShare({
  url:null,language:'en',payloads:[{value:'content://media/1',shareType:'image',mimeType:'image/jpeg'}],
  readText:readFixture,
 });
 const link=await previewDraftFromShare({
  url:null,language:'en',payloads:[{value:'https://example.com/workouts.csv',shareType:'url'}],
  readText:readFixture,
 });
 const empty=await previewDraftFromShare({url:null,language:'en',payloads:[],readText:readFixture});
 const sheet=await previewDraftFromShare({
  url:'file:///tmp/export.xlsx',language:'en',payloads:[],readText:readFixture,
 });
 const note=await previewDraftFromShare({
  url:null,language:'ar',payloads:[{value:'hello',shareType:'text'}],readText:readFixture,
 });
 expect(photo.ok).toBe(false);
 expect(link.ok).toBe(false);
 expect(empty.ok).toBe(false);
 expect(sheet.ok).toBe(false);
 expect(note.ok).toBe(false);
 if(photo.ok||link.ok||empty.ok||sheet.ok||note.ok)return;
 expect(photo.message).toContain('CSV');
 expect(link.message).toContain('web link');
 expect(empty.message).toContain("didn't receive a file");
 expect(sheet.message).toContain('CSV files only');
 expect(note.message).not.toMatch(/[A-Za-z]{4,}/);
});
