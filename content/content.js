"use strict";

(async () => {
  const settings = await browser.runtime
    .sendMessage({ type: "GET_SETTINGS" })
    .catch(() => null);

  if (!settings || !settings.enabled) return;

  RadarCenLogger.init(settings.debug);

  const PRODUCT_SEL = ".cat-prod-row, .cat-prod-box";
  const PID_ATTR = "data-pid";

  function scanPage() {
    RadarCenLogger.log("Scanning page for products");
    document.querySelectorAll(PRODUCT_SEL).forEach((el) => {
      const pid = el.getAttribute(PID_ATTR);
      if (pid) RadarCenQueue.enqueue(pid, el, settings);
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.addedNodes.length > 0)) scanPage();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") window.location.reload();
  });

  RadarCenLogger.log("Script initialized");
  scanPage();
  observer.observe(document.body, { childList: true, subtree: true });
})();
