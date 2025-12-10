// js/ui/ui-toolbar.js
// Handles left-side buttons: INT., CHARACTER, (), ACTION, etc.

(function () {

    function init() {
        const buttons = document.querySelectorAll(".toolbar-btn");

        if (!buttons.length) {
            console.warn("ui-toolbar.js: No .toolbar-btn found.");
            return;
        }

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                const txt = btn.dataset.insert || "";
                if (window.UIEditor && UIEditor.insertAtCursor) {
                    UIEditor.insertAtCursor(txt);
                }
            });
        });

        console.log("%c[UI-Toolbar] Ready", "color:#7c3aed");
    }

    window.UIToolbar = { init };

})();
