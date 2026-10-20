export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const start = () => {
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      const update = () => {
        void registration.update();
      };
      update();
      window.setInterval(update, 30 * 60 * 1000);
    });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
