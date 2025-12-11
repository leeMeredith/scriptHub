/* ==============================
   bridgedPreview.js
   Handles:
   - Page splitting
   - Live preview rendering
   - Search highlighting
   - Focus mode & page navigation
   ============================== */

export default function createPreviewBridge(options){
  const {
    editorEl,       // textarea DOM element
    previewEl,      // container for rendered pages
    pageSelectEl,   // page dropdown
    searchInputEl,  // search input
    focusToggleBtn, // focus toggle button
    previewStatsEl  // element to show number of pages
  } = options;

  const PAGE_BREAK = '\f';
  let pages = [];
  let currentPageIndex = 0;
  let focusMode = false;
  let searchMatches = [];
  let currentMatchIndex = -1;

  /* -------------------------------
     Helpers
  ------------------------------- */
  function splitIntoPages(text){
    if (text.includes(PAGE_BREAK)){
      return text.split(PAGE_BREAK);
    }
    const approxChars = 2000;
    let arr = [];
    for (let i=0;i<text.length;i+=approxChars){
      arr.push(text.slice(i,i+approxChars));
    }
    if (arr.length === 0) arr = [''];
    return arr;
  }

  function escapeHTML(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* -------------------------------
     Rendering
  ------------------------------- */
  function render(){
    const fullText = editorEl.value;
    pages = splitIntoPages(fullText);

    // update stats
    if (previewStatsEl) previewStatsEl.textContent = `${pages.length} page${pages.length===1?'':'s'}`;

    const query = searchInputEl?.value.trim() || '';
    const regex = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi') : null;

    let html = '';
    for (let i=0;i<pages.length;i++){
      let content = escapeHTML(pages[i] || '');
      if (regex) content = content.replace(regex,m=>`<span class="match">${m}</span>`);
      html += `<div class="page" data-page-index="${i}">
        <div class="page-body">${content}</div>
        <div class="page-number">Page ${i+1}</div>
      </div>`;
    }
    previewEl.innerHTML = html;
    populatePageSelect();
    highlightCurrentPage();
  }

  /* -------------------------------
     Page selector
  ------------------------------- */
  function populatePageSelect(){
    if (!pageSelectEl) return;
    pageSelectEl.innerHTML = '';
    pages.forEach((_,i)=>{
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Page ${i+1}`;
      pageSelectEl.appendChild(opt);
    });
    if (currentPageIndex >= pages.length) currentPageIndex = pages.length-1;
    pageSelectEl.value = currentPageIndex;
  }

  function highlightCurrentPage(){
    const nodes = previewEl.querySelectorAll('.page');
    nodes.forEach(n=>n.style.boxShadow='none');
    const el = previewEl.querySelector(`.page[data-page-index="${currentPageIndex}"]`);
    if (el) el.style.boxShadow = '0 0 0 3px rgba(11,95,255,0.07)';
  }

  /* -------------------------------
     Focus mode
  ------------------------------- */
  function enterFocusMode(idx){
    focusMode = true;
    currentPageIndex = idx;
    editorEl.dataset.full = editorEl.value;
    editorEl.value = pages[idx] || '';
    focusToggleBtn.textContent = 'Exit Focus';
    render();
  }

  function exitFocusMode(){
    focusMode = false;
    if (editorEl.dataset.full !== undefined){
      editorEl.value = editorEl.dataset.full;
      delete editorEl.dataset.full;
    }
    focusToggleBtn.textContent = 'Focus Page';
    render();
  }

  function toggleFocus(){
    if (focusMode) exitFocusMode();
    else enterFocusMode(currentPageIndex);
  }

  /* -------------------------------
     Search
  ------------------------------- */
  function findMatches(query){
    searchMatches = [];
    currentMatchIndex = -1;
    if (!query) return;
    const text = editorEl.value.toLowerCase();
    let start = 0;
    const q = query.toLowerCase();
    while(true){
      const idx = text.indexOf(q,start);
      if (idx === -1) break;
      searchMatches.push(idx);
      start = idx + q.length;
    }
  }

  function jumpToMatch(i){
    if (!searchMatches.length) return;
    currentMatchIndex = ((i % searchMatches.length) + searchMatches.length) % searchMatches.length;
    const pos = searchMatches[currentMatchIndex];
    editorEl.focus();
    editorEl.selectionStart = pos;
    editorEl.selectionEnd = pos + (searchInputEl.value.length || 0);
  }

  /* -------------------------------
     Event listeners
  ------------------------------- */
  focusToggleBtn?.addEventListener('click', toggleFocus);

  pageSelectEl?.addEventListener('change', ()=>{
    currentPageIndex = parseInt(pageSelectEl.value,10);
    if (focusMode) enterFocusMode(currentPageIndex);
    else highlightCurrentPage();
  });

  searchInputEl?.addEventListener('input', ()=>{
    findMatches(searchInputEl.value.trim());
    render();
    if (searchMatches.length) jumpToMatch(0);
  });

  previewEl?.addEventListener('click', (ev)=>{
    const pageEl = ev.target.closest('.page');
    if (!pageEl) return;
    const idx = parseInt(pageEl.dataset.pageIndex,10);
    currentPageIndex = idx;
    if (pageSelectEl) pageSelectEl.value = idx;
    if (focusMode) enterFocusMode(idx);
    else highlightCurrentPage();
  });

  /* -------------------------------
     Public API
  ------------------------------- */
  return {
    render,
    enterFocusMode,
    exitFocusMode,
    toggleFocus,
    jumpToMatch,
    getPages: ()=>pages,
    getCurrentPageIndex: ()=>currentPageIndex,
    isFocusMode: ()=>focusMode
  };
}
