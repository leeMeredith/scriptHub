// js/core/state.js
// Central application state for ScriptHub.
// Keeps the canonical text, pages metadata, mode, and current page selection.
// Exposes a small API and emits events when important changes occur.

(function () {
    const SH = window.SH || (window.SH = {});

    let text = "";           // full script text (may include form-feed page breaks)
    let pages = [];          // [{ index, html, snippet }]
    let mode = "screenplay"; // 'screenplay' | 'stageplay' | 'tv'
    let currentPage = 0;     // zero-based index
    let focusMode = false;   // whether editor is in page-focus mode

    function setText(newText, options = {}) {
        if (typeof newText !== "string") newText = String(newText || "");
        text = newText;
        // notify others immediately that text changed
        window.dispatchEvent(new CustomEvent("text-changed", { detail: { text, options } }));
    }

    function getText() {
        return text;
    }

    function setPages(newPages) {
        pages = Array.isArray(newPages) ? newPages : [];
        // also expose globally for older modules
        SH.pages = pages;
        window.dispatchEvent(new CustomEvent("pages-updated", { detail: { pages } }));
    }

    function getPages() {
        return pages;
    }

    function setMode(m) {
        mode = m;
        window.dispatchEvent(new CustomEvent("mode-changed", { detail: { mode } }));
    }

    function getMode() {
        return mode;
    }

    function setCurrentPage(idx) {
        if (typeof idx !== "number" || idx < 0) idx = 0;
        currentPage = idx;
        window.dispatchEvent(new CustomEvent("page-changed", { detail: { index: currentPage } }));
    }

    function getCurrentPage() {
        return currentPage;
    }

    function setFocusMode(value) {
        focusMode = !!value;
        window.dispatchEvent(new CustomEvent("focus-changed", { detail: { focusMode } }));
    }

    function getFocusMode() {
        return focusMode;
    }

    // Expose API
    SH.state = {
        setText,
        getText,
        setPages,
        getPages,
        setMode,
        getMode,
        setCurrentPage,
        getCurrentPage,
        setFocusMode,
        getFocusMode
    };

    console.log("%c[State] Initialized", "color:#0b5fff");
})();
