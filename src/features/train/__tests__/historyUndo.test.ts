import { storeUndo, peekUndo, takeUndo, clearUndo } from '../historyUndo';
const item={id:'s',title:'Example',snapshot:{session:{id:'s'},exercises:[],sets:[]}};
afterEach(clearUndo);
test('8 second expiry including exact boundary',()=>{
 storeUndo(item,1000);expect(peekUndo(8999)).toEqual(item);expect(peekUndo(9000)).toBeNull();
});
test('Undo is one-shot',()=>{
 storeUndo(item,10);expect(takeUndo(20)).toEqual(item);expect(takeUndo(21)).toBeNull();
});
