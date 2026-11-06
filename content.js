
/*
 * Udemy Live Japanese Caption Translator v1.0.0
 * Chrome 138+
 * English -> Japanese
 * Uses the on-device Chrome Translator API.
 */
(() => {
  "use strict";

  const KEY = "__udemyLiveJaCaptionTranslatorExtension";

  if (window[KEY]) return;
  window[KEY] = true;

  // Stop an older DevTools prototype, if present.
  try {
    window.stopUdemyLiveCC?.();
  } catch (_) {}

  const CAPTION_SELECTOR =
    '[data-purpose="captions-cue-text"]';

  const HIDE_CLASS =
    "udemy-ja-caption-hide-source";

  const cache = new Map();
  const failed = new Set();

  let translator = null;
  let active = false;
  let preparing = false;
  let translating = false;
  let desired = "";
  let removed = false;

  // ==================================================
  // Styles
  // ==================================================

  const css = document.createElement("style");

  css.textContent = `
    html.${HIDE_CLASS} ${CAPTION_SELECTOR} {
      visibility: hidden !important;
    }

    #udemy-ja-caption-toggle {
      position: fixed !important;
      z-index: 2147483647 !important;
      display: none;
      pointer-events: auto !important;
      padding: 8px 12px;
      border: 0;
      border-radius: 7px;
      background: #6855df;
      color: white;
      font: 600 12px Arial, sans-serif;
      cursor: pointer;
      box-shadow: 0 3px 12px #0008;
    }

    #udemy-ja-caption-overlay {
      position: fixed !important;
      z-index: 2147483646 !important;
      display: none;
      pointer-events: none !important;
      padding: 5px 10px;
      border-radius: 6px;
      color: white;
      background: rgba(0, 0, 0, .65);
      text-align: center;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 700 21px/1.45 "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, "Noto Sans JP", Arial, sans-serif;
      text-shadow: 0 1px 3px black;
      transform: translateY(-100%);
    }
  `;

  document.head.append(css);

  // ==================================================
  // UI
  // ==================================================

  const button = document.createElement("button");

  button.id = "udemy-ja-caption-toggle";
  button.type = "button";
  button.textContent = "日本語字幕 開始";

  const overlay = document.createElement("div");

  overlay.id = "udemy-ja-caption-overlay";
  overlay.setAttribute("aria-live", "off");

  document.body.append(button, overlay);

  // ==================================================
  // Video detection
  // ==================================================

  function getVideo() {
    return [...document.querySelectorAll("video")]
      .filter(v =>
        v.getBoundingClientRect().width > 120
      )
      .sort((a, b) => {
        const area = v => {
          const r = v.getBoundingClientRect();
          return r.width * r.height;
        };

        return area(b) - area(a);
      })[0] || null;
  }

  function currentCaptions(video) {
    if (!video) return [];

    const vr = video.getBoundingClientRect();

    return [...document.querySelectorAll(
      CAPTION_SELECTOR
    )]
      .map(el => ({
        el,
        rect: el.getBoundingClientRect()
      }))
      .filter(({ rect }) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > vr.left &&
        rect.left < vr.right &&
        rect.bottom > vr.top &&
        rect.top < vr.bottom
      );
  }

  function englishText(captions) {
    return captions
      .map(({ el }) =>
        (el.textContent || "").trim()
      )
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ==================================================
  // Caption visibility
  // ==================================================

  function hideEnglish(shouldHide) {
    document.documentElement.classList.toggle(
      HIDE_CLASS,
      shouldHide
    );
  }

  function clearJapanese() {
    hideEnglish(false);

    overlay.textContent = "";
    overlay.style.display = "none";
  }

  function setJapanese(source, japanese) {
    if (
      !active ||
      removed ||
      source !== desired
    ) return;

    if (!japanese) {
      clearJapanese();
      return;
    }

    overlay.textContent = japanese;
    overlay.style.display = "block";

    // Hide English only after Japanese is ready.
    hideEnglish(true);
    positionUI();
  }

  // ==================================================
  // Translation queue and cache
  // ==================================================

  async function drain() {
    if (
      translating ||
      !translator ||
      !active ||
      removed
    ) return;

    translating = true;

    let inFlight = "";

    try {
      while (
        active &&
        !removed &&
        desired &&
        !cache.has(desired) &&
        !failed.has(desired)
      ) {
        inFlight = desired;

        const japanese =
          await translator.translate(inFlight);

        if (!active || removed) break;

        cache.set(inFlight, japanese);

        // Limit in-memory cache size.
        if (cache.size > 250) {
          cache.delete(
            cache.keys().next().value
          );
        }

        // Ignore outdated translations.
        if (desired === inFlight) {
          setJapanese(inFlight, japanese);
        }
      }

      if (
        active &&
        desired &&
        cache.has(desired)
      ) {
        setJapanese(
          desired,
          cache.get(desired)
        );
      }
    } catch (error) {
      console.error(
        "[Udemy JA CC] 翻訳エラー",
        error
      );

      if (inFlight && active && !removed) {
        failed.add(inFlight);
      }

      if (active && desired === inFlight) {
        clearJapanese();
      }
    } finally {
      translating = false;

      if (
        active &&
        desired &&
        !cache.has(desired) &&
        !failed.has(desired)
      ) {
        void drain();
      }
    }
  }

  // ==================================================
  // Real-time caption detection
  // ==================================================

  function detectCaptions() {
    if (!active || removed) return;

    const next = englishText(
      currentCaptions(getVideo())
    );

    if (next === desired) return;

    desired = next;

    // Keep English visible until translation finishes.
    clearJapanese();

    if (!next) return;

    if (cache.has(next)) {
      setJapanese(next, cache.get(next));
    } else if (!failed.has(next)) {
      void drain();
    }
  }

  // ==================================================
  // Overlay positioning
  // ==================================================

  function positionUI() {
    if (removed) return;

    const video = getVideo();

    if (!video) {
      button.style.display = "none";
      desired = "";
      clearJapanese();
      return;
    }

    const r = video.getBoundingClientRect();

    const onscreen =
      r.width > 120 &&
      r.height > 90 &&
      r.bottom > 0 &&
      r.top < innerHeight;

    button.style.display =
      onscreen ? "block" : "none";

    if (!onscreen) {
      overlay.style.display = "none";
      hideEnglish(false);
      return;
    }

    const bw =
      button.getBoundingClientRect().width || 130;

    button.style.left = `${
      Math.max(
        6,
        Math.min(
          innerWidth - bw - 6,
          r.right - bw - 12
        )
      )
    }px`;

    button.style.top =
      `${Math.max(6, r.top + 12)}px`;

    const captions = currentCaptions(video);

    const bottom = captions.length
      ? Math.max(
          ...captions.map(({ rect }) => rect.bottom)
        )
      : r.bottom - Math.min(
          65,
          r.height * 0.14
        );

    const width = Math.max(
      140,
      Math.min(
        r.width - 20,
        r.width * 0.94
      )
    );

    overlay.style.left =
      `${r.left + (r.width - width) / 2}px`;

    overlay.style.width =
      `${width}px`;

    overlay.style.top = `${
      Math.max(
        r.top + 28,
        Math.min(r.bottom - 6, bottom)
      )
    }px`;

    // Match Udemy's caption font size.
    if (captions.length) {
      const fontSize = parseFloat(
        getComputedStyle(
          captions[0].el
        ).fontSize
      );

      if (Number.isFinite(fontSize)) {
        overlay.style.fontSize = `${
          Math.max(
            15,
            Math.min(28, fontSize)
          )
        }px`;
      }
    }

    // Native video fullscreen cannot host the
    // separate overlay; preserve English in that case.
    const nativeVideoFullscreen =
      document.fullscreenElement === video;

    if (nativeVideoFullscreen) {
      overlay.style.display = "none";
      hideEnglish(false);
    } else if (
      active &&
      overlay.textContent &&
      desired
    ) {
      overlay.style.display = "block";
      hideEnglish(true);
    }
  }

  // ==================================================
  // Start translation
  // ==================================================

  async function start() {
    if (
      preparing ||
      active ||
      removed
    ) return;

    preparing = true;
    button.disabled = true;

    button.textContent =
      "翻訳モデル準備中…";

    try {
      if (typeof Translator === "undefined") {
        throw new Error(
          "Chrome Translator API がサポートされていません。"
        );
      }

      // create() is called in the user-click flow.
      const created = Translator.create({
        sourceLanguage: "en",
        targetLanguage: "ja",

        monitor(m) {
          m.addEventListener(
            "downloadprogress",
            event => {
              button.textContent = `${
                "ダウンロード " +
                Math.round(event.loaded * 100)
              }%`;
            }
          );
        }
      });

      translator = await created;

      if (removed) {
        translator.destroy();
        return;
      }

      active = true;
      desired = "";

      button.textContent =
        "日本語字幕 停止 ×";

      console.log(
        "[Udemy JA CC] 翻訳開始"
      );

      detectCaptions();
    } catch (error) {
      console.error(
        "[Udemy JA CC] 開始エラー",
        error
      );

      button.textContent =
        "開始失敗 · 再試行";
    } finally {
      preparing = false;
      button.disabled = false;
    }
  }

  // ==================================================
  // Stop translation
  // ==================================================

  function stop() {
    active = false;
    desired = "";

    failed.clear();
    clearJapanese();

    try {
      translator?.destroy();
    } catch (_) {}

    translator = null;

    button.textContent =
      "日本語字幕 開始";

    console.log(
      "[Udemy JA CC] 終了 · 英語字幕を復元"
    );
  }

  button.addEventListener("click", () => {
    if (active) {
      stop();
    } else {
      void start();
    }
  });

  // ==================================================
  // Fullscreen support
  // ==================================================

  function moveToFullscreen() {
    const fs = document.fullscreenElement;

    const parent =
      fs && fs.tagName !== "VIDEO"
        ? fs
        : document.body;

    if (button.parentElement !== parent) {
      parent.append(button);
    }

    if (overlay.parentElement !== parent) {
      parent.append(overlay);
    }

    positionUI();
  }

  document.addEventListener(
    "fullscreenchange",
    moveToFullscreen
  );

  // ==================================================
  // Update loop
  // ==================================================

  // Udemy may replace caption DOM nodes during playback.
  const timer = setInterval(() => {
    if (removed) return;

    positionUI();
    detectCaptions();
  }, 150);

  // ==================================================
  // Cleanup
  // ==================================================

  function destroy() {
    if (removed) return;

    stop();
    removed = true;

    clearInterval(timer);

    document.removeEventListener(
      "fullscreenchange",
      moveToFullscreen
    );

    css.remove();
    button.remove();
    overlay.remove();

    delete window[KEY];
    delete window.udemyJaCaptionTranslator;
  }

  // Developer helpers
  window.udemyJaCaptionTranslator = {
    start,
    stop,
    destroy
  };

  positionUI();
})();
