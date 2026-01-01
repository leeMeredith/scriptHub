// js/core/unsavedChangesController.js
// -----------------------------------------------------------------------------
// unsavedChangesController
// -----------------------------------------------------------------------------
// Tracks dirty / clean state per fileId.
// - Does NOT save files
// - Does NOT know about projects
// - Does NOT touch localStorage
// -----------------------------------------------------------------------------

(function () {

  let dirtyFileId = null;

  // ---------------------------------------------------------------------------
  // State queries
  // ---------------------------------------------------------------------------

  function isDirty() {
    return !!dirtyFileId;
  }

  function isFileDirty(fileId) {
    return dirtyFileId === fileId;
  }

  // ---------------------------------------------------------------------------
  // State mutation
  // ---------------------------------------------------------------------------

  function markDirty(fileId, reason = "") {
    if (!fileId) return;

    dirtyFileId = fileId;

    console.log("[Dirty]", fileId, reason);
    window.SH?.titleState?.markDirty?.();
  }

  function markClean(reason = "") {
    dirtyFileId = null;

    console.log("[Clean]", reason);
    window.SH?.titleState?.markClean?.();
  }

  // ---------------------------------------------------------------------------
  // File lifecycle hooks
  // ---------------------------------------------------------------------------

  function onFileOpened(fileId) {
    dirtyFileId = null;
    window.SH?.titleState?.markClean?.();
  }

  function onFileSaved(fileId) {
    if (dirtyFileId === fileId) {
      markClean("file saved");
    }
  }

  function onFileClosed() {
    dirtyFileId = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.unsavedChangesController = {
    // queries
    isDirty,
    isFileDirty,

    // state
    markDirty,
    markClean,

    // lifecycle
    onFileOpened,
    onFileSaved,
    onFileClosed
  };

  console.log("%c[unsavedChangesController] Ready", "color:#0b5fff;font-weight:700;");

})();
