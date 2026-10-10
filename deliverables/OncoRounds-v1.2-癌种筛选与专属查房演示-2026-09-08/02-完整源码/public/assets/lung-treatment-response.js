(() => {
  const CASE_TITLE = "一例 ROS1 融合肺癌精准治疗临床病例分享";
  const CARD_SELECTOR = "[data-lung-treatment-response]";
  const HOME_LUNG_IMAGE = "./assets/cases/lung-ros1-home.png";
  const caseContentCache = new Map();

  let activeCaseTitle = "";
  let activeReviewLayer = null;
  let reviewTriggerForFocus = null;

  const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() ?? "";

  function syncResponseCard() {
    const homeLungImage = document.querySelector(
      '.home-screen .featured-case-art img[src$="lung-ros1.png"]',
    );
    if (homeLungImage) homeLungImage.setAttribute("src", HOME_LUNG_IMAGE);

    document
      .querySelectorAll(`main.overview-screen ${CARD_SELECTOR}`)
      .forEach((card) => card.remove());
  }

  function cloneCaseSection(section) {
    const clone = section.cloneNode(true);
    const responseCard = clone.querySelector(CARD_SELECTOR);
    const responseTitle = clone.querySelector("#lung-treatment-response-title");
    if (responseCard && responseTitle) {
      responseTitle.id = "case-review-lung-treatment-response-title";
      responseCard.setAttribute(
        "aria-labelledby",
        "case-review-lung-treatment-response-title",
      );
    }
    return clone;
  }

  function cacheVisibleOverview() {
    const overview = document.querySelector("main.overview-screen");
    const title = normalizeText(overview?.querySelector("h1")?.textContent);
    if (!overview || !title) return;

    activeCaseTitle = title;
    const record = caseContentCache.get(title) ?? {};
    const summary = overview.querySelector(
      '.summary-list[aria-label="病例摘要"]',
    );
    if (summary) record.summary = cloneCaseSection(summary);
    caseContentCache.set(title, record);
  }

  function closeReviewLayer() {
    if (!activeReviewLayer) return;
    document.removeEventListener("keydown", handleReviewKeydown);
    document.body.classList.remove("case-review-open");
    document.querySelector("main.round-screen")?.removeAttribute("aria-hidden");
    activeReviewLayer.remove();
    activeReviewLayer = null;
    reviewTriggerForFocus?.focus();
    reviewTriggerForFocus = null;
  }

  function handleReviewKeydown(event) {
    if (event.key === "Escape") closeReviewLayer();
  }

  function openReviewLayer(trigger) {
    const record = caseContentCache.get(activeCaseTitle);
    if (!record?.summary || activeReviewLayer) return;

    const appFrame = document.querySelector(".app-frame");
    const round = document.querySelector("main.round-screen");
    if (!appFrame || !round) return;

    const layer = document.createElement("section");
    layer.className = "case-review-layer";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    layer.setAttribute("aria-labelledby", "case-review-title");
    layer.innerHTML = `
      <header class="case-review-header">
        <button class="case-review-close" type="button">← 返回答题</button>
        <div>
          <span>CASE REVIEW</span>
          <h2 id="case-review-title">病例资料</h2>
        </div>
      </header>
      <div class="case-review-scroll">
        <div data-review-panel="summary"></div>
      </div>`;

    layer.querySelector('[data-review-panel="summary"]').append(
      cloneCaseSection(record.summary),
    );
    layer.querySelector(".case-review-close").addEventListener("click", closeReviewLayer);

    reviewTriggerForFocus = trigger;
    activeReviewLayer = layer;
    round.setAttribute("aria-hidden", "true");
    document.body.classList.add("case-review-open");
    document.addEventListener("keydown", handleReviewKeydown);
    appFrame.append(layer);
    layer.querySelector(".case-review-close").focus();
  }

  function ensureReviewTrigger() {
    const round = document.querySelector("main.round-screen");
    // Updated React screens own the complete, data-driven review dialog.
    // Keep the legacy enhancement available for older screens.
    if (round?.hasAttribute("data-react-review")) {
      closeReviewLayer();
      return;
    }
    if (!round) {
      closeReviewLayer();
      return;
    }

    const record = caseContentCache.get(activeCaseTitle);
    const isReady = Boolean(record?.summary);
    const existingTrigger = round.querySelector(".case-review-trigger");
    if (existingTrigger) {
      existingTrigger.disabled = !isReady;
      return;
    }

    const liveDot = round.querySelector(".round-header .live-dot");
    if (!liveDot) return;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "case-review-trigger";
    trigger.textContent = "回顾病例资料";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.disabled = !isReady;
    trigger.addEventListener("click", () => openReviewLayer(trigger));
    liveDot.replaceWith(trigger);
  }

  function syncAppEnhancements() {
    syncResponseCard();
    cacheVisibleOverview();
    ensureReviewTrigger();
  }

  new MutationObserver(syncAppEnhancements).observe(document.getElementById("root"), {
    childList: true,
    subtree: true,
  });
  syncAppEnhancements();
})();
