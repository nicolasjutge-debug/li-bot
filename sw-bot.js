// Service worker volontairement minimal : son seul rôle est de satisfaire le critère
// technique d'installation PWA de Chrome/Edge (présence d'un handler fetch). Il ne met
// RIEN en cache et ne sert jamais de version enregistrée — chaque requête part au réseau
// exactement comme si ce fichier n'existait pas. Objectif : rendre l'app installable sur
// PC sans réintroduire le risque de version périmée déjà rencontré sur iOS.
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
