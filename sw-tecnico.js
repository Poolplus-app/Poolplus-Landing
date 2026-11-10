/* PoolPlus — app del técnico sin señal (9 nov 2026)
   Guarda una copia de la app en el teléfono para que abra aunque no haya señal.
   Siempre intenta primero la versión de internet (así los cambios llegan apenas hay señal);
   solo si no hay respuesta en 5 segundos usa la copia guardada.
   Solo toca las páginas de la app del técnico; todo lo demás pasa directo.
   PARA APAGARLO: reemplazar este archivo por uno que solo haga self.registration.unregister(). */
const CACHE = 'pp-tecnico-v1';
const PAGINAS = ['/tech2.html', '/tech.html'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(['/tech2.html'])).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    for(const k of await caches.keys()) if(k.startsWith('pp-tecnico-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || PAGINAS.indexOf(url.pathname) < 0) return;
  // tech.html solo redirige a tech2: sin señal, se entrega tech2 directo
  const clave = '/tech2.html';
  e.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    try{
      const red = await Promise.race([
        fetch(req),
        new Promise((_, ko)=> setTimeout(()=> ko(new Error('lento')), 5000))
      ]);
      if(red && red.ok && url.pathname === clave) cache.put(clave, red.clone()).catch(()=>{});
      return red;
    }catch(err){
      const guardada = await cache.match(clave);
      if(guardada) return guardada;
      return new Response('<p style="font-family:sans-serif;padding:20px">Sin señal y la app todavía no está guardada en este teléfono. Ábrela una vez con señal.</p>',
        {headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
  })());
});
