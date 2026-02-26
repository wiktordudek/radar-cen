"use strict";

const DEFAULT_SETTINGS = {
  enabled: true,
  debug: false,
  minDelay: 500,
  maxDelay: 1500,
  apiTimeout: 5000,
  cacheTTL: 24,
  cacheMaxSize: 300,
  thresholdBest: 0.5,
  thresholdGood: 5.0,
};

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    browser.storage.sync.set(DEFAULT_SETTINGS);
  }
});

browser.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "FETCH_PRICE":
      return fetchPriceHistory(message.pid)
        .then((minPrice) => ({ ok: true, minPrice }))
        .catch((err) => ({ ok: false, error: err.message }));

    case "GET_SETTINGS":
      return browser.storage.sync
        .get(DEFAULT_SETTINGS)
        .catch(() => DEFAULT_SETTINGS);

    default:
      return Promise.resolve({
        ok: false,
        error: `Invalid message type: ${message.type}`,
      });
  }
});

async function fetchPriceHistory(pid) {
  const url = `https://www.ceneo.pl/PriceHistoryForProduct?productId=${pid}&_=${Date.now()}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return extractMinPrice(data);
}

function extractMinPrice(data) {
  const prices = data?.HistoricalPrices;
  if (!prices?.length) return null;

  const min = prices.reduce(
    (lowest, { Price }) => (Price > 0 && Price < lowest ? Price : lowest),
    Infinity,
  );

  return min === Infinity ? null : min;
}
