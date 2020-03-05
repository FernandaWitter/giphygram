// SW version
const version = "1.1";

// Static Cache - App Shell
const appAssets = [
  '/',
  'index.html',
  'main.js',
  'images/flame.png',
  'images/logo.png',
  'images/sync.png',
  'vendor/bootstrap.min.css',
  'vendor/jquery.min.js'
];

// SW Install
self.addEventListener('install', e => {
  let cacheReady = caches.open(`static-${version}`)
    .then((cache) => {
        cache.addAll(appAssets);
    });
  e.waitUntil(cacheReady);
})

self.addEventListener('activate', e => {

  // Clean static cache
let cleaned = caches.keys().then( keys => {
    keys.forEach( key => {
        if ( key !== `static-${version}` && key.match('static-') ) {
            return caches.delete(key);
        }
    });
});
e.waitUntil(cleaned);
});

// Static cache strategy: cache with network fallback
const staticCache = (req, cacheName = `static-${version}` ) => {
    return caches.match(req).then(res => {
      if(res) return res;
      return fetch(req).then( newRes => {
        caches.open(cacheName).then(cache => {
          cache.put(req, newRes);
      })
      return newRes.clone();
    })
  })
}

// Gif cache strategy: newtwork with cachef fallback
const fallbackCache = (req) => {
  return fetch(req).then(newRes => {
    if(!newRes.ok) throw 'Fetch error';
    caches.open(`static-${version}`).then(cache => {
      cache.put(req, newRes);
    })
    return newRes.clone();
  }).catch(err => {return caches.match(req)})
}


// Clean out old Giphys from cache
const cleanGiphyCache = (giphys) => {
  // Open giphy cache
  caches.open('giphy').then(cache => {
    // list all keys
    cache.keys().then(keys => {
      // loop through keys (previously stored urls)
      keys.forEach((key) => {
        // if the gif is not in use, delete it from cache
        if(!giphys.includes(key.url)) cache.delete(key);
      });

    })
  })
}


self.addEventListener('fetch', e => {
  // Identify app shell
  if(e.request.url.match(location.origin)){
    e.respondWith(staticCache(e.request));
  }

  // Identify Giphy requests
  else if (e.request.url.match('api.giphy.com/v1/gifs/trending')){
    e.respondWith(fallbackCache(e.request));
  }

  // Identify gif requests
  // it uses static caching because gifs themselves are never updated, but specifies a different cache so data is not lost on SW update
  else if (e.request.url.match('giphy.com/media')){
    e.respondWith(staticCache(e.request, 'giphy'))
  }
})

self.addEventListener('message', e => {
  // Identify message
  if(e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})
