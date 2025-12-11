/* ==============================
   editor.js
   Initializes the editor UI and connects
   it to the bridgedPreview.js module
   ============================== */

import createPreviewBridge from './core/bridgedPreview.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const editorEl = document.getElementById('scriptArea');
  const previewEl = document.getElementById('preview');
  const pageSelectEl = document.getElementById('pageSelect');
  const searchInputEl = document.getElementById('searchInput');
  const focusToggleBtn = document.getElementById('focusPageToggle');
  const previewStatsEl = document.getElementById('previewStats');

  // --- Create the preview bridge ---
  const previewBridge = createPreviewBridge({
    editorEl,
    previewEl,
    pageSelectEl,
    searchInputEl,
    focusToggleBtn,
    previewStatsEl
  });

  // --- Initial render ---
  previewBridge.render();

  // --- Editor events ---
  editorEl.addEventListener('input', () => {
    previewBridge.render();
  });

  editorEl.addEventListener('keydown', (e) => {
    // Optional: keyboard navigation between pages
    if (e.ctrlKey && e.key === 'ArrowDown') {
      previewBridge.jumpToMatch(previewBridge.getCurrentPageIndex() + 1);
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === 'ArrowUp') {
      previewBridge.jumpToMatch(previewBridge.getCurrentPageIndex() - 1);
      e.preventDefault();
    }
  });

  // --- Toolbar / additional UI controls ---
  // Example: clear search
  const clearSearchBtn = document.getElementById('clearSearch');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInputEl.value = '';
      previewBridge.render();
    });
  }

  // Example: focus toggle already handled by bridgedPreview internally
});
