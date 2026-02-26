"use strict";

function readField(name) {
  const el = document.getElementById(name);
  if (!el) return undefined;
  return el.type === "checkbox" ? el.checked : parseFloat(el.value);
}

function writeField(name, value) {
  const el = document.getElementById(name);
  if (!el) return;
  el.type === "checkbox" ? (el.checked = Boolean(value)) : (el.value = value);
}

function populateForm(settings) {
  for (const key of Object.keys(settings)) {
    writeField(key, settings[key]);
  }
}

function collectForm(keys) {
  return Object.fromEntries(keys.map((key) => [key, readField(key)]));
}

function validateSettings(s) {
  const errors = [];
  if (s.minDelay >= s.maxDelay)
    errors.push("Minimalne opóźnienie musi być mniejsze niż maksymalne.");
  if (s.thresholdBest >= s.thresholdGood)
    errors.push(
      'Próg „historyczne minimum" musi być mniejszy niż próg „dobra cena".',
    );
  if (s.cacheTTL < 1)
    errors.push("Czas życia cache musi wynosić co najmniej 1 godzinę.");
  return errors;
}

let bannerTimer = null;

function showSavedBanner() {
  const banner = document.getElementById("saved-banner");
  banner.classList.remove("banner--hidden");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.add("banner--hidden"), 2200);
}

function clearCacheInTab() {
  localStorage.removeItem("radarCen_priceCache");
}

async function clearCacheOnAllCeneoTabs() {
  const tabs = await browser.tabs.query({ url: "https://www.ceneo.pl/*" });
  await Promise.all(
    tabs.map((tab) =>
      browser.scripting
        .executeScript({ target: { tabId: tab.id }, func: clearCacheInTab })
        .catch(() => {}),
    ),
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  let currentSettings;
  try {
    currentSettings = await browser.runtime.sendMessage({
      type: "GET_SETTINGS",
    });
  } catch (err) {
    alert(`Cannot load settings: ${err.message}`);
    return;
  }

  const settingsKeys = Object.keys(currentSettings);
  populateForm(currentSettings);

  document
    .getElementById("settings-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const newSettings = collectForm(settingsKeys);
      const errors = validateSettings(newSettings);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
      try {
        await browser.storage.sync.set(newSettings);
        showSavedBanner();
      } catch (err) {
        alert(`Błąd zapisu: ${err.message}`);
      }
    });

  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("Przywrócić domyślne ustawienia?")) return;
    try {
      // Usuń wszystkie klucze — background przy GET_SETTINGS zwróci defaults
      await browser.storage.sync.remove(settingsKeys);
      const defaults = await browser.runtime.sendMessage({
        type: "GET_SETTINGS",
      });
      populateForm(defaults);
      await browser.storage.sync.set(defaults);
      showSavedBanner();
    } catch (err) {
      alert(`Błąd zapisu: ${err.message}`);
    }
  });

  document
    .getElementById("clear-cache-btn")
    .addEventListener("click", async () => {
      try {
        await clearCacheOnAllCeneoTabs();
        alert("Cache został wyczyszczony.");
      } catch (err) {
        alert(`Błąd czyszczenia cache: ${err.message}`);
      }
    });
});
