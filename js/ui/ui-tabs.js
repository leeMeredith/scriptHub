// js/ui/ui-tabs.js
// Controls tab switching: Preview / Pages / Versions / GitTree

(function () {

    let tabButtons = [];
    let tabPanels = [];

    function switchTab(name) {
        // Update buttons
        tabButtons.forEach(btn =>
            btn.classList.toggle("active", btn.dataset.tab === name)
        );

        // Update panels
        tabPanels.forEach(panel =>
            panel.style.display = (panel.dataset.tab === name) ? "block" : "none"
        );

        // Tell the global state about it
        if (window.SH && SH.state) {
            SH.state.setTab(name);
        }

        // Fire browser-level event
        window.dispatchEvent(new CustomEvent("tab-changed", { detail: { tab: name } }));
    }

    function init() {
        tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
        tabPanels  = Array.from(document.querySelectorAll(".tab-panel"));

        if (!tabButtons.length || !tabPanels.length) {
            console.warn("ui-tabs.js: No tabs or panels found.");
            return;
        }

        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => switchTab(btn.dataset.tab));
        });

        // Default to preview tab
        switchTab("preview");

        console.log("%c[UI-Tabs] Ready", "color:#0b5fff");
    }

    window.UITabs = { init, switchTab };

})();
