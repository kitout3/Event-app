import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {transformSync} from "esbuild";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

function playerFixture(){
  const listeners={};let players=0;
  const controls={addEventListener:()=>{},focus:()=>{}};
  const video={addEventListener:()=>{},pause:()=>{},load:()=>{},play:()=>Promise.resolve()};
  const card={dataset:{},setAttribute:()=>{},querySelector:()=>video};
  const galleryVideo={currentSrc:"https://example.invalid/test.mp4"};
  const doc={readyState:"complete",body:{appendChild:()=>{players++;}},
    addEventListener:(type,handler)=>{listeners[type]=handler;},removeEventListener:()=>{},
    getElementById:()=>null,
    querySelectorAll:selector=>selector.endsWith("video[src]")?[galleryVideo]:[card],
    createElement:()=>({setAttribute:()=>{},addEventListener:()=>{},querySelector:selector=>selector==="video"?video:controls}),
  };
  vm.runInNewContext(read("public/video-gallery-player.js"),{
    document:doc,window:{addEventListener:()=>{}},localStorage:{getItem:()=>"fr"},
    MutationObserver:class{observe(){}},
  });
  const dispatch=(kind,type="click",key="Enter")=>{
    let prevented=false,stopped=false;
    const target={closest:selector=>{
      if(kind==="selection"&&selector.includes(".ms-select"))return {};
      if(kind==="download-all"&&selector.includes(".ms-bar"))return {};
      if(kind==="play-all"&&selector.includes(".vt-overlay-actions"))return {};
      if(kind==="card"&&selector==="#vt-overlay .vt-gallery-item")return card;
      return null;
    }};
    listeners[type]({target,key,preventDefault:()=>{prevented=true;},stopPropagation:()=>{stopped=true;}});
    return {prevented,stopped,players};
  };
  return {dispatch};
}

test("selection clicks and keyboard events reach their button without opening the player",()=>{
  const {dispatch}=playerFixture();
  for(const [type,key] of [["click",""],["keydown","Enter"],["keydown"," "]]){
    assert.deepEqual(dispatch("selection",type,key),{prevented:false,stopped:false,players:0});
  }
});
test("download all is not intercepted while gallery playback still works",()=>{
  const {dispatch}=playerFixture();
  assert.deepEqual(dispatch("download-all"),{prevented:false,stopped:false,players:0});
  assert.equal(dispatch("card").players,1);
  assert.equal(dispatch("play-all").players,2);
});

function adminFixture({confirm=true,path="events/test/videos/clip.mp4",storageError=null}={}){
  const states=[],calls=[];let cursor=0,effectInstalled=false,snapshotHandler;
  const module={exports:{}};
  const props={eventId:"test",db:{},storage:{},firebase:{
    collection:(...args)=>args.slice(1).join("/"),query:value=>value,orderBy:()=>{},
    onSnapshot:(_,fn)=>{snapshotHandler=fn;return ()=>{};},
    doc:(...args)=>args.slice(1).join("/"),serverTimestamp:()=>"timestamp",
    updateDoc:async(...args)=>{calls.push(["update",...args]);},
    ref:(_,value)=>value,
    deleteObject:async value=>{calls.push(["file",value]);if(storageError)throw {code:storageError};},
    deleteDoc:async value=>{calls.push(["delete",value]);},
  }};
  vm.runInNewContext(transformSync(read("src/AdminVideos.jsx"),{loader:"jsx",jsx:"automatic",format:"cjs"}).code,{
    module,exports:module.exports,window:{confirm:()=>confirm},
    require:name=>name==="react"?{
      useState:initial=>{const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],value=>{states[index]=typeof value==="function"?value(states[index]):value;}];},
      useEffect:fn=>{if(!effectInstalled){effectInstalled=true;fn();}},
    }:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  });
  const render=()=>{cursor=0;return module.exports.default(props);};
  const walk=node=>{
    if(Array.isArray(node))return node.flatMap(walk);
    if(!node||typeof node!=="object")return [];
    return [node,...walk(node.props?.children)];
  };
  render();
  snapshotHandler({docs:[{id:"clip",data:()=>({path,status:"pending",url:"https://example.invalid/clip.mp4"})}]});
  return {calls,click:async label=>{
    const button=walk(render()).find(node=>node.type==="button"&&node.props.children===label);
    assert.ok(button,`Missing ${label} button`);
    await button.props.onClick();
  }};
}

test("video tab approval and rejection update the current event only",async()=>{
  const fixture=adminFixture();
  await fixture.click("Valider");
  assert.equal(fixture.calls[0][1],"events/test/videoTestimonials/clip");
  assert.equal(fixture.calls[0][2].status,"approved");
  assert.equal(fixture.calls[0][2].selectedForTv,true);
  await fixture.click("Refuser");
  assert.equal(fixture.calls[1][2].status,"rejected");
  assert.equal(fixture.calls[1][2].selectedForTv,false);
});
test("video deletion requires confirmation and removes file before document",async()=>{
  const cancelled=adminFixture({confirm:false});
  await cancelled.click("Supprimer");
  assert.equal(cancelled.calls.length,0);
  const confirmed=adminFixture();
  await confirmed.click("Supprimer");
  assert.deepEqual(confirmed.calls,[["file","events/test/videos/clip.mp4"],["delete","events/test/videoTestimonials/clip"]]);
});
test("video deletion stops on wrong tenant path or failed storage deletion",async()=>{
  const wrongTenant=adminFixture({path:"events/other/videos/clip.mp4"});
  await wrongTenant.click("Supprimer");
  assert.equal(wrongTenant.calls.length,0);
  const failed=adminFixture({storageError:"storage/unauthorized"});
  await failed.click("Supprimer");
  assert.equal(failed.calls.some(([kind])=>kind==="delete"),false);
  const missing=adminFixture({storageError:"storage/object-not-found"});
  await missing.click("Supprimer");
  assert.equal(missing.calls.some(([kind])=>kind==="delete"),true);
});
test("native videos tab sits next to photos and legacy settings injection is disabled",()=>{
  assert.match(read("src/App.jsx"),/\["photos","Photos"\],\["videos","Vidéos"\]/);
  assert.match(read("src/App.jsx"),/tab === "videos" && <AdminVideos/);
  assert.doesNotMatch(read("src/main.jsx"),/'admin-video-tab'|'admin-video-guard'/);
  assert.doesNotMatch(read("public/video-testimonials-v2.js"),/renderAdmin\(|addAdmin\(/);
});
