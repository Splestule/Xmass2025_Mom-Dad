// public/push-sw.js

self.addEventListener('push', function (event) {
    console.log('[SW] Push Received:', event);
    if (event.data) {
        let payload;
        try {
            payload = event.data.json();
            console.log('[SW] Payload:', payload);
        } catch (e) {
            console.error('[SW] JSON Parse Fail:', e);
            payload = { title: 'New Notification', body: event.data.text() };
        }
        const options = {
            body: payload.body,
            icon: '/icon.png', // Ensure this exists in public/
            badge: '/icon.png',
            data: {
                url: payload.url || '/'
            },
            // macOS action buttons (optional)
            /* actions: [
                { action: 'view', title: 'View' }
            ] */
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // If so, just focus it.
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, then open the target URL in a new window/tab.
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
