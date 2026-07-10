// ============================================================
//  LinguaFlow Advanced — script.js  (v3)
//
//  HOW TO USE:
//  1. Get a Google Cloud Translation API key from
//     https://console.cloud.google.com/
//  2. Replace the empty string below with your actual key.
//  3. Open index.html in a browser. That's it!
// ============================================================
const API_URL = "https://api.mymemory.translated.net/get";

// ── All supported languages ────────────────────────────────────
const LANG_NAMES = {
  auto: "Detect", en: "English", es: "Spanish", fr: "French",
  de: "German", it: "Italian", pt: "Portuguese", ru: "Russian",
  zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic",
  hi: "Hindi", bn: "Bengali", nl: "Dutch", pl: "Polish",
  tr: "Turkish", sv: "Swedish", uk: "Ukrainian", vi: "Vietnamese",
  th: "Thai", id: "Indonesian", he: "Hebrew", fa: "Persian",
  cs: "Czech", ro: "Romanian", hu: "Hungarian", da: "Danish",
  fi: "Finnish", el: "Greek", ms: "Malay", no: "Norwegian",
  sk: "Slovak", hr: "Croatian", ca: "Catalan", lt: "Lithuanian",
  sl: "Slovenian", ur: "Urdu", ta: "Tamil", te: "Telugu",
};

// ── TTS language codes ──────────────────────────────────────────
const TTS_CODES = {
  en:"en-US", es:"es-ES", fr:"fr-FR", de:"de-DE", it:"it-IT",
  pt:"pt-PT", ru:"ru-RU", zh:"zh-CN", ja:"ja-JP", ko:"ko-KR",
  ar:"ar-SA", hi:"hi-IN", bn:"bn-IN", nl:"nl-NL", pl:"pl-PL",
  tr:"tr-TR", sv:"sv-SE", uk:"uk-UA", vi:"vi-VN", th:"th-TH",
  id:"id-ID", he:"he-IL", cs:"cs-CZ", ro:"ro-RO", hu:"hu-HU",
  da:"da-DK", fi:"fi-FI", el:"el-GR", ms:"ms-MY", no:"no-NO",
  hr:"hr-HR", lt:"lt-LT", ur:"ur-PK", fa:"fa-IR",
};

// ══════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ══════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const sourceText       = $("sourceText");
const translatedText   = $("translatedText");
const sourceLang       = $("sourceLang");
const targetLang       = $("targetLang");
const translateBtn     = $("translateBtn");
const swapBtn          = $("swapBtn");
const copyBtn          = $("copyBtn");
const ttsSourceBtn     = $("ttsSourceBtn");
const ttsOutputBtn     = $("ttsOutputBtn");
const themeToggle      = $("themeToggle");
const themeIcon        = $("themeIcon");
const themePreset      = $("themePreset");
const charCount        = $("charCount");
const wordCount        = $("wordCount");
const wordCountDisplay = $("wordCountDisplay");
const spinnerWrap      = $("spinnerWrap");
const errorMsg         = $("errorMsg");
const errorText        = $("errorText");
const errorClose       = $("errorClose");
const outputLangBadge  = $("outputLangBadge");
const historyList      = $("historyList");
const clearHistoryBtn  = $("clearHistoryBtn");
const autoTranslateToggle = $("autoTranslateToggle");
const micBtn           = $("micBtn");
const downloadTxtBtn   = $("downloadTxtBtn");
const downloadPdfBtn   = $("downloadPdfBtn");
const shareBtn         = $("shareBtn");
const fullscreenBtn    = $("fullscreenBtn");
const recentLanguages  = $("recentLanguages");
const toast            = $("toast");
const historySearch    = $("historySearch");
const favouritesList   = $("favouritesList");
const clearBtn         = $("clearBtn");
const pasteBtn         = $("pasteBtn");
const favouriteBtn     = $("favouriteBtn");
const sourceLangName   = $("sourceLangName");
const targetLangName   = $("targetLangName");
const confidenceBadge  = $("confidenceBadge");
const apiKeyNotice     = $("apiKeyNotice");
const formalitySelect  = $("formalitySelect");
const mainCard         = $("mainCard");
const wordCountPill    = $("wordCountPill");
const statTotal        = $("statTotal");
const statWords        = $("statWords");
const statLangs        = $("statLangs");
const statTopLang      = $("statTopLang");
const langUsageChart   = $("langUsageChart");

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
let translationHistory = []; // { source, translated, from, to, time, id }
let favourites         = []; // same shape
let currentTranslation = "";
let autoTimer          = null;
let recognition        = null;
let isListening        = false;
let isFocusMode        = false;
let focusOverlay       = null;
let translationCount   = 0;
let totalWordsTranslated = 0;

// ══════════════════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════════════════
function loadTheme() {
  const saved = localStorage.getItem("lf-theme") || "dark";
  applyTheme(saved, false);
}

function applyTheme(theme, announce = true) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("lf-theme", theme);
  themePreset.value = theme;
  themeIcon.textContent = theme === "light" ? "☾" : "☀";
  if (announce) showToast(`${cap(theme)} theme`, "🎨");
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  applyTheme(cur === "dark" ? "light" : "dark");
}

themeToggle.addEventListener("click", toggleTheme);
themePreset.addEventListener("change", () => applyTheme(themePreset.value));

// ══════════════════════════════════════════════════════════════
//  LANGUAGE LABEL UPDATE
// ══════════════════════════════════════════════════════════════
function updateLangLabels() {
  const from = sourceLang.value;
  const to   = targetLang.value;
  sourceLangName.textContent = from === "auto" ? "Auto Detect" : (LANG_NAMES[from] || from);
  targetLangName.textContent = LANG_NAMES[to] || to;
}

sourceLang.addEventListener("change", updateLangLabels);
targetLang.addEventListener("change", updateLangLabels);

// ══════════════════════════════════════════════════════════════
//  TEXT INPUT & COUNTER
// ══════════════════════════════════════════════════════════════
sourceText.addEventListener("input", () => {
  updateCounters();
  hideError();
  clearTimeout(autoTimer);
  if (autoTranslateToggle.checked && sourceText.value.trim().length > 2) {
    autoTimer = setTimeout(() => translate(true), 950);
  }
});

function updateCounters() {
  const text  = sourceText.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = chars;
  wordCount.textContent = words;
  wordCountDisplay.textContent = words;

  // Colour warning
  if (chars > 4500) charCount.style.color = "var(--danger-color)";
  else if (chars > 3500) charCount.style.color = "var(--warning-color)";
  else charCount.style.color = "";
}

// ══════════════════════════════════════════════════════════════
//  TRANSLATE
// ══════════════════════════════════════════════════════════════
async function translate() {
  const text = sourceText.value.trim();

  if (!text) {
    showError("Please enter some text to translate.");
    return;
  }

  const from = sourceLang.value === "auto" ? "en" : sourceLang.value;
  const to = targetLang.value;

  if (from === to) {
    showError("Source and target languages are same.");
    return;
  }

  setLoading(true);
  hideError();

  try {
    const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.responseData || !data.responseData.translatedText) {
      throw new Error("Translation failed");
    }

    currentTranslation = decodeHtml(data.responseData.translatedText);

    displayTranslation(currentTranslation, to);

    addToHistory(text, currentTranslation, from, to);

    saveRecentPair(from, to);
    renderRecentChips();

    translationCount++;
    totalWordsTranslated += text.trim().split(/\s+/).length;
    saveStats();

    showToast("Translated successfully", "🌍");

  } catch (error) {
    showError("Translation failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

function displayTranslation(text, langCode) {
  translatedText.textContent = text;
  outputLangBadge.textContent = LANG_NAMES[langCode] || langCode.toUpperCase();
}

function setLoading(on) {
  spinnerWrap.classList.toggle("visible", on);
  translateBtn.disabled = on;
  translateBtn.querySelector(".btn-label").textContent = on ? "Translating…" : "Translate";
}

translateBtn.addEventListener("click", () => translate(false));
sourceText.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") translate(false);
});

// ══════════════════════════════════════════════════════════════
//  SWAP LANGUAGES
// ══════════════════════════════════════════════════════════════
swapBtn.addEventListener("click", () => {
  if (sourceLang.value === "auto") {
    showError("Cannot swap when source is set to Auto Detect. Choose a specific source language first.");
    return;
  }
  const from = sourceLang.value;
  const to   = targetLang.value;

  sourceLang.value = to;
  targetLang.value = from;

  const oldSource = sourceText.value;
  sourceText.value = currentTranslation;
  updateCounters();

  currentTranslation = oldSource;
  if (oldSource) displayTranslation(oldSource, from);
  else clearOutput();

  updateLangLabels();
  saveRecentPair(to, from);
  renderRecentChips();
  showToast("Languages swapped", "⇄");
});

// ══════════════════════════════════════════════════════════════
//  COPY
// ══════════════════════════════════════════════════════════════
copyBtn.addEventListener("click", () => {
  if (!currentTranslation) { showToast("Nothing to copy", "ℹ️"); return; }
  navigator.clipboard.writeText(currentTranslation)
    .then(() => {
      copyBtn.classList.add("copied");
      showToast("Copied to clipboard", "📋");
      setTimeout(() => copyBtn.classList.remove("copied"), 1600);
    })
    .catch(() => showError("Clipboard access denied. Please copy manually."));
});

// ══════════════════════════════════════════════════════════════
//  CLEAR & PASTE
// ══════════════════════════════════════════════════════════════
clearBtn.addEventListener("click", () => {
  sourceText.value = "";
  updateCounters();
  clearOutput();
  hideError();
  sourceText.focus();
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    sourceText.value = text;
    updateCounters();
    showToast("Pasted from clipboard", "📋");
  } catch {
    showError("Clipboard read denied. Please paste manually (Ctrl+V).");
  }
});

// ══════════════════════════════════════════════════════════════
//  FAVOURITE
// ══════════════════════════════════════════════════════════════
favouriteBtn.addEventListener("click", () => {
  if (!currentTranslation) { showToast("Translate something first", "ℹ️"); return; }
  const entry = {
    id: Date.now(),
    source: sourceText.value.trim(),
    translated: currentTranslation,
    from: sourceLang.value,
    to: targetLang.value,
    time: new Date(),
  };
  // Remove duplicate
  favourites = favourites.filter(f => f.source !== entry.source || f.to !== entry.to);
  favourites.unshift(entry);
  if (favourites.length > 50) favourites.pop();
  saveFavourites();
  renderFavourites();
  favouriteBtn.classList.add("starred");
  setTimeout(() => favouriteBtn.classList.remove("starred"), 1800);
  showToast("Saved to favourites", "⭐");
});

// ══════════════════════════════════════════════════════════════
//  VOICE INPUT (Microphone)
// ══════════════════════════════════════════════════════════════
function setupMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = "Voice input not supported in this browser";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart  = () => { isListening = true; micBtn.classList.add("listening"); micBtn.title = "Listening… click to stop"; };
  recognition.onend    = () => { isListening = false; micBtn.classList.remove("listening"); micBtn.title = "Voice input"; };
  recognition.onerror  = () => { showError("Voice input failed. Please try again."); };

  recognition.onresult = event => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    sourceText.value = transcript;
    updateCounters();
  };
}

micBtn.addEventListener("click", () => {
  if (!recognition) { showError("Voice input is not supported in this browser."); return; }
  const lang = sourceLang.value === "auto" ? "en" : sourceLang.value;
  recognition.lang = TTS_CODES[lang] || lang;
  isListening ? recognition.stop() : recognition.start();
});

// ══════════════════════════════════════════════════════════════
//  TEXT-TO-SPEECH
// ══════════════════════════════════════════════════════════════
function speak(text, langCode) {
  if (!("speechSynthesis" in window)) { showError("Text-to-speech is not supported in this browser."); return; }
  window.speechSynthesis.cancel();
  if (!text?.trim()) { showError("No text to read aloud."); return; }

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = TTS_CODES[langCode] || langCode;
  utt.rate = 0.92;
  utt.pitch = 1;

  // Pick a voice if available
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(langCode)) || voices.find(v => v.lang === (TTS_CODES[langCode] || langCode));
  if (match) utt.voice = match;

  window.speechSynthesis.speak(utt);
  showToast("Playing audio…", "🔊");
}

ttsSourceBtn.addEventListener("click", () => {
  const lang = sourceLang.value === "auto" ? "en" : sourceLang.value;
  speak(sourceText.value, lang);
});
ttsOutputBtn.addEventListener("click", () => speak(currentTranslation, targetLang.value));

// ══════════════════════════════════════════════════════════════
//  DOWNLOAD TXT
// ══════════════════════════════════════════════════════════════
downloadTxtBtn.addEventListener("click", () => {
  if (!currentTranslation) { showToast("Translate something first", "ℹ️"); return; }
  const fromName = LANG_NAMES[sourceLang.value] || sourceLang.value;
  const toName   = LANG_NAMES[targetLang.value] || targetLang.value;
  const content = [
    "LinguaFlow Translation",
    "======================",
    `Date: ${new Date().toLocaleString()}`,
    `From: ${fromName}  →  To: ${toName}`,
    "",
    "[ Original ]",
    sourceText.value,
    "",
    "[ Translation ]",
    currentTranslation,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `linguaflow-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  showToast("TXT downloaded", "📄");
});

// ══════════════════════════════════════════════════════════════
//  DOWNLOAD PDF
// ══════════════════════════════════════════════════════════════
downloadPdfBtn.addEventListener("click", () => {
  if (!currentTranslation) { showToast("Translate something first", "ℹ️"); return; }
  if (!window.jspdf) { showError("PDF library not loaded. Check internet connection."); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth() - 28;
  let y = 18;

  const addLine = (text, size = 11, style = "normal") => {
    doc.setFontSize(size); doc.setFont(undefined, style);
    const lines = doc.splitTextToSize(String(text), W);
    lines.forEach(l => { if (y > 278) { doc.addPage(); y = 16; } doc.text(l, 14, y); y += size * 0.45 + 2; });
    y += 3;
  };

  addLine("LinguaFlow Translation", 18, "bold");
  addLine(`${new Date().toLocaleString()}`, 9);
  addLine(`${LANG_NAMES[sourceLang.value] || sourceLang.value} → ${LANG_NAMES[targetLang.value] || targetLang.value}`, 11, "bold");
  y += 4;
  addLine("Original:", 12, "bold");
  addLine(sourceText.value);
  y += 4;
  addLine("Translation:", 12, "bold");
  addLine(currentTranslation);

  doc.save(`linguaflow-${Date.now()}.pdf`);
  showToast("PDF downloaded", "📑");
});

// ══════════════════════════════════════════════════════════════
//  SHARE
// ══════════════════════════════════════════════════════════════
shareBtn.addEventListener("click", async () => {
  if (!currentTranslation) { showToast("Translate something first", "ℹ️"); return; }
  const shareData = {
    title: "LinguaFlow Translation",
    text: `${sourceText.value.trim()}\n\n→ ${currentTranslation}`,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
      showToast("Translation copied for sharing", "🔗");
    }
  } catch (err) {
    if (err.name !== "AbortError") showError("Share failed.");
  }
});

// ══════════════════════════════════════════════════════════════
//  FOCUS / FULLSCREEN MODE
// ══════════════════════════════════════════════════════════════
fullscreenBtn.addEventListener("click", () => {
  isFocusMode = !isFocusMode;
  mainCard.classList.toggle("focus-mode", isFocusMode);
  if (!focusOverlay) {
    focusOverlay = document.createElement("div");
    focusOverlay.className = "focus-overlay";
    document.body.appendChild(focusOverlay);
    focusOverlay.addEventListener("click", () => {
      isFocusMode = false;
      mainCard.classList.remove("focus-mode");
      focusOverlay.classList.remove("active");
      fullscreenBtn.title = "Focus mode";
    });
  }
  focusOverlay.classList.toggle("active", isFocusMode);
  fullscreenBtn.title = isFocusMode ? "Exit focus mode" : "Focus mode";
  showToast(isFocusMode ? "Focus mode on" : "Focus mode off", "⛶");
});

// ══════════════════════════════════════════════════════════════
//  ERROR / TOAST
// ══════════════════════════════════════════════════════════════
function showError(msg) {
  errorText.textContent = msg;
  errorMsg.style.display = "flex";
}
function hideError() { errorMsg.style.display = "none"; }
errorClose.addEventListener("click", hideError);

let toastTimer;
function showToast(msg, icon = "") {
  toast.innerHTML = icon ? `<span class="toast-icon">${icon}</span> ${msg}` : msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ══════════════════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════════════════
function addToHistory(source, translated, fromCode, toCode) {
  if (translationHistory.length > 0) {
    const last = translationHistory[0];
    if (last.source === source && last.translated === translated) return;
  }
  translationHistory.unshift({
    id: Date.now(),
    source, translated,
    from: fromCode, to: toCode,
    time: new Date(),
  });
  if (translationHistory.length > 30) translationHistory.pop();
  saveHistory();
  renderHistory();
}

let historyFilter = "";
historySearch.addEventListener("input", () => {
  historyFilter = historySearch.value.toLowerCase();
  renderHistory();
});

function renderHistory() {
  const filtered = translationHistory.filter(e =>
    !historyFilter ||
    e.source.toLowerCase().includes(historyFilter) ||
    e.translated.toLowerCase().includes(historyFilter)
  );

  if (filtered.length === 0) {
    historyList.innerHTML = `<p class="list-empty">${historyFilter ? "No results found." : "No translations yet. Start typing!"}</p>`;
    return;
  }

  historyList.innerHTML = filtered.map((entry, i) => buildHistoryItem(entry, i, "history")).join("");
  attachHistoryEvents("history");
}

function renderFavourites() {
  if (favourites.length === 0) {
    favouritesList.innerHTML = `<p class="list-empty">No favourites yet. Star a translation to save it here.</p>`;
    return;
  }
  favouritesList.innerHTML = favourites.map((entry, i) => buildHistoryItem(entry, i, "fav")).join("");
  attachHistoryEvents("fav");
}

function buildHistoryItem(entry, idx, type) {
  const fromName = LANG_NAMES[entry.from] || entry.from.toUpperCase();
  const toName   = LANG_NAMES[entry.to]   || entry.to.toUpperCase();
  return `
    <div class="history-item" data-idx="${idx}" data-type="${type}">
      <div class="history-meta">
        <span class="history-lang-pill">${fromName}</span>
        <span class="history-arrow">→</span>
        <span class="history-lang-pill">${toName}</span>
        <span class="history-time">${formatTime(entry.time)}</span>
        <div class="history-item-actions">
          <button class="history-mini-btn delete-btn" data-idx="${idx}" data-type="${type}" title="Delete">🗑</button>
          ${type === "history" ? `<button class="history-mini-btn star-btn" data-idx="${idx}" title="Favourite">⭐</button>` : ""}
        </div>
      </div>
      <div class="history-texts">
        <div class="history-source">${escapeHtml(truncate(entry.source, 160))}</div>
        <div class="history-translated">${escapeHtml(truncate(entry.translated, 160))}</div>
      </div>
    </div>`;
}

function attachHistoryEvents(type) {
  const container = type === "history" ? historyList : favouritesList;
  const dataArr   = type === "history" ? translationHistory : favourites;
  const filtered  = type === "history"
    ? translationHistory.filter(e => !historyFilter || e.source.toLowerCase().includes(historyFilter) || e.translated.toLowerCase().includes(historyFilter))
    : favourites;

  // Click to reload
  container.querySelectorAll(".history-item").forEach(item => {
    item.addEventListener("click", e => {
      if (e.target.closest(".history-mini-btn")) return;
      const entry = filtered[parseInt(item.dataset.idx)];
      if (!entry) return;
      sourceText.value   = entry.source;
      sourceLang.value   = entry.from !== "auto" ? entry.from : "auto";
      targetLang.value   = entry.to;
      currentTranslation = entry.translated;
      displayTranslation(entry.translated, entry.to);
      updateCounters(); updateLangLabels(); hideError();
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Translation reloaded", "↩️");
    });
  });

  // Delete
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const entry = filtered[idx];
      if (!entry) return;
      if (type === "history") {
        translationHistory = translationHistory.filter(h => h.id !== entry.id);
        saveHistory(); renderHistory();
      } else {
        favourites = favourites.filter(f => f.id !== entry.id);
        saveFavourites(); renderFavourites();
      }
      showToast("Deleted", "🗑");
    });
  });

  // Star from history
  container.querySelectorAll(".star-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const entry = filtered[parseInt(btn.dataset.idx)];
      if (!entry) return;
      favourites = favourites.filter(f => f.source !== entry.source || f.to !== entry.to);
      favourites.unshift({ ...entry, id: Date.now() });
      if (favourites.length > 50) favourites.pop();
      saveFavourites(); renderFavourites();
      showToast("Added to favourites", "⭐");
    });
  });
}

clearHistoryBtn.addEventListener("click", () => {
  if (translationHistory.length === 0) return;
  if (confirm("Clear all translation history?")) {
    translationHistory = []; saveHistory(); renderHistory();
    showToast("History cleared", "🗑");
  }
});

// ══════════════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════════════
document.querySelectorAll(".section-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".section-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    const panel = document.getElementById(`tab-${tab.dataset.tab}`);
    if (panel) panel.classList.add("active");

    // Show/hide clear button only on history tab
    const sectionActions = $("sectionTabActions");
    sectionActions.style.display = tab.dataset.tab === "history" ? "" : "none";

    if (tab.dataset.tab === "stats") renderStats();
  });
});

// ══════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════
function renderStats() {
  statTotal.textContent = translationCount;
  statWords.textContent = totalWordsTranslated;

  const langCounts = {};
  translationHistory.forEach(e => {
    langCounts[e.to] = (langCounts[e.to] || 0) + 1;
  });
  const langEntries = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
  statLangs.textContent = Object.keys(langCounts).length;
  statTopLang.textContent = langEntries.length ? (LANG_NAMES[langEntries[0][0]] || langEntries[0][0]) : "—";

  // Bar chart
  const maxCount = langEntries[0]?.[1] || 1;
  langUsageChart.innerHTML = langEntries.slice(0, 8).map(([lang, count]) => `
    <div class="lang-bar-row">
      <span class="lang-bar-label">${LANG_NAMES[lang] || lang}</span>
      <div class="lang-bar-track">
        <div class="lang-bar-fill" style="width:${Math.round((count / maxCount) * 100)}%"></div>
      </div>
      <span class="lang-bar-count">${count}</span>
    </div>`).join("");

  if (!langEntries.length) {
    langUsageChart.innerHTML = `<p class="list-empty">Translate something to see language usage stats.</p>`;
  }
}

// ══════════════════════════════════════════════════════════════
//  RECENT LANGUAGE CHIPS
// ══════════════════════════════════════════════════════════════
const DEFAULTS = [{ from:"en", to:"hi" }, { from:"hi", to:"en" }, { from:"en", to:"es" }, { from:"en", to:"fr" }];

function saveRecentPair(from, to) {
  let pairs = getRecentPairs().filter(p => !(p.from === from && p.to === to));
  pairs.unshift({ from, to });
  pairs = pairs.slice(0, 6);
  localStorage.setItem("lf-recent-pairs", JSON.stringify(pairs));
}
function getRecentPairs() {
  try { return JSON.parse(localStorage.getItem("lf-recent-pairs")) || []; } catch { return []; }
}
function renderRecentChips() {
  const pairs = getRecentPairs().length ? getRecentPairs() : DEFAULTS;
  recentLanguages.innerHTML = pairs.map(p => `
    <button class="recent-chip" data-from="${p.from}" data-to="${p.to}">
      ${LANG_NAMES[p.from] || p.from} → ${LANG_NAMES[p.to] || p.to}
    </button>`).join("");
  recentLanguages.querySelectorAll(".recent-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      sourceLang.value = btn.dataset.from;
      targetLang.value = btn.dataset.to;
      updateLangLabels();
      showToast(`${LANG_NAMES[btn.dataset.from]} → ${LANG_NAMES[btn.dataset.to]}`, "🌐");
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════
document.addEventListener("keydown", e => {
  // Alt + S = swap
  if (e.altKey && e.key === "s") { e.preventDefault(); swapBtn.click(); }
  // Escape = close focus mode / error
  if (e.key === "Escape") {
    hideError();
    if (isFocusMode) fullscreenBtn.click();
  }
});

// ══════════════════════════════════════════════════════════════
//  PERSISTENCE HELPERS
// ══════════════════════════════════════════════════════════════
function saveHistory() {
  localStorage.setItem("lf-history", JSON.stringify(translationHistory));
}
function loadHistory() {
  try {
    const s = localStorage.getItem("lf-history");
    if (s) translationHistory = JSON.parse(s).map(e => ({ ...e, time: new Date(e.time) }));
  } catch { translationHistory = []; }
}
function saveFavourites() {
  localStorage.setItem("lf-favourites", JSON.stringify(favourites));
}
function loadFavourites() {
  try {
    const s = localStorage.getItem("lf-favourites");
    if (s) favourites = JSON.parse(s).map(e => ({ ...e, time: new Date(e.time) }));
  } catch { favourites = []; }
}
function saveStats() {
  localStorage.setItem("lf-stats", JSON.stringify({ translationCount, totalWordsTranslated }));
}
function loadStats() {
  try {
    const s = localStorage.getItem("lf-stats");
    if (s) { const d = JSON.parse(s); translationCount = d.translationCount || 0; totalWordsTranslated = d.totalWordsTranslated || 0; }
  } catch {}
}

// ══════════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════════
function formatTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max) + "…" : (str || "");
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function decodeHtml(html) {
  const t = document.createElement("textarea");
  t.innerHTML = html; return t.value;
}
function clearOutput() {
  translatedText.innerHTML = `<span class="placeholder-text">Translation will appear here…</span>`;
  outputLangBadge.textContent = "—";
  confidenceBadge.textContent = "";
  currentTranslation = "";
}
function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function init() {
  loadTheme();
  loadHistory();
  loadFavourites();
  loadStats();
  renderHistory();
  renderFavourites();
  renderRecentChips();
  setupMic();
  updateCounters();
  updateLangLabels();

  // Load TTS voices (some browsers need this async)
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
}

init();