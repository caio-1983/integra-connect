// Service worker mínimo: só existe para o app ser instalável.
// Não guarda nada em cache — toda requisição vai para a rede, então um
// deploy novo aparece na hora, como no navegador.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
