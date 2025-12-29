// js/ui/ui-navigation.js
// Builds the Pages list, highlights selected page, scrolls preview to it,
// auto-updates highlight as you scroll, and supports keyboard navigation.

(function () {
    let container = null;
    let selectedIndex = 0;
    let pageElements = [];

    // Debounce helper
    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function buildPageList(pages) {
        if (!container) return;
        container.innerHTML = "";

        pages.forEach(page => {
            const div = document.createElement("div");
            div.className = "page-item";
            div.dataset.page = page.index;
            div.textContent = page.snippet || `Page ${page.index + 1}`;

            if (page.index === selectedIndex) {
                div.classList.add("selected");
            }

            container.appendChild(div);
        });
    }

    function scrollToPage(index) {
        const page = pageElements[index];
        if (page) {
            page.scrollIntoView({ behavior: "smooth", block: "start" });
            selectedIndex = index;
            updateHighlight();
        }
    }

    function updateHighlight() {
        if (!container) return;
        Array.from(container.children).forEach(div => {
            div.classList.toggle("selected", Number(div.dataset.page) === selectedIndex);
        });
    }

    function detectVisiblePage() {
        const viewportHeight = window.innerHeight;

        for (let i = 0; i < pageElements.length; i++) {
            const rect = pageElements[i].getBoundingClientRect();
            if (rect.top >= 0 && rect.top < viewportHeight / 3) {
                if (selectedIndex !== i) {
                    selectedIndex = i;
                    updateHighlight();
                }
                break;
            }
        }
    }

    const debouncedDetectVisiblePage = debounce(detectVisiblePage, 50);

    function onPreviewUpdated(e) {
        const pages = e.detail?.pages || [];
        buildPageList(pages);
        pageElements = pages.map(p => document.querySelector(`.page[data-page-index="${p.index}"]`));
        scrollToPage(selectedIndex); // keep position after update
    }

    function onClick(e) {
        if (!e.target.classList.contains("page-item")) return;
        const index = Number(e.target.dataset.page);
        scrollToPage(index);
    }

    function onKeydown(e) {
        if (!pageElements.length) return;

        if (e.key === "ArrowDown") {
            selectedIndex = Math.min(selectedIndex + 1, pageElements.length - 1);
            scrollToPage(selectedIndex);
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            selectedIndex = Math.max(selectedIndex - 1, 0);
            scrollToPage(selectedIndex);
            e.preventDefault();
        } else if (e.key === "Enter") {
            scrollToPage(selectedIndex);
            e.preventDefault();
        }
    }
    
	function jumpToPage(index) {
	    if (!pageElements.length) return;
	    selectedIndex = Math.max(0, Math.min(index, pageElements.length - 1));
	    scrollToPage(selectedIndex);
	}

    function init() {
        container = document.getElementById("pagesList");
        if (!container) {
            console.warn("ui-navigation.js: #pagesList missing.");
            return;
        }

        container.addEventListener("click", onClick);
        window.addEventListener("preview-updated", onPreviewUpdated);
        window.addEventListener("scroll", debouncedDetectVisiblePage);
        window.addEventListener("keydown", onKeydown);

        console.log("%c[UI-Navigation] Ready", "color:#7c3aed");
    }

    window.UINavigation = { init, jumpToPage };
})();
