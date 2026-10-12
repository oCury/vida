/*
 * Service worker mínimo.
 *
 * Existe por um motivo só: no iOS, push exige PWA instalado na tela de início
 * E um service worker registrado. NÃO faz cache offline de propósito — cache
 * de dado financeiro desatualizado faria o app mostrar número velho com cara
 * de fresco, que é exatamente o que ele existe para não fazer.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))

self.addEventListener('push', (evento) => {
  if (!evento.data) return
  let aviso
  try {
    aviso = evento.data.json()
  } catch {
    aviso = { titulo: 'Vida', corpo: evento.data.text() }
  }
  evento.waitUntil(
    self.registration.showNotification(aviso.titulo ?? 'Vida', {
      body: aviso.corpo ?? '',
      data: { url: aviso.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = evento.notification.data?.url ?? '/'
  evento.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((janelas) => {
      const aberta = janelas.find((j) => 'focus' in j)
      return aberta ? aberta.focus() : self.clients.openWindow(url)
    }),
  )
})
