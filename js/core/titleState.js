// js/core/titleState.js
// Single source of truth for the current document title / filename

(function () {
  "use strict";

  let title = "Untitled";
  let dirty = false;

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  function emit() {
    window.dispatchEvent(new CustomEvent("title-changed", {
      detail: {
        title,
        dirty,
        displayTitle: getDisplayTitle()
      }
    }));
  }

  function getDisplayTitle() {
    return dirty ? `${title} *` : title;
  }

  // -------------------------------------------------
  // API
  // -------------------------------------------------
  const api = {

    // Set a new title (e.g. after Open or Save As)
    setTitle(newTitle, opts = {}) {
      if (!newTitle) newTitle = "Untitled";

      title = String(newTitle);
      dirty = !!opts.dirty;

      emit();
    },

    // Mark dirty (editor change)
    markDirty() {
      if (!dirty) {
        dirty = true;
        emit();
      }
    },

    // Mark clean (successful save)
    markClean() {
      if (dirty) {
        dirty = false;
        emit();
      }
    },

    // Reset to brand new document
    reset() {
      title = "Untitled";
      dirty = false;
      emit();
    },

    // Read-only accessors
    getTitle() {
      return title;
    },

    isDirty() {
      return dirty;
    },

    getDisplayTitle() {
      return getDisplayTitle();
    }
  };

  // -------------------------------------------------
  // Expose
  // -------------------------------------------------
  window.SH = window.SH || {};
  window.SH.titleState = api;

  console.log("%c[TitleState] Ready", "color:#0b5fff");

})();
