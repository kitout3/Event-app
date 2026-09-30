import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

function exporter() {
  const context={window:{},TextEncoder,Uint8Array,DataView,ReadableStream,AbortController,fetch};
  vm.runInNewContext(readFileSync(new URL('../public/photo-zip.js',import.meta.url),'utf8'),context);
  return context.window.EventPhotoZip;
}

test('one valid ZIP contains all 237 photos with original bytes and unique UTF-8 filenames',async()=>{
  const photos=Array.from({length:237},(_,i)=>({id:String(i),name:'été.jpg',url:'https://example.invalid/'+i}));
  const fetched=[],progress=[];
  const stream=exporter().stream(photos,{
    fetcher:async url=>{const id=Number(url.split('/').at(-1));fetched.push(id);return new Response(Uint8Array.of(id,255,0,3));},
    onProgress:(done,total)=>progress.push([done,total]),
  });
  const bytes=Buffer.from(await new Response(stream).arrayBuffer());
  const result=JSON.parse(execFileSync('python3',['-c',`
import sys,zipfile,io,json
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
    names=z.namelist()
    assert len(names)==237 and len(set(names))==237
    assert z.testzip() is None
    for i,name in enumerate(names):
        assert name.endswith('été.jpg') and z.read(name)==bytes([i,255,0,3])
    print(json.dumps({'count':len(names),'last':names[-1]}))
`],{input:bytes,encoding:'utf8'}));
  assert.equal(result.count,237);assert.equal(fetched.length,237);
  assert.deepEqual(progress.at(-1),[237,237]);
});

test('a failed photo aborts the complete ZIP rather than silently exporting a partial collection',async()=>{
  let fetched=0;
  const stream=exporter().stream([{url:'ok',name:'a.jpg'},{url:'fail',name:'b.jpg'},{url:'never',name:'c.jpg'}],{
    fetcher:async url=>{fetched++;return new Response('image',{status:url==='fail'?403:200});},
  });
  await assert.rejects(new Response(stream).arrayBuffer(),/Photo 2: HTTP 403/);
  assert.equal(fetched,2);
});
