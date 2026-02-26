"use strict";

const RadarCenQueue = (() => {
  const PID_ATTR = "data-pid";

  const pending = [];
  const enqueuedPids = new Set();
  let isProcessing = false;

  function randomDelay(settings) {
    return Math.floor(
      Math.random() * (settings.maxDelay - settings.minDelay + 1) +
        settings.minDelay,
    );
  }

  function updateAllInstances(pid, minPrice, settings) {
    document
      .querySelectorAll(`[${PID_ATTR}="${pid}"]`)
      .forEach((el) => RadarCenRenderer.showBadge(el, minPrice, settings));
  }

  function showErrorOnAllInstances(pid, message) {
    document
      .querySelectorAll(`[${PID_ATTR}="${pid}"]`)
      .forEach((el) => RadarCenRenderer.showError(el, message));
  }

  async function fetchAndRender(pid, settings) {
    try {
      RadarCenLogger.log(`Fetching price for ${pid}`);

      const reply = await browser.runtime.sendMessage({
        type: "FETCH_PRICE",
        pid,
      });
      if (!reply.ok) throw new Error(reply.error);

      if (reply.minPrice !== null) {
        LFUCache.set(pid, reply.minPrice, settings.cacheMaxSize);
      }
      updateAllInstances(pid, reply.minPrice, settings);
    } catch (err) {
      const label =
        err.message === "Timeout"
          ? "Brak odpowiedzi"
          : "Błąd API. Zaloguj się do Ceneo";
      showErrorOnAllInstances(pid, label);
    }
  }

  async function processNext(settings) {
    if (isProcessing || pending.length === 0) return;
    isProcessing = true;

    const pid = pending.shift();
    const cached = LFUCache.get(pid, settings.cacheTTL);

    if (cached !== null) {
      updateAllInstances(pid, cached, settings);
    } else {
      await fetchAndRender(pid, settings);
    }

    setTimeout(() => {
      isProcessing = false;
      processNext(settings);
    }, randomDelay(settings));
  }

  return {
    enqueue(pid, el, settings) {
      if (RadarCenRenderer.hasWrapper(el)) return;

      RadarCenRenderer.showLoader(el);

      const cached = LFUCache.get(pid, settings.cacheTTL);
      if (cached !== null) {
        RadarCenLogger.log(`Cache hit for product ${pid}: ${cached}`);
        RadarCenRenderer.showBadge(el, cached, settings);
        return;
      }

      if (!enqueuedPids.has(pid)) {
        enqueuedPids.add(pid);
        pending.push(pid);
        processNext(settings);
      }
    },
  };
})();
