// js/core/projects.js
// Handles project loading, creation, samples, and feeding text into state/parsers.

(function () {

    const SH = window.SH || (window.SH = {});
    const STORAGE = SH.storage;

    /**
     * Convert a filename or title into a project ID
     */
    function projectIdFromName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    /**
     * Create a new blank Fountain script
     */
    function createNewProject(title = "Untitled Script") {
        const id = projectIdFromName(title);

        const starterText = `Title: ${title}
Author: You

INT. SETTING - DAY

Your script begins here.
`;

        // Save it immediately
        STORAGE.saveProjectText(id, starterText);
        STORAGE.setLastProject(id);

        loadProject(id);
    }

    /**
     * Load a Fountain script from /projects folder (built-in examples)
     */
    async function loadSample(filename) {
        try {
            const response = await fetch(`projects/${filename}`);
            const text = await response.text();

            const id = projectIdFromName(filename);

            STORAGE.saveProjectText(id, text);
            STORAGE.setLastProject(id);

            loadProject(id);
        } catch (err) {
            console.error("Failed to load sample:", err);
        }
    }

    /**
     * Load a project by ID from localStorage
     */
    function loadProject(projectId) {
        const text = STORAGE.loadProjectText(projectId) || "";

        STORAGE.setLastProject(projectId);

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

            const id = projectIdFromName(file.name);

            STORAGE.saveProjectText(id, raw);
            STORAGE.setLastProject(id);

            loadProject(id);
        };
        reader.readAsText(file);
    }

    /**
     * Restore last project at startup if it exists
     */
    function restoreLastProject() {
        const last = STORAGE.getLastProject();
        if (last) loadProject(last);
    }

    // Expose API
    SH.projects = {
        createNewProject,
        loadSample,
        loadProject,
        importFile,
        restoreLastProject
    };

    console.log("%c[Projects] Ready", "color:#0b5fff");

})();
