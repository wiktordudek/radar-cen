"use strict";

const RadarCenRenderer = (() => {
  const SEL = {
    priceContainer: ".cat-prod-row__price, .cat-prod-box__price",
    priceValue: ".value",
    pricePenny: ".penny",
    wrapper: ".ph-wrapper",
  };

  const formatPrice = (n) => `${n.toFixed(2).replace(".", ",")} zł`;

  function parsePriceFromElement(productEl) {
    const valueEl = productEl.querySelector(SEL.priceValue);
    if (!valueEl) return null;

    const pennyEl = productEl.querySelector(SEL.pricePenny);
    const intPart = valueEl.innerText.replace(/\D/g, "");
    const decPart = pennyEl ? pennyEl.innerText.replace(",", ".") : ".00";
    const price = parseFloat(intPart + decPart);
    return isNaN(price) ? null : price;
  }

  function getOrCreateWrapper(productEl) {
    const existing = productEl.querySelector(SEL.wrapper);
    if (existing) return existing;

    const container = productEl.querySelector(SEL.priceContainer);
    if (!container) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "ph-wrapper";
    container.appendChild(wrapper);
    return wrapper;
  }

  function buildBadgeHTML(currentPrice, histMin, settings) {
    if (currentPrice === null) {
      return `<div class="ph-badge">
        <div class="ph-title">❌️ Brak ceny aktualnej</div>
        <span class="ph-detail">min. ${formatPrice(histMin)}</span>
      </div>`;
    }

    const pct = ((currentPrice - histMin) / histMin) * 100;

    if (pct <= settings.thresholdBest) {
      return `<div class="ph-badge is-best">
        <div class="ph-title">💎 Historyczne minimum</div>
        <div class="ph-detail">min. ${formatPrice(histMin)}</div>
      </div>`;
    }

    if (pct <= settings.thresholdGood) {
      return `<div class="ph-badge is-good">
        <div class="ph-title">👌 Dobra cena</div>
        <div class="ph-detail">+${pct.toFixed(1)}% (min. ${formatPrice(histMin)})</div>
      </div>`;
    }

    return `<div class="ph-badge is-bad">
      <div class="ph-title">
        <span>📈 Wysoka cena</span>
        <span class="ph-percent">+${pct.toFixed(0)}%</span>
      </div>
      <div class="ph-detail">+${pct.toFixed(1)}% (min. ${formatPrice(histMin)})</div>
    </div>`;
  }

  return {
    showLoader(productEl) {
      const wrapper = getOrCreateWrapper(productEl);
      if (wrapper) wrapper.innerHTML = '<div class="ph-skeleton"></div>';
    },

    showBadge(productEl, histMin, settings) {
      const wrapper = productEl.querySelector(SEL.wrapper);
      if (!wrapper) return;

      if (!histMin) {
        wrapper.innerHTML =
          '<div class="ph-badge"><span class="ph-detail">Brak historii</span></div>';
        return;
      }

      wrapper.innerHTML = buildBadgeHTML(
        parsePriceFromElement(productEl),
        histMin,
        settings,
      );
    },

    showError(productEl, message) {
      const wrapper = productEl.querySelector(SEL.wrapper);
      if (wrapper) {
        wrapper.innerHTML = `<div class="ph-badge">
          <span class="ph-detail" style="color:red">${message}</span>
        </div>`;
      }
    },

    hasWrapper(productEl) {
      return !!productEl.querySelector(SEL.wrapper);
    },
  };
})();
