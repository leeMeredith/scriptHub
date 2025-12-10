// js/ui/ui-titlepage.js
// Handles auto-updating the title page header live (Title, Author, etc.)
// Watches editor text and extracts the top block.

(function () {
    const SH = window.SH || (window.SH = {});

    function extractTitleBlock(text) {
        // A very simple Fountain title page extractor.
        // Fountain format:
        //   Title: ...
        //   Credit: ...
        //   Author: ...
        //   ... (until blank line)
        const lines = text.split(/\r?\n/);
        let collecting = false;
        let block = {};

        for (let line of lines) {
            if (/^\s*$/.test(line)) {
                if (collecting) break;  // end section
                continue;
            }
            if (/^[A-Za-z ]+\:/.test(line)) {
                collecting = true;
                const [key, ...rest] = line.split(":");
                block[key.trim().toLowerCase()] = rest.join(":").trim();
            } else if (collecting) {
                // Not key:value → stop
                break;
            }
        }
        return block;
    }

    function updateTitleUI(block) {
        // These fields can be used by a future GUI title page editor.
        const t = document.getElementById("titleDisplay");
        const a = document.getElementById("authorDisplay");

        if (t) t.textContent = block.title || "Untitled";
        if (a) a.textContent = block.author || "";
    }

    function onTextChanged(e) {
        const text = e.detail.text;
        const header = extractTitleBlock(text);
        updateTitleUI(header);
    }

    function init() {
        window.addEventListener("text-changed", onTextChanged);
        console.log("%c[UI-TitlePage] Ready", "color:#7c3aed");
    }

    window.UITitlePage = { init };
})();
