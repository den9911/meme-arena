import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {once} from 'node:events';
import {createApp} from '../server/index.mjs';
import {mediaFailure} from '../public/shared/media-state.js';
import {localizeError as english} from '../public/locales/en/shared/editorial.js';
const key='fixture-admin-only';
async function setup(t){
 const dataDir=await mkdtemp(join(tmpdir(),'arena-media-'));let app,base,cookie='';
 async function stop(){if(app?.server.listening)await new Promise(r=>app.server.close(r));}
 t.after(async()=>{await stop();await rm(dataDir,{recursive:true,force:true});});
 return {get app(){return app;},get db(){return app.db;},async start(){await stop();app=await createApp({dataDir,appId:'arena',disableRateLimit:true,adminToken:key});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');base=`http://127.0.0.1:${app.server.address().port}`;},async request(path,{input,method,headers={}}={}){
  const res=await fetch(base+path,{method:method??(input===undefined?'GET':'POST'),headers:{...(cookie?{Cookie:cookie}:{}),...(input===undefined?{}:{'Content-Type':'application/json'}),...headers},...(input===undefined?{}:{body:typeof input==='string'?input:JSON.stringify(input)})});
  if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const text=await res.text();let body;try{body=JSON.parse(text);}catch{body=text;}return {status:res.status,body,headers:res.headers};
 },add(id,status='approved',kind='arena',bytes=1){app.db.prepare('INSERT INTO posts(id,kind,title,owner,status,created,image,mime,bytes) VALUES(?,?,?,?,?,?,?, ?,?)').run(id,kind,'user title','owner',status,Date.now(),Buffer.alloc(bytes), 'image/png',bytes);}};
}
const admin={Authorization:`Bearer ${key}`};

test('404 unknown, 410 removed approved image, and 500 actual SQL failure stay distinct',async t=>{
 const h=await setup(t);await h.start();h.add('public-image');
 const image=await h.request('/media/public-image');assert.equal(image.status,200);assert.match(image.headers.get('cache-control'),/max-age=0.*must-revalidate/);
 assert.equal((await h.request('/media/public-image',{headers:{'If-None-Match':image.headers.get('etag')}})).status,304);
 await h.request('/api/admin/moderate',{input:{id:'public-image',action:'delete'},headers:admin});
 const removed=await h.request('/media/public-image',{headers:{'If-None-Match':image.headers.get('etag')}});assert.equal(removed.status,410);assert.equal(removed.body.code,'media_gone');assert.equal(removed.headers.get('cache-control'),'no-store');
 assert.equal((await h.request('/media/not-known')).status,404);
 assert.equal((await h.request('/media/seed-0')).status,404); // A text-only seed never claimed to have an image.
 const original=console.error,warnings=[];console.error=(...v)=>warnings.push(v.join(' '));t.after(()=>console.error=original);
 h.db.exec('ALTER TABLE posts RENAME TO fixture_private_posts');
 for(const path of ['/api/arena','/media/not-known','/api/arena']){
  const failed=await h.request(path);assert.equal(failed.status,500);assert.equal(failed.body.code,'internal_error');assert.doesNotMatch(JSON.stringify(failed.body),/SQL|fixture_private|no such table/);
 }
 h.db.exec('ALTER TABLE fixture_private_posts RENAME TO posts');assert.equal(warnings.length,1);assert.doesNotMatch(warnings[0],/SQL|fixture_private|no such table/);
 assert.equal((await h.request('/api/arena')).status,200);
 await h.start();assert.equal((await h.request('/media/public-image')).status,410);
 assert.deepEqual(h.db.prepare('PRAGMA table_info(public_media_gone)').all().map(x=>x.name),['id','kind']);
});

test('pending media is private, deletion reveals no publication history, HEAD does not load a BLOB',async t=>{
 const h=await setup(t);await h.start();h.add('private-image','pending');h.add('public-image');h.add('other-project','approved','finds');
 const prepare=h.db.prepare.bind(h.db);h.db.prepare=sql=>{if(sql==='SELECT image FROM posts WHERE id=?')throw new Error('private-blob-read');return prepare(sql);};
 assert.equal((await h.request('/media/private-image')).status,401);
 const head=await h.request('/media/public-image',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.body,'');assert.equal(head.headers.get('content-length'),'1');
 assert.equal((await h.request('/media/other-project')).status,404);
 h.db.prepare=prepare;
 const privateImage=await h.request('/media/private-image',{headers:admin});assert.equal(privateImage.status,200);assert.equal(privateImage.headers.get('cache-control'),'no-store');
 await h.request('/api/admin/moderate',{headers:admin,input:{id:'private-image',action:'delete'}});
 assert.equal((await h.request('/media/private-image')).status,404);assert.equal(h.db.prepare('SELECT COUNT(*) n FROM public_media_gone').get().n,0);
 for(let i=0;i<20;i++)assert.equal((await h.request(`/media/unknown-${i}`)).status,404);
 assert.equal((await h.request('/media/'+'x'.repeat(51))).status,404);
 assert.equal(h.db.prepare('SELECT COUNT(*) n FROM public_media_gone').get().n,0);
});

test('missing stored payload gives 410; oversized legacy payload fails without loading it',async t=>{
 const h=await setup(t);await h.start();h.add('lost-image');h.db.exec("UPDATE posts SET image=NULL WHERE id='lost-image'");
 assert.equal((await h.request('/media/lost-image')).status,410);
 assert.ok(!(await h.request('/api/arena')).body.leaders.some(p=>p.id==='lost-image'));
 h.add('too-large','approved','arena',500001);const prepare=h.db.prepare.bind(h.db);h.db.prepare=sql=>{assert.notEqual(sql,'SELECT image FROM posts WHERE id=?');return prepare(sql);};
 const original=console.error;console.error=()=>{};t.after(()=>console.error=original);
 const result=await h.request('/media/too-large');assert.equal(result.status,500);assert.equal(result.body.code,'internal_error');h.db.prepare=prepare;
});

test('same-pair same-winner retry after restart is idempotent and a different winner is rejected',async t=>{
 const h=await setup(t);await h.start();const input={a:'seed-0',b:'seed-1',winner:'seed-0'};
 assert.equal((await h.request('/api/arena/vote',{input})).body.duplicate,false);
 await h.start();assert.equal((await h.request('/api/arena/vote',{input:{...input,a:'seed-1',b:'seed-0'}})).body.duplicate,true);
 assert.equal((await h.request('/api/arena/vote',{input:{...input,winner:'seed-1'}})).status,409);
 assert.equal(h.db.prepare("SELECT votes FROM posts WHERE id='seed-0'").get().votes,1);assert.equal(h.db.prepare("SELECT COUNT(*) n FROM votes WHERE scope='arena'").get().n,1);
 assert.equal((await h.request('/api/arena/vote',{input:' '.repeat(1025)})).status,413);
});

test('retirement write failure preserves the image; repeating moderation never reduces usage twice',async t=>{
 const h=await setup(t);await h.start();h.add('keep-until-committed');
 h.db.exec("CREATE TRIGGER fail_retire BEFORE INSERT ON public_media_gone BEGIN SELECT RAISE(ABORT,'private-retirement-error'); END");
 const original=console.error;console.error=()=>{};t.after(()=>console.error=original);
 const request={headers:admin,input:{id:'keep-until-committed',action:'delete'}};
 assert.equal((await h.request('/api/admin/moderate',request)).status,500);assert.equal((await h.request('/media/keep-until-committed')).status,200);
 assert.equal(h.db.prepare('SELECT bytes FROM uploads_usage').get().bytes,1);
 h.db.exec('DROP TRIGGER fail_retire');
 assert.equal((await h.request('/api/admin/moderate',request)).status,200);assert.equal((await h.request('/api/admin/moderate',request)).status,200);
 assert.equal(h.db.prepare('SELECT bytes FROM uploads_usage').get().bytes,0);assert.equal(h.db.prepare('SELECT COUNT(*) n FROM public_media_gone').get().n,1);
 assert.equal(h.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
});

test('media failure copy distinguishes gone/missing from retryable failures in both languages',()=>{
 assert.equal(mediaFailure(404).retry,false);assert.equal(mediaFailure(410).retry,false);
 assert.notEqual(mediaFailure(404).message,mediaFailure(410).message);
 for(const status of [0,200,429,500])assert.equal(mediaFailure(status).retry,true);
 for(const status of [404,410])assert.doesNotMatch(english(mediaFailure(status).message),/[А-Яа-яЁё]/);
});
