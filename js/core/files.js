// js/core/files.js
// Handles file loading, creation, samples, and feeding text into state/parsers.

(function () {

    const SH = window.SH || (window.SH = {});
    const STORAGE = SH.storage;

    /**
     * Convert a filename or title into a file ID
     */
    function fileIdFromName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    /**
     * Create a new blank Fountain script
     */
    function createNewFile(title = "Untitled Script") {
        const id = fileIdFromName(title);

        const starterText = `Title: ${title}
Author: You

INT. SETTING - DAY

Your script begins here.
`;

        // Save it immediately
        STORAGE.saveFileText(id, starterText);
        STORAGE.setLastFile(id);

        loadFile(id);
    }

    /**
     * Load a Fountain script from /files folder (built-in examples)
     */
    async function loadSample(filename) {
        try {
            const response = await fetch(`files/${filename}`);
            const text = await response.text();

            const id = fileIdFromName(filename);

            STORAGE.saveFileText(id, text);
            STORAGE.setLastFile(id);

            loadFile(id);
        } catch (err) {
            console.error("Failed to load sample:", err);
        }
    }

    /**
     * Load a file by ID from localStorage
     */
    function loadFile(fileId) {
        const text = STORAGE.loadFileText(fileId) || "";

        STORAGE.setLastFile(fileId);

        // Update state
        SH.state.setText(text);

        // Update pages through parser -> preview render
        // Use CorePreview.render if present; otherwise use SH.parser -> preview event
        if (window.CorePreview && typeof CorePreview.render === "function") {
            CorePreview.render(text);
        } else if (SH.parser && typeof SH.parser.updateFromText === "function") {
            // still update SH.pages so navigation can pick it up
            const parsed = SH.parser.updateFromText(text);
            const html = parsed.htmlScript || "";
            // naive split into pages (like preview would)
            const pages = (html ? html.split("<hr />") : [""]).map((h, i) => ({ index: i, html: h, snippet: (h || "").replace(/<[^>]+>/g, "").slice(0, 120) }));
            SH.pages = pages;
            window.dispatchEvent(new CustomEvent("preview-updated", { detail: { pages } }));
        }

        // Notify UI
        window.dispatchEvent(new CustomEvent("text-changed", {
            detail: { text }
        }));
    }

    /**
     * Load a .fountain file selected by the user
     */
    function importFile(file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            const raw = evt.target.result;

            const id = fileIdFromName(file.name);

            STORAGE.saveFileText(id, raw);
            STORAGE.setLastFile(id);

            loadFile(id);
        };
        reader.readAsText(file);
    }

    /**
     * Restore last file at startup if it exists
     */
    function restoreLastFile() {
        const last = STORAGE.getLastFile();
        if (last) loadFile(last);
    }

    // Expose API
    SH.files = {
        createNewFile,
        loadSample,
        loadFile,
        importFile,
        restoreLastFile
    };

    console.log("%c[Files] Ready", "color:#0b5fff");

})();
