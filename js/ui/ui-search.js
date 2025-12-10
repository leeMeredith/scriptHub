// js/ui/ui-search.js
// Adds search box, next/prev buttons, and highlights results in preview.

(function () {
    const SH = window.SH || (window.SH = {});

    let input, nextBtn, prevBtn;
    let matches = [];
    let currentIndex = -1;

    function collectMatches(text, query) {
        if (!query) return [];
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

        const result = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            result.push({ index: match.index, length: match[0].length });
        }
        return result;
    }

    function updateHighlight() {
        const preview = document.getElementById("preview");
        if (!preview) return;

        // Remove old highlights
        preview.querySelectorAll(".search-hit").forEach(el => {
            el.classList.remove("search-hit");
        });

        if (currentIndex < 0 || !matches[currentIndex]) return;

        const hit = matches[currentIndex];

        // Find the page wrapper containing this text position
        // (Lightweight version: just scroll to page where snippet matches)
        const page = document.querySelector(
            `.page[data-page-index="${Math.floor(hit.index / 2000)}"]`
        );
        if (page) {
            page.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function performSearch() {
        const q = input.value.trim();
        const text = SH.state.getText();

        matches = collectMatches(text, q);
        currentIndex = matches.length ? 0 : -1;

        updateHighlight();
    }

    function nextMatch() {
        if (!matches.length) return;
        currentIndex = (currentIndex + 1) % matches.length;
        updateHighlight();
    }

    function prevMatch() {
        if (!matches.length) return;
        currentIndex = (currentIndex - 1 + matches.length) % matches.length;
        updateHighlight();
    }

    function init() {
        input = document.getElementById("searchInput");
        nextBtn = document.getElementById("searchNext");
        prevBtn = document.getElementById("searchPrev");

        if (!input) {
            console.warn("ui-search.js: missing searchInput");
            return;
        }

        input.addEventListener("input", performSearch);
        if (nextBtn) nextBtn.addEventListener("click", nextMatch);
        if (prevBtn) prevBtn.addEventListener("click", prevMatch);

        console.log("%c[UI-Search] Ready", "color:#7c3aed");
    }

    window.UISearch = { init };
})();
