/** Guard every navigation removal, including iOS swipe-back and Android hardware back.
 * The original action is retained so confirmation completes exactly that navigation. */
export function guardTemplateRemoval<Action>(
 event:{preventDefault:()=>void;data:{action:Action}},
 dirty:boolean,
 showDiscard:(action:Action)=>void,
):boolean{
 if(!dirty)return false;
 event.preventDefault();
 showDiscard(event.data.action);
 return true;
}
