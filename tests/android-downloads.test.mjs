import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/media-selection.js',import.meta.url),'utf8');

function fixture({userAgent='Android Chrome',platform='Linux',fetcher=async()=>new Response('photo',{headers:{'content-type':'image/jpeg'}})}={}) {
  const nodes=[], prepared=new Map(), timers=new Map(); let timerId=0, downloadId=0;
  class Element {
    constructor(tag){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attributes={};nodes.push(this);}
    appendChild(node){this.children.push(node);node.parentElement=this;return node;}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(){}
    focus(){document.activeElement=this;}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
    click(){return this.onclick?.();}
    querySelectorAll(selector){
      const all=this.children.flatMap(x=>[x,...x.querySelectorAll('*')]);
      if(selector==='*')return all;
      if(selector==='[data-close]')return all.filter(x=>'close' in x.dataset);
      return all.filter(x=>(x.tagName==='button'&&!x.disabled)||(x.tagName==='a'&&x.href));
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  }
  const document={readyState:'loading',activeElement:null,createElement:tag=>new Element(tag),addEventListener(){},
    querySelectorAll(){return[];},querySelector(){return null;},getElementById:id=>nodes.find(x=>x.id===id&&x.parentElement)||null};
  document.body=new Element('body');document.head=new Element('head');
  const window={location:{href:'https://example.invalid/Event-app/?w=test'},addEventListener(){},removeEventListener(){},__WEDDING_TENANT__:{eventId:'test'}};
  class TestMessageChannel {
    constructor(){this.port1={onmessage:null};this.port2={peer:this.port1};}
  }
  const worker={state:'activated',postMessage(message,ports){
    prepared.set(message.id,{blob:message.blob,name:message.name});
    ports[0].peer.onmessage?.({data:{ok:true}});
  }};
  const serviceWorker={register:async()=>({active:worker,installing:null,waiting:null,update:async()=>{}})};
  const context={window,document,navigator:{userAgent,platform,maxTouchPoints:platform==='MacIntel'?5:0,serviceWorker,share(){throw Error('Android must not share');},canShare:()=>true},
    localStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},
    Blob,File,Response,ReadableStream,AbortController,Uint8Array,DataView,TextEncoder,
    URL,MessageChannel:TestMessageChannel,crypto:{randomUUID:()=>`download-${++downloadId}`},
    fetch:fetcher,setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    requestAnimationFrame(){},console};
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,'window.testDownloads={canShareFilesOnMobile,fetchDownloadBlob,downloadError,openDownloadPanel,prepareDownload};})();'),context);
  return {...window.testDownloads,window,document,nodes,prepared,timers};
}
const item=(id)=>({id,kind:'photo',name:id+'.jpg',url:'https://example.invalid/'+id});

test('Android Chrome and desktop never enter the iOS Photos sharing path',()=>{
  assert.equal(fixture().canShareFilesOnMobile(),false);
  assert.equal(fixture({userAgent:'Windows Chrome'}).canShareFilesOnMobile(),false);
  assert.equal(fixture({userAgent:'iPhone Safari'}).canShareFilesOnMobile(),true);
  assert.equal(fixture({userAgent:'Macintosh Safari',platform:'MacIntel'}).canShareFilesOnMobile(),true);
});
test('transient network failures retry once; forbidden and missing files do not retry',async()=>{
  let calls=0;
  const state=fixture({fetcher:async()=>{if(++calls===1)throw new TypeError('network');return new Response('ok');}});
  assert.equal(await (await state.fetchDownloadBlob(item('ok'))).text(),'ok');assert.equal(calls,2);
  for(const status of [403,404,429]){
    calls=0;const f=fixture({fetcher:async()=>{calls++;return new Response('',{status});}});
    await assert.rejects(f.fetchDownloadBlob(item('bad')),error=>error.status===status);assert.equal(calls,1);
    assert.ok(!f.downloadError({status}).includes('configuration Firebase'));
  }
});
test('download size is bounded even when the server omits content-length',async()=>{
  let cancelled=false;
  const state=fixture({fetcher:async()=>new Response(new ReadableStream({
    start(c){c.enqueue(new Uint8Array(20));},cancel(){cancelled=true;}
  }))});
  await assert.rejects(state.fetchDownloadBlob(item('large'),undefined,10),error=>error.code==='large');
  assert.equal(cancelled,true);assert.equal(state.timers.size,0);
});
test('timeouts and user cancellation remain distinct and release timers',async()=>{
  const stalled=(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('abort'),{name:'AbortError'}))));
  const state=fixture({fetcher:stalled});
  const pending=state.fetchDownloadBlob(item('slow'));
  [...state.timers.values()][0]();
  await assert.rejects(pending,error=>error.code==='timeout');assert.equal(state.timers.size,0);
  const controller=new AbortController(), second=state.fetchDownloadBlob(item('cancel'),controller.signal);
  controller.abort();await assert.rejects(second,{name:'AbortError'});assert.equal(state.timers.size,0);
});
test('single Android photo produces an explicit download link without auto-opening it',async()=>{
  const state=fixture();
  assert.equal(state.openDownloadPanel([item('one')]),false);
  const prepare=state.nodes.find(x=>x.tagName==='button'&&x.textContent==='Préparer le téléchargement');
  await prepare.click();
  const link=state.nodes.find(x=>x.download==='one.jpg');
  assert.equal(link.href,'https://example.invalid/Event-app/__download__/download-1');
  assert.equal(link.textContent,'Télécharger (1/1)');
  assert.equal(await state.prepared.get('download-1').blob.text(),'photo');
  state.nodes.find(x=>'close' in x.dataset).click();
});
test('a failed photo does not prevent downloading a partial ZIP or using individual links',async()=>{
  const state=fixture({fetcher:async url=>url.endsWith('/bad')?new Response('',{status:404}):new Response('good')});
  state.openDownloadPanel([item('bad'),item('good')]);
  const prepare=state.nodes.find(x=>x.tagName==='button'&&x.textContent==='Préparer le téléchargement');
  await prepare.click();
  const link=state.nodes.find(x=>x.download==='photos-1.zip');
  assert.equal(link.textContent,'Télécharger (1/2)');
  const zip=new Uint8Array(await state.prepared.get('download-1').blob.arrayBuffer());
  assert.deepEqual([...zip.slice(0,4)],[80,75,3,4]);
  assert.equal(state.nodes.filter(x=>x.tagName==='a'&&x.target==='_blank').length,4);
  assert.ok(state.nodes.some(x=>x.textContent?.includes('Certains fichiers sont absents')));
});
test('a new preparation replaces its link; closing aborts in-flight requests',async()=>{
  let aborted=false;
  const state=fixture({fetcher:async(url,{signal})=>{
    if(url.endsWith('/slow'))return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Object.assign(new Error(),{name:'AbortError'}));}));
    return new Response('photo');
  }});
  state.openDownloadPanel([item('fast'),item('slow')]);
  const buttons=state.nodes.filter(x=>x.textContent==='Préparer le téléchargement');
  await buttons[1].click();
  const firstLink=state.nodes.find(x=>x.download==='fast.jpg');
  const pending=buttons[2].click();assert.ok(!firstLink.parentElement.children.includes(firstLink));
  state.nodes.find(x=>'close' in x.dataset).click();await pending;assert.equal(aborted,true);
  assert.equal(state.timers.size,0);
});
