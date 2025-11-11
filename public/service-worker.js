/* eslint-disable no-undef */
const WORKBOX_VERSION = "6.5.4";

self.skipWaiting();

importScripts(
  `https://storage.googleapis.com/workbox-cdn/releases/${WORKBOX_VERSION}/workbox-sw.js`
);

if (self.workbox) {
  self.workbox.core.clientsClaim();

  const precacheManifest = self.__WB_MANIFEST || [];
  self.workbox.precaching.precacheAndRoute(precacheManifest);

  const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
  const navigationHandler =
    self.workbox.precaching.createHandlerBoundToURL("/dashboard");

  self.workbox.routing.registerRoute(
    new self.workbox.routing.NavigationRoute((options) => {
      if (!options.request.url.startsWith(self.location.origin)) {
        return undefined;
      }

      const pathname = new URL(options.request.url).pathname;
      if (fileExtensionRegexp.test(pathname)) {
        return undefined;
      }

      return navigationHandler(options);
    })
  );

  self.workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "style" || request.destination === "script",
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: "static-resources",
    })
  );

  self.workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith("/api"),
    new self.workbox.strategies.NetworkFirst({
      cacheName: "api-cache",
      networkTimeoutSeconds: 5,
    })
  );
} else {
  console.warn("Workbox failed to load. Offline support disabled.");
}
