import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import { transformSync } from 'esbuild';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const PLATFORM_OWNER_UID = 'beQK5FNoVla9lnvnzSfqasK93QR2';
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }

function listFixture() {
  const source = read('functions/index.js');
  const helper = source.slice(source.indexOf('function requireOrganizer'), source.indexOf('function requestCanAccessPrivateEvent'));
  const handler = source.slice(source.indexOf('exports.listMyEvents ='), source.indexOf('exports.createEventCheckoutSession ='));
  const records = [
    {id:'alpha-1',ownerUid:'alpha',active:true,billing:{invoiceUrl:'alpha-invoice'}},
    {id:'alpha-2',ownerUid:'alpha',active:false},
    {id:'beta-1',ownerUid:'beta',privateAccessEmails:['alpha@example.invalid'],billing:{invoiceUrl:'private-beta-invoice'}},
    {id:'platform-event',ownerUid:PLATFORM_OWNER_UID},
  ];
  const snapshots = values => ({docs:values.map(row=>({id:row.id,data:()=>row}))});
  let reads = 0;
  const collection = {
    get:async()=>{reads++;return snapshots(records);},
    where:(field,op,value)=>({get:async()=>{reads++;assert.equal(field,'ownerUid');assert.equal(op,'==');return snapshots(records.filter(row=>row[field]===value));}}),
  };
  const context={exports:{},onCall:(_,callback)=>callback,HttpsError,PLATFORM_OWNER_UID,
    getFirestore:()=>({collection:()=>collection}),PUBLIC_APP_BASE:'https://example.invalid/',
    eventConfig:{eventType:value=>value,themePreset:()=> 'custom-neutral'},
  };
  vm.runInNewContext(helper+handler,context);
  return {list:context.exports.listMyEvents,get reads(){return reads;}};
}

test('organizer event list includes only owned events, never invitations or another account billing',async()=>{
  const {list}=listFixture();
  for(const [uid,expected] of [['alpha',['alpha-1','alpha-2']],['beta',['beta-1']]]) {
    const result=await list({auth:{uid,token:{email:uid+'@example.invalid'}},data:{ownerUid:PLATFORM_OWNER_UID,eventId:'beta-1'}});
    assert.deepEqual(Array.from(result.events,item=>item.id).sort(),expected);
    assert.ok(result.events.every(item=>item.ownerUid===uid));
  }
});

test('global administrator can list every event including other owners and inactive drafts',async()=>{
  const {list}=listFixture();
  const result=await list({auth:{uid:PLATFORM_OWNER_UID,token:{}}});
  assert.equal(result.events.length,4);
  assert.equal(result.events.find(item=>item.id==='beta-1').billing.invoiceUrl,'private-beta-invoice');
  assert.equal(result.events.find(item=>item.id==='alpha-2').active,false);
});

test('anonymous and shared guest identities cannot call the organizer event endpoint',async()=>{
  const fixture=listFixture();
  for(const auth of [undefined,{uid:'event-guest-test',token:{}},{uid:'guest',token:{eventAccess:'alpha-1'}}]) {
    await assert.rejects(fixture.list({auth}),{code:auth?'permission-denied':'unauthenticated'});
  }
  assert.equal(fixture.reads,0);
});

function appFixture({user={uid:'alpha'},deny=false,delayedInit=false}={}) {
  const source=read('src/App.jsx');
  const ast=parse(source,{sourceType:'module',plugins:['jsx']});
  const node=ast.program.body.find(node=>node.type==='ExportDefaultDeclaration').declaration;
  const code=transformSync(source.slice(node.start,node.end),{loader:'jsx',format:'cjs',jsx:'transform'}).code;
  const setters=[], effects=[];let signOuts=0,listener,unsubscribed=0,finishInit;
  const auth={currentUser:user};
  const init=delayedInit?new Promise(resolve=>finishInit=resolve):Promise.resolve(true);
  const currentEvent={ownerUid:'owner',privateAccessUid:'guest',privateAccessEmails:[]};
  const context={React:{createElement:()=>({})},VIEWS:{HOME:'home',ADMIN:'admin'},isRealConfig:true,
    TENANT:{isValid:true},EVENT_ID:'quentin-huyen-2026',PRIVATE_EVENT_IDS:new Set(['quentin-huyen-2026']),PLATFORM_OWNER_UID,
    _auth:auth,_eventExists:true,currentEvent,APP_URL:'https://example.invalid/?w=quentin-huyen-2026',GlobalStyles:()=>null,
    useState:initial=>{const state={value:initial};setters.push(state);return [initial,value=>state.value=value];},
    useCallback:callback=>callback,useEffect:callback=>effects.push(callback),
    initFirebase:()=>init,loadCurrentEvent:async()=>{if(deny)throw new HttpsError('permission-denied','denied');},
    window:{location:{hash:'#admin'},history:{replaceState(){}},__fb:{
      onAuthStateChanged:(_,callback)=>{listener=callback;return()=>unsubscribed++;},
      signOut:async()=>{signOuts++;auth.currentUser=null;},
    }},console:{warn(){}},
  };
  vm.runInNewContext(code+'\nApp();',context);
  const cleanup=effects[0]();
  return {auth,setters,cleanup,finishInit,get signOuts(){return signOuts;},get unsubscribed(){return unsubscribed;},get listener(){return listener;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('a private event denial cannot sign out an organizer in another tab',async()=>{
  const fixture=appFixture({deny:true});await flush();
  await fixture.listener(fixture.auth.currentUser);
  assert.equal(fixture.signOuts,0);
  assert.equal(fixture.auth.currentUser.uid,'alpha');
  assert.equal(fixture.setters[1].value,false); // no event administration
  assert.equal(fixture.setters[6].value,'login');
});

test('event administration allows its owner and global admin, while guests remain guests',async()=>{
  for(const [uid,canManage] of [['owner',true],[PLATFORM_OWNER_UID,true],['guest',false],['other-owner',false]]) {
    const fixture=appFixture({user:{uid,getIdTokenResult:async()=>({claims:{}})}});await flush();
    await fixture.listener(fixture.auth.currentUser);
    assert.equal(fixture.setters[1].value,canManage,uid);
    assert.equal(fixture.signOuts,0,uid);
    if(uid==='other-owner')assert.equal(fixture.setters[6].value,'login');
  }
});

test('unmounted event pages cannot leave authentication observers behind',async()=>{
  const fixture=appFixture({delayedInit:true});fixture.cleanup();fixture.finishInit(true);await flush();
  assert.equal(fixture.listener,undefined);
});
