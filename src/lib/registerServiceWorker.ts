export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const offerUpdate = (worker: ServiceWorker) => {
        const notice = document.createElement('div');
        notice.setAttribute('role', 'status');
        notice.className = 'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl bg-gray-900 p-4 text-sm text-white shadow-lg';
        notice.innerHTML = '<span>An update is ready.</span>';
        const button = document.createElement('button');
        button.textContent = 'Update now';
        button.className = 'ml-3 rounded-xl bg-white px-3 py-2 font-medium text-gray-900';
        button.onclick = () => { worker.postMessage('SKIP_WAITING'); button.disabled = true; };
        notice.append(button);
        document.body.append(notice);
      };
      if (registration.waiting) offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
