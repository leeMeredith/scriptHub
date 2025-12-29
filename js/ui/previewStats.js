// js/ui/previewStats.js
// Responsible for: deriving statistics from preview output only

(function () {
    let statsEl = null;

    function init() {
        statsEl = document.getElementById("preview-stats");
        if (!statsEl) {
            console.warn("previewStats.js: Missing #preview-stats element.");
            return;
        }

        window.addEventListener("preview-updated", onPreviewUpdated);
        console.log("[PreviewStats] Initialized");
    }

    function onPreviewUpdated(e) {
        const pages = e.detail?.pages || [];

        const pageCount = pages.length;

        let wordCount = 0;
        let lineCount = 0;
        let charCount = 0;

        pages.forEach(p => {
            const text = stripHtml(p.html || "");
            charCount += text.length;
            wordCount += countWords(text);
            lineCount += countLines(text);
        });

        renderStats({
            pageCount,
            wordCount,
            lineCount,
            charCount
        });
    }

    function renderStats(stats) {
        if (!statsEl) return;

        statsEl.textContent =
            `Pages: ${stats.pageCount}  ` +
            `Words: ${stats.wordCount}  ` +
            `Lines: ${stats.lineCount}`;
    }

    function stripHtml(html) {
        return html.replace(/<[^>]+>/g, "").trim();
    }

    function countWords(text) {
        if (!text) return 0;
        return text.split(/\s+/).filter(Boolean).length;
    }

    function countLines(text) {
        if (!text) return 0;
        return text.split(/\n+/).filter(l => l.trim().length > 0).length;
    }

    window.PreviewStats = {
        init
    };
})();
