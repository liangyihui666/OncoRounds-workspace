(() => {
  const CASE_TITLE = "一例 ROS1 融合肺癌精准治疗临床病例分享";
  const CARD_SELECTOR = "[data-lung-treatment-response]";
  const HOME_LUNG_IMAGE = "./assets/cases/lung-ros1-home.png";
  const caseContentCache = new Map();

  let activeCaseTitle = "";
  let activeReviewLayer = null;
  let reviewTriggerForFocus = null;
  let hydrationCaseTitle = "";

  const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() ?? "";
  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  function syncResponseCard() {
    const homeLungImage = document.querySelector(
      '.home-screen .featured-case-art img[src$="lung-ros1.png"]',
    );
    if (homeLungImage) homeLungImage.setAttribute("src", HOME_LUNG_IMAGE);

    const overview = document.querySelector("main.overview-screen");
    const summary = overview?.querySelector(
      '.summary-list[aria-label="病例摘要"]',
    );
    const isTargetCase =
      overview?.querySelector("h1")?.textContent?.trim() === CASE_TITLE;
    const existingCard = overview?.querySelector(CARD_SELECTOR);

    if ((!summary || !isTargetCase) && existingCard) existingCard.remove();
    if (!summary || !isTargetCase || existingCard) return;

    const card = document.createElement("article");
    card.className = "treatment-response-card";
    card.dataset.lungTreatmentResponse = "";
    card.setAttribute("aria-labelledby", "lung-treatment-response-title");
    card.innerHTML = `
      <div class="treatment-response-heading">
        <span>疗效影像</span>
        <h2 id="lung-treatment-response-title">疗效影像评估</h2>
      </div>
      <figure>
        <img src="./assets/cases/lung-treatment-response.png" alt="肺癌基线及治疗后影像疗效对比，治疗后持续达到部分缓解" />
        <figcaption>基线及治疗后影像对比，最佳疗效 PR</figcaption>
      </figure>`;
    summary.append(card);
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
    const timeline = overview.querySelector('section.timeline[aria-label="病程轴"]');

    if (summary) record.summary = cloneCaseSection(summary);
    if (timeline) record.timeline = cloneCaseSection(timeline);
    caseContentCache.set(title, record);
  }

  function findOverviewTab(overview, label) {
    return [...overview.querySelectorAll('[role="tab"]')].find(
      (tab) => normalizeText(tab.textContent) === label,
    );
  }

  async function hydrateCaseContent() {
    const overview = document.querySelector("main.overview-screen");
    const title = normalizeText(overview?.querySelector("h1")?.textContent);
    if (!overview || !title || hydrationCaseTitle === title) return;

    const record = caseContentCache.get(title) ?? {};
    const missingTab = !record.summary
      ? "病例摘要"
      : !record.timeline
        ? "病程轴"
        : null;
    if (!missingTab) return;

    const selectedTab = normalizeText(
      overview.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    );
    hydrationCaseTitle = title;
    overview.classList.add("case-review-capturing");

    try {
      findOverviewTab(overview, missingTab)?.click();
      await nextFrame();
      await nextFrame();
      syncResponseCard();
      cacheVisibleOverview();

      const currentOverview = document.querySelector("main.overview-screen");
      if (currentOverview && selectedTab && selectedTab !== missingTab) {
        findOverviewTab(currentOverview, selectedTab)?.click();
        await nextFrame();
        syncResponseCard();
        cacheVisibleOverview();
      }
    } finally {
      document
        .querySelector("main.overview-screen")
        ?.classList.remove("case-review-capturing");
      hydrationCaseTitle = "";
    }
  }

  function setReviewTab(layer, tabName) {
    layer.querySelectorAll('[role="tab"]').forEach((tab) => {
      const isActive = tab.dataset.reviewTab === tabName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    layer.querySelectorAll("[data-review-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.reviewPanel !== tabName;
    });
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
    if (!record?.summary || !record?.timeline || activeReviewLayer) return;

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
      <div class="case-review-tabs" role="tablist" aria-label="病例资料">
        <button type="button" role="tab" data-review-tab="summary" aria-selected="true" class="is-active">病例摘要</button>
        <button type="button" role="tab" data-review-tab="timeline" aria-selected="false">病程轴</button>
      </div>
      <div class="case-review-scroll">
        <div data-review-panel="summary"></div>
        <div data-review-panel="timeline" hidden></div>
      </div>`;

    layer.querySelector('[data-review-panel="summary"]').append(
      cloneCaseSection(record.summary),
    );
    layer.querySelector('[data-review-panel="timeline"]').append(
      cloneCaseSection(record.timeline),
    );
    layer.querySelector(".case-review-close").addEventListener("click", closeReviewLayer);
    layer.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.addEventListener("click", () => setReviewTab(layer, tab.dataset.reviewTab));
    });

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
    if (!round) {
      closeReviewLayer();
      return;
    }

    const record = caseContentCache.get(activeCaseTitle);
    const isReady = Boolean(record?.summary && record?.timeline);
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
    void hydrateCaseContent();
    ensureReviewTrigger();
  }

  new MutationObserver(syncAppEnhancements).observe(document.getElementById("root"), {
    childList: true,
    subtree: true,
  });
  syncAppEnhancements();
})();
