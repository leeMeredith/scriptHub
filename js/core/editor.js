/* js/core/editor.js
   Full merged, cleaned-up, ready-to-paste version
*/

(function (window) {
  "use strict";

  // -------------------------------------------------
  // Constants & state
  // -------------------------------------------------
  const AUTOSAVE_INTERVAL = 5000;
  const STORAGE_KEY = "scripthub_autosave_v1";

  let editorEl = null;
  let previewBridge = null;
  let autosaveTimer = null;
  let lastSavedContent = "";
  let handlers = { input: null, keydown: null };
  let changeCallback = null;

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

  function safeRenderPreview(text, options) {
    try {
      if (window.CorePreview && typeof CorePreview.updateFromEditor === "function") {
        CorePreview.updateFromEditor(text, options);
      }
    } catch (err) {
      console.warn("[ui_editor] CorePreview.updateFromEditor failed", err);
    }
  }

  // -------------------------------------------------
  // Event handlers
  // -------------------------------------------------
  function onInput() {
    if (!editorEl) return;
    const text = editorEl.value;

    if (window.SH && SH.state && typeof SH.state.setText === "function") {
      SH.state.setText(text, { source: "typing" });
    }

    if (typeof changeCallback === "function") {
      changeCallback();
    }

    safeRenderPreview(text, { source: "typing" });

    if (previewBridge && typeof previewBridge.render === "function") {
      previewBridge.render(editorEl.value);
    }
  }

  function onKeydown(evt) {
    if (!editorEl) return;
    const isCmd = evt.ctrlKey || evt.metaKey;

    // Cmd+Enter inserts page break
    if (isCmd && evt.key === "Enter") {
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      const PAGE_BREAK = "\f";

      editorEl.value = editorEl.value.slice(0, start) +
                       PAGE_BREAK +
                       editorEl.value.slice(end);

      editorEl.selectionStart = editorEl.selectionEnd = start + PAGE_BREAK.length;
      onInput();
      evt.preventDefault();
      return;
    }

    // Cmd+B (handled elsewhere)
    if (isCmd && (evt.key === "b" || evt.key === "B")) {
      evt.preventDefault();
      return;
    }

    // Cmd + Arrow keys → navigate preview
    if (isCmd && (evt.key === "ArrowDown" || evt.key === "ArrowUp")) {
      try {
        let nextIdx = 0;

        if (previewBridge && typeof previewBridge.getCurrentPageIndex === "function") {
          const idx = previewBridge.getCurrentPageIndex();
          nextIdx = evt.key === "ArrowDown" ? idx + 1 : idx - 1;

          if (typeof previewBridge.jumpToMatch === "function") {
            previewBridge.jumpToMatch(nextIdx);
            evt.preventDefault();
            return;
          }
        }

        if (window.UINavigation && typeof window.UINavigation.jumpToPage === "function") {
          const currentIdx = window.SH.pages?.findIndex(p => p.highlighted) ?? 0;
          nextIdx = evt.key === "ArrowDown"
            ? Math.min(currentIdx + 1, window.SH.pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          window.UINavigation.jumpToPage(nextIdx);
          evt.preventDefault();
        }

      } catch (err) {
        console.warn("[ui_editor] navigation failed", err);
      }
    }
  }

  // -------------------------------------------------
  // Fallback preview bridge
  // -------------------------------------------------
  function createFallbackBridge(opts) {
    const previewEl = opts.previewEl || document.getElementById("preview");
    return {
      render: function (text) {
        if (!previewEl) return;
        if (window.CorePreview && typeof CorePreview.updateFromEditor === "function") {
          CorePreview.updateFromEditor(text, { source: "fallback-bridge" });
        } else {
          previewEl.textContent = text;
        }
      },
      jumpToMatch: function () {},
      getCurrentPageIndex: function () { return 0; }
    };
  }

  // -------------------------------------------------
  // Public API
  // -------------------------------------------------
  const api = {
	 /**
     * Initialize the editor.
     * @param {Object} opts - Optional DOM element IDs.
     * @param {string} opts.editorId - ID of the textarea/editor element.
     * @param {string} opts.previewId - ID of the preview container.
     * @param {string} opts.pageSelectId - ID of page select element (optional).
     * @param {string} opts.searchInputId - ID of search input element (optional).
     * @param {string} opts.focusToggleId - ID of focus toggle button (optional).
     * @param {string} opts.previewStatsId - ID of preview stats container (optional).
     * @returns {Promise} Resolves when initialization is complete.
     */
    init: function (opts) {
      opts = opts || {};
      return new Promise((resolve, reject) => {
        editorEl = document.getElementById(opts.editorId || "editor");
        const previewEl = document.getElementById(opts.previewId || "preview");
        const pageSelectEl = document.getElementById(opts.pageSelectId || "pageSelect");
        const searchEl = document.getElementById(opts.searchInputId || "searchInput");
        const focusBtn = document.getElementById(opts.focusToggleId || "focusPageToggle");
        const previewStatsEl = document.getElementById(opts.previewStatsId || "previewStats");

        if (!editorEl) {
          console.error("[ui_editor] #editor not found");
          reject(new Error("editor element missing"));
          return;
        }

        // preview bridge
        if (typeof window.createPreviewBridge === "function") {
          try {
            previewBridge = window.createPreviewBridge({
              editorEl, previewEl, pageSelectEl,
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
        let initial = null;
        if (window.SH && SH.state && typeof SH.state.getText === "function") {
          try { initial = SH.state.getText(); } catch {}
        }
        if ((!initial || initial === "") && typeof readLocal === "function") {
          const restored = readLocal();
          if (restored) initial = restored;
          if (initial && window.SH && SH.state && typeof SH.state.setText === "function") {
            try { SH.state.setText(initial, { source: "autosave-restore" }); } catch {}
          }
        }
        editorEl.value = initial ?? "";
        lastSavedContent = editorEl.value;

        // Attach listeners
        handlers.input = onInput.bind(null);
        handlers.keydown = onKeydown.bind(null);
        editorEl.addEventListener("input", handlers.input);
        editorEl.addEventListener("keydown", handlers.keydown);

        // Autosave
        startAutosave();

        // First render
        safeRenderPreview(editorEl.value, { source: "initial-load", immediate: true });

        // Dirty tracking
		ui_editor.onChange(() => {
		  if (!window.isProgrammaticChange) {
		    const fileId = fileController.getCurrentFile();
		    unsavedChangesController.markDirty(fileId, "editor change");
		  }
		});


        // Signal ready
        setTimeout(() => { try { document.dispatchEvent(new Event("ui-editor-ready")); } catch {} }, 0);

        console.log("%c[ui_editor] Initialized", "color:#0b5fff");
        resolve(api);
      });
    },

	/**
    * Save editor content to server/local file folder.
    * @param {string} filename - Name of the file to save (default: "untitled.fountain").
    */
    saveToFile: async function (filename) {
      if (!editorEl) return;
      const text = editorEl.value;
      const body = { filename: filename || "untitled.fountain", text };
      try {
        const res = await fetch("/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = await res.json();
        console.log("[editor] Saved:", json);
        alert("Saved to files/" + body.filename);
      } catch (err) {
        console.error("[editor] Save failed", err);
        alert("Save failed. Check console.");
      }
    },

	/**
    * Register a callback for when editor content changes.
    * @param {function} cb - Function to call on content change.
    */
    onChange: function (cb) { changeCallback = cb; },
    
    /**
	* Get current editor content as a string.
	* @returns {string} Editor content.
	*/
    getText: function () { return editorEl ? editorEl.value : ""; },
    
    
	/**
	* Set editor content programmatically.
	* @param {string} txt - New content.
	* @param {Object} [opts] - Optional metadata (e.g., source).
	*/
    setText: function (txt, opts) {
      if (!editorEl) return console.warn("[ui_editor] setText called before init");
      editorEl.value = txt == null ? "" : String(txt);
      lastSavedContent = editorEl.value;
      if (window.SH && SH.state && typeof SH.state.setText === "function") {
        try { SH.state.setText(editorEl.value, opts || { source: "setText-api" }); } catch {}
      }
      safeRenderPreview(editorEl.value, { source: opts?.source || "programmatic", immediate: true });
    },

	/**
	* Focus the editor textarea.
	*/
    focus: function () { if (editorEl) editorEl.focus(); },

	/**
	* Destroy editor instance, remove listeners, stop autosave, and clear references.
	*/
    destroy: function () {
      stopAutosave();
      if (editorEl) {
        try {
          if (handlers.input) editorEl.removeEventListener("input", handlers.input);
          if (handlers.keydown) editorEl.removeEventListener("keydown", handlers.keydown);
        } catch {}
      }
      previewBridge = null;
      editorEl = null;
      handlers = { input: null, keydown: null };
      console.log("[ui_editor] destroyed");
    }
  };

  // -------------------------------------------------
  // Destructive / dirty flows
  // -------------------------------------------------
	
	/**
	* Confirm and discard changes to the current file if dirty.
	* @param {function} onContinue - Callback to execute if user confirms.
	* @returns {Promise<boolean>} Resolves true if continue was confirmed.
	*/
  async function confirmDiscardCurrentFile(onContinue) {
    const fileId = fileController.getCurrentFile();
    return unsavedChangesController.confirmDiscardIfDirty?.(fileId, onContinue);
  }

	/**
	* Flow to create a new file safely.
	* @returns {Promise<boolean>} Resolves true if new file created.
	*/
  async function newFileFlow() {
    const ok = await confirmDiscardCurrentFile(async () => {
      fileController.newFile();
      unsavedChangesController.onFileOpened(null);
    });
    return ok;
  }

	/**
	* Flow to open a file safely.
	* @param {string} fileId - ID of the file to open.
	* @returns {Promise<boolean>} Resolves true if file opened.
	*/
  async function openFileFlow(fileId) {
    const ok = await confirmDiscardCurrentFile(async () => {
      await fileController.open(fileId);
      unsavedChangesController.onFileOpened(fileId);
    });
    return ok;
  }

	/**
	* Save current file safely and update dirty tracking.
	* @returns {Promise<boolean>} Resolves true if file saved successfully.
	*/
  async function saveCurrentFile() {
    const fileId = fileController.getCurrentFile();
    if (!fileId) return false;
    const success = await fileController.save();
    if (success) unsavedChangesController.onFileSaved(fileId);
    return success;
  }

	/**
	* Close the current file/project safely, confirming discard if dirty.
	* @returns {Promise<boolean>} Resolves true if closed successfully.
	*/
  async function closeFileFlow() {
    const fileId = fileController.getCurrentFile();
    const ok = await confirmDiscardCurrentFile(async () => {
      fileController.adoptOpenFile(null);
      unsavedChangesController.onFileClosed();
    });
    return ok;
  }

  // -------------------------------------------------
  // Expose
  // -------------------------------------------------
  window.ui_editor = api;
  window.UIEditor = api;
  window.EditorCore = api;

})(window);
