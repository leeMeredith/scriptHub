/* js/core/editor.js
   Full merged version:
   - All original logic preserved
   - Includes saveToProject()
   - Correct API structure
*/

(function (window) {
  "use strict";

  const AUTOSAVE_INTERVAL = 5000;
  const STORAGE_KEY = "scripthub_autosave_v1";

  let editorEl = null;
  let previewBridge = null;
  let autosaveTimer = null;
  let lastSavedContent = "";
  let handlers = { input: null, keydown: null };

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  function readLocal() {
    try { return localStorage.getItem(STORAGE_KEY); }
    catch (err) { console.warn("[ui_editor] localStorage read failed", err); return null; }
  }

  function writeLocal(text) {
    try { localStorage.setItem(STORAGE_KEY, text); }
    catch (err) { console.warn("[ui_editor] localStorage write failed", err); }
  }

  function startAutosave() {
    stopAutosave();
    autosaveTimer = setInterval(() => {
      if (!editorEl) return;
      const t = editorEl.value;
      if (t !== lastSavedContent) {
        writeLocal(t);
        lastSavedContent = t;
        console.debug("[ui_editor] autosaved at", new Date().toLocaleTimeString());
      }
    }, AUTOSAVE_INTERVAL);
  }

  function stopAutosave() {
    if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; }
  }

  function safeRenderPreview() {
    try {
      previewBridge &&
      typeof previewBridge.render === "function" &&
      previewBridge.render();
    } catch (err) {
      console.warn("[ui_editor] previewBridge.render() failed", err);
    }
  }

  // -------------------------------------------------
  // Event handlers
  // -------------------------------------------------
  function onInput() {
    if (!editorEl) return;

    const text = editorEl.value;

    // reflect into SH.state
    if (window.SH && SH.state && typeof SH.state.setText === "function") {
      try { SH.state.setText(text, { source: "editor" }); }
      catch (err) { console.warn("[ui_editor] SH.state.setText threw", err); }
    }

    safeRenderPreview();
  }

  function onKeydown(evt) {
    if (!editorEl) return;
    const isCmd = evt.ctrlKey || evt.metaKey;

    // Cmd+Enter inserts \f
    if (isCmd && evt.key === "Enter") {
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      const PAGE_BREAK = "\f";

      editorEl.value = editorEl.value.slice(0, start) +
                       PAGE_BREAK +
                       editorEl.value.slice(end);

      editorEl.selectionStart = editorEl.selectionEnd =
        start + PAGE_BREAK.length;

      onInput();
      evt.preventDefault();
      return;
    }

    // Cmd+B (prevent default, style handled elsewhere)
    if (isCmd && (evt.key === "b" || evt.key === "B")) {
      evt.preventDefault();
      return;
    }

    // Navigation forwarding
    if (isCmd && (evt.key === "ArrowDown" || evt.key === "ArrowUp")) {
      try {
        if (!previewBridge) return;

        const idx = typeof previewBridge.getCurrentPageIndex === "function"
          ? previewBridge.getCurrentPageIndex()
          : 0;

        if (evt.key === "ArrowDown" &&
            typeof previewBridge.jumpToMatch === "function") {
          previewBridge.jumpToMatch(idx + 1);
        } else if (evt.key === "ArrowUp" &&
                   typeof previewBridge.jumpToMatch === "function") {
          previewBridge.jumpToMatch(idx - 1);
        }

        evt.preventDefault();
      } catch (err) { /* ignore */ }
    }
  }

  // -------------------------------------------------
  // Fallback preview bridge
  // -------------------------------------------------
  function createFallbackBridge(opts) {
    const previewEl = opts.previewEl || document.getElementById("preview");

    return {
      render: function () {
        if (!previewEl) return;
        const txt = (editorEl && editorEl.value) ? editorEl.value : "";
        previewEl.textContent = txt;
      },
      jumpToMatch: function () {},
      getCurrentPageIndex: function () { return 0; }
    };
  }

  // -------------------------------------------------
  // API
  // -------------------------------------------------
  const api = {

    // ------------------------------------
    // INIT
    // ------------------------------------
    init: function (opts) {
      opts = opts || {};

      return new Promise((resolve, reject) => {

        // DOM references
        editorEl = document.getElementById(opts.editorId || "editor");
        const previewEl     = document.getElementById(opts.previewId     || "preview");
        const pageSelectEl  = document.getElementById(opts.pageSelectId  || "pageSelect");
        const searchEl      = document.getElementById(opts.searchInputId || "searchInput");
        const focusBtn      = document.getElementById(opts.focusToggleId || "focusPageToggle");
        const previewStatsEl= document.getElementById(opts.previewStatsId|| "previewStats");

        if (!editorEl) {
          console.error("[ui_editor] #editor not found");
          reject(new Error("editor element missing"));
          return;
        }

        // preview bridge creation
        if (typeof window.createPreviewBridge === "function") {
          try {
            previewBridge = window.createPreviewBridge({
              editorEl,
              previewEl,
              pageSelectEl,
              searchInputEl: searchEl,
              focusToggleBtn: focusBtn,
              previewStatsEl
            });
          } catch (err) {
            console.warn("[ui_editor] createPreviewBridge threw, using fallback", err);
            previewBridge = createFallbackBridge({ previewEl });
          }
        } else {
          previewBridge = createFallbackBridge({ previewEl });
        }

        // Load initial text
        try {
          let initial = null;

          // Priority 1 — SH.state
          if (window.SH && SH.state && typeof SH.state.getText === "function") {
            try { initial = SH.state.getText(); }
            catch (err) {}
          }

          // Priority 2 — autosave
          if ((!initial || initial === "") && typeof readLocal === "function") {
            const restored = readLocal();
            if (restored) initial = restored;

            if (initial && window.SH && SH.state &&
                typeof SH.state.setText === "function") {
              try { SH.state.setText(initial, { source: "autosave-restore" }); }
              catch (err) {}
            }
          }

          editorEl.value = (initial !== undefined && initial !== null)
            ? initial
            : "";

          lastSavedContent = editorEl.value;

        } catch (err) {
          console.warn("[ui_editor] populate failed", err);
          editorEl.value = editorEl.value || "";
        }

        // Attach listeners
        handlers.input = onInput.bind(null);
        handlers.keydown = onKeydown.bind(null);

        editorEl.addEventListener("input", handlers.input);
        editorEl.addEventListener("keydown", handlers.keydown);

        // Autosave
        startAutosave();

        // First render
        safeRenderPreview();

        // signal
        setTimeout(() => {
          try { document.dispatchEvent(new Event("ui-editor-ready")); }
          catch (e) {}
        }, 0);

        console.log("%c[ui_editor] Initialized", "color:#0b5fff");
        resolve(api);
      });
    },

    // ------------------------------------
    // NEW: Save to local project folder
    // ------------------------------------
    saveToProject: async function (filename) {
      if (!editorEl) return;

      const text = editorEl.value;

      const body = {
        filename: filename || "untitled.fountain",
        text
      };

      try {
        const res = await fetch("/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const json = await res.json();
        console.log("[editor] Saved:", json);

        alert("Saved to projects/" + body.filename);

      } catch (err) {
        console.error("[editor] Save failed", err);
        alert("Save failed. Check console.");
      }
    },

    // ------------------------------------
    // Standard API
    // ------------------------------------
    getText: function () {
      return editorEl ? editorEl.value : "";
    },

    setText: function (txt, opts) {
      if (!editorEl) {
        console.warn("[ui_editor] setText called before init");
        return;
      }

      editorEl.value = txt == null ? "" : String(txt);
      lastSavedContent = editorEl.value;

      if (window.SH && SH.state && typeof SH.state.setText === "function") {
        try { SH.state.setText(editorEl.value, opts || { source: "setText-api" }); }
        catch (err) {}
      }

      safeRenderPreview();
    },

    focus: function () {
      if (editorEl) editorEl.focus();
    },

    destroy: function () {
      stopAutosave();

      if (editorEl) {
        try {
          if (handlers.input) editorEl.removeEventListener("input", handlers.input);
          if (handlers.keydown) editorEl.removeEventListener("keydown", handlers.keydown);
        } catch (e) {}
      }

      previewBridge = null;
      editorEl = null;
      handlers = { input: null, keydown: null };

      console.log("[ui_editor] destroyed");
    }
  };

  // Expose
  window.ui_editor = api;
  window.UIEditor = api;
  window.EditorCore = api;

})(window);
