// js/ui/ui-resize.js
// Allows resizing the right panel by dragging a vertical handle.

(function () {

    let handle, panel, dragging = false;

    function onMouseMove(e) {
        if (!dragging) return;
        const newWidth = window.innerWidth - e.clientX;
        panel.style.width = Math.max(200, newWidth) + "px";
    }

    function onMouseUp() {
        dragging = false;
        document.body.classList.remove("no-select");
    }

    function init() {
        handle = document.getElementById("resizeHandle");
        panel  = document.getElementById("rightPanel");

        if (!handle || !panel) {
            console.warn("ui-resize.js: Missing resizeHandle or rightPanel.");
            return;
        }

        handle.addEventListener("mousedown", () => {
            dragging = true;
            document.body.classList.add("no-select");
        });

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        console.log("%c[UI-Resize] Ready", "color:#7c3aed");
    }

    window.UIResize = { init };

})();
