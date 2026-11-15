/* Qurʼon service worker: the site opens without internet, everything once read stays readable,
   saved recitations are played from the device (the page turns them into local files itself). */
const SHELL='quron-shell-v5',API='quron-api-v1',FONTS='quron-fonts-v1',AUDIO='quron-audio';
const FILES=['./','index.html','app.css','app.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>![SHELL,API,FONTS,AUDIO].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const API_HOSTS=['api.quran.com','api.qurancdn.com','api.alquran.cloud','www.mp3quran.net'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com','verses.quran.foundation'];
const timeout=(p,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
  if(req.headers.has('range'))return;
  if(u.origin===location.origin){
    /* newest version when online, the saved copy when the network is slow or absent */
    e.respondWith(caches.open(SHELL).then(async c=>{
      try{const r=await timeout(fetch(req),4000);if(r.ok)c.put(req,r.clone());return r}
      catch(err){return (await c.match(req,{ignoreSearch:true}))||(req.mode==='navigate'&&(await c.match('index.html')))||fetch(req)}}));return}
  if(API_HOSTS.includes(u.hostname)){
    /* Qurʼon text does not change: answer from the saved copy at once and refresh it quietly */
    e.respondWith(caches.open(API).then(async c=>{
      const hit=await c.match(req.url);
      const net=fetch(req).then(r=>{if(r.ok)c.put(req.url,r.clone());return r});
      if(hit){net.catch(()=>{});return hit}
      try{return await net}catch(err){return new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}})}}));return}
  if(FONT_HOSTS.includes(u.hostname)){
    e.respondWith(caches.open(FONTS).then(async c=>{const hit=await c.match(req.url);if(hit)return hit;const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req.url,r.clone());return r}));return}
});
