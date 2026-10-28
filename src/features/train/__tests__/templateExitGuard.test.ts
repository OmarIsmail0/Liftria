import {guardTemplateRemoval} from '../templateExitGuard';

test('dirty template blocks removal and opens the discard confirmation with the original action',()=>{
 const action={type:'GO_BACK',source:'template'};
 const event={preventDefault:jest.fn(),data:{action}};
 const showSheet=jest.fn();
 expect(guardTemplateRemoval(event,true,showSheet)).toBe(true);
 expect(event.preventDefault).toHaveBeenCalledTimes(1);
 expect(showSheet).toHaveBeenCalledWith(action);
});
test('clean template permits removal without a discard sheet',()=>{
 const event={preventDefault:jest.fn(),data:{action:{type:'POP'}}};
 const showSheet=jest.fn();
 expect(guardTemplateRemoval(event,false,showSheet)).toBe(false);
 expect(event.preventDefault).not.toHaveBeenCalled();
 expect(showSheet).not.toHaveBeenCalled();
});
