// js/ui/ui-navigation.js
// Builds the Pages list and scrolls preview to selected page.

(function () {
    const SH = window.SH || (window.SH = {});

    let container = null;

    function buildPageList(pages) {
        if (!container) return;
        container.innerHTML = "";

        pages.forEach(page => {
            const div = document.createElement("div");
            div.className = "page-item";
            div.dataset.page = page.index;
            div.textContent = page.snippet || `Page ${page.index + 1}`;
            container.appendChild(div);
        });
    }

    function scrollToPage(index) {
        const page = document.querySelector(`.page[data-page-index="${index}"]`);
        if (page) {
            page.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function onPreviewUpdated() {
        const pages = SH.state.getPages();
        buildPageList(pages);
    }

    function onClick(e) {
        if (!e.target.classList.contains("page-item")) return;
        const index = Number(e.target.dataset.page);
        scrollToPage(index);
    }

    function init() {
        container = document.getElementById("pagesList");
        if (!container) {
            console.warn("ui-navigation.js: #pagesList missing.");
            return;
        }

        container.addEventListener("click", onClick);
        window.addEventListener("preview-updated", onPreviewUpdated);

        console.log("%c[UI-Navigation] Ready", "color:#7c3aed");
    }

    window.UINavigation = { init };
})();
