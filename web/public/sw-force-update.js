self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) {
        client.navigate(client.url);
      }
    }
  })());
});
