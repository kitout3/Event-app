import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function credentialReader(hasDisplay = true) {
  const source = read("functions/index.js");
  const block = source.slice(source.indexOf("exports.getPrivateEventCredentials ="), source.indexOf("exports.loginPrivateEvent ="));
  const reads = [];
  const eventRef = {
    get: async () => ({exists:true,data:()=>({ownerUid:"owner"})}),
    collection: name => ({doc: id => ({get: async () => {
      reads.push(`${name}/${id}`);
      if(id === "credentials")return {exists:true,data:()=>({accessId:"test-guests",passwordHash:"never-return-this"})};
      return {exists:hasDisplay,data:()=>hasDisplay?{password:"test-only-password"}:undefined};
    }})}),
  };
  class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
  const context = {exports:{},onCall:(_,handler)=>handler,HttpsError,
    normalizeSlug:value=>String(value||""),PRIVATE_EVENT_IDS:new Set(["quentin-huyen-2026"]),PLATFORM_OWNER_UID:"platform",
    getFirestore:()=>({collection:()=>({doc:()=>eventRef})})};
  vm.runInNewContext(block,context);
  return {readCredentials:context.exports.getPrivateEventCredentials,reads};
}

test("only event owner or platform admin can retrieve the shared password",async()=>{
  const {readCredentials,reads}=credentialReader();
  const data={eventId:"quentin-huyen-2026"};
  await assert.rejects(readCredentials({data}),{code:"unauthenticated"});
  await assert.rejects(readCredentials({data,auth:{uid:"guest"}}),{code:"permission-denied"});
  await assert.rejects(readCredentials({data,auth:{uid:"other-owner"}}),{code:"permission-denied"});
  assert.equal(reads.length,0);
  for(const uid of ["owner","platform"]){
    const result=await readCredentials({data,auth:{uid}});
    assert.equal(result.password,"test-only-password");
    assert.equal(result.passwordHash,undefined);
  }
});

test("legacy hashes are never exposed as recoverable passwords",async()=>{
  const {readCredentials}=credentialReader(false);
  const result=await readCredentials({data:{eventId:"quentin-huyen-2026"},auth:{uid:"owner"}});
  assert.equal(result.configured,true);
  assert.equal(result.password,"");
});

test("settings keep the saved password and dashboard has no literal newline escape",()=>{
  assert.doesNotMatch(read("src/ClientAccount.jsx"), /<main className="account-main">\\n/);
  const app=read("src/App.jsx");
  assert.doesNotMatch(app,/setField\("privateAccessPassword",""\)/);
  assert.match(app,/getPrivateEventCredentials/);
  assert.match(app,/privateAccessPassword:data.password/);
});

function mediaFixture(readyState) {
  const listeners = {}, windowListeners = {}, frames = [];
  let observed = false, observerCallback, hasPhoto = false, bar = null;
  const selectedButton = {textContent:"",setAttribute:()=>{}};
  const photo = {
    isConnected:true,dataset:{mediaKind:"photo",mediaId:"test",mediaUrl:"https://example.invalid/photo.jpg",mediaName:"test.jpg"},
    getClientRects:()=>[{}],querySelector:()=>selectedButton,
  };
  const body={appendChild:element=>{element.parentElement=body;bar=element;}};
  const document={readyState,body,head:{appendChild:()=>{}},
    addEventListener:(name,callback)=>{listeners[name]=callback;},
    getElementById:()=>bar,querySelector:()=>null,
    querySelectorAll:()=>hasPhoto?[photo]:[],
    createElement:tag=>{
      if(tag === "style")return {};
      const controls=new Map();
      return {remove:()=>{bar=null;},querySelector:selector=>{
        if(!controls.has(selector))controls.set(selector,{textContent:"",disabled:false});
        return controls.get(selector);
      }};
    },
  };
  vm.runInNewContext(read("public/media-selection.js"),{
    document,window:{__WEDDING_TENANT__:{eventId:"test"},addEventListener:(name,fn)=>{windowListeners[name]=fn;}},
    localStorage:{getItem:()=>null,setItem:()=>{}},navigator:{userAgent:"test",platform:"test"},
    getComputedStyle:()=>({display:"block",visibility:"visible",opacity:"1"}),
    requestAnimationFrame:callback=>frames.push(callback),
    MutationObserver:class {constructor(callback){observerCallback=callback;} observe(){observed=true;}},
  });
  return {
    isObserved:()=>observed,start:()=>listeners.DOMContentLoaded?.(),getBar:()=>bar,
    showPhoto:()=>{hasPhoto=true;observerCallback();while(frames.length)frames.shift()();},
    leaveGallery:()=>{hasPhoto=false;windowListeners.hashchange();while(frames.length)frames.shift()();},
  };
}

for(const state of ["loading","interactive","complete"]){
  test(`download bar starts when script loads at ${state} and returns after navigation`,()=>{
    const fixture=mediaFixture(state);
    assert.equal(fixture.isObserved(),state!=="loading");
    fixture.start();
    assert.equal(fixture.isObserved(),true);
    fixture.showPhoto();
    assert.equal(fixture.getBar().id,"media-selection-bar");
    assert.equal(fixture.getBar().querySelector("[data-all]").textContent,"Tout télécharger");
    fixture.leaveGallery();
    assert.equal(fixture.getBar(),null);
    fixture.showPhoto();
    assert.equal(fixture.getBar().id,"media-selection-bar");
  });
}
