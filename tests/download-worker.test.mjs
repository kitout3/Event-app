import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/download-worker.js',import.meta.url),'utf8');

function cacheStorage() {
  const stores=new Map();
  return {
    async open(name) {
      if(!stores.has(name)) stores.set(name,new Map());
      const store=stores.get(name);
      const key=request=>typeof request==='string'?request:request.url;
      return {
        async put(request,response){store.set(key(request),response.clone());},
        async match(request,{ignoreSearch=false}={}){
          const wanted=key(request);
          if(!ignoreSearch)return store.get(wanted)?.clone();
          const clean=new URL(wanted);clean.search='';
          for(const [url,response] of store){const candidate=new URL(url);candidate.search='';if(candidate.href===clean.href)return response.clone();}
        },
        async keys(){return [...store.keys()].map(url=>new Request(url));},
        async delete(request,{ignoreSearch=false}={}){
          const wanted=key(request);
          if(!ignoreSearch)return store.delete(wanted);
          const clean=new URL(wanted);clean.search='';
          for(const url of store.keys()){const candidate=new URL(url);candidate.search='';if(candidate.href===clean.href)return store.delete(url);}
          return false;
        },
      };
    },
  };
}

function workerRuntime(caches) {
  const handlers={};
  const self={
    location:{origin:'https://kitout3.github.io'},
    registration:{scope:'https://kitout3.github.io/Event-app/__download__/'},
    clients:{claim:async()=>{}},skipWaiting(){},
    addEventListener(type,handler){handlers[type]=handler;},
  };
  vm.runInNewContext(source,{self,caches,URL,Blob,Response,Request,Date,Promise,encodeURIComponent,String,Number});
  return handlers;
}

test('prepared ZIP survives a worker restart and keeps a real ZIP filename',async()=>{
  const caches=cacheStorage();
  const first=workerRuntime(caches);
  const replies=[];let preparation;
  first.message({
    data:{type:'PREPARE_MEDIA_DOWNLOAD',id:'android-zip-1',name:'photos-1.zip',blob:new Blob(['PK\u0003\u0004'],{type:'application/zip'})},
    ports:[{postMessage:value=>replies.push(value)}],
    waitUntil:promise=>{preparation=promise;},
  });
  await preparation;
  assert.equal(replies.length,1);
  assert.equal(replies[0].ok,true);

  // A fresh runtime simulates Chrome stopping and restarting the service worker
  // before Android's download manager consumes the URL.
  const restarted=workerRuntime(caches);let responsePromise;
  restarted.fetch({
    request:new Request('https://kitout3.github.io/Event-app/__download__/android-zip-1'),
    respondWith:promise=>{responsePromise=promise;},
  });
  const response=await responsePromise;
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'application/zip');
  assert.match(response.headers.get('content-disposition'),/filename="photos-1\.zip"/);
  assert.doesNotMatch(response.headers.get('content-disposition'),/\.html/);
  assert.equal(await response.text(),'PK\u0003\u0004');
});
