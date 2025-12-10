// js/core/storage.js
// Responsible for saving/loading drafts, project files,
// user settings, and firing events so other modules stay in sync.

(function () {

    const STORAGE_PREFIX = "ScriptHub.";
    const KEY_LAST_PROJECT = STORAGE_PREFIX + "lastProject";
    const KEY_SETTINGS = STORAGE_PREFIX + "settings";

    // Default settings
    const defaultSettings = {
        mode: "screenplay",
        fontSize: 1.25,
        showPageNumbers: true,
        theme: "light"
    };

    /** Save the active script text under the active project ID */
    function saveProjectText(projectId, text) {
        if (!projectId) return;

        localStorage.setItem(STORAGE_PREFIX + "project." + projectId, text);

        window.dispatchEvent(new CustomEvent("storage-saved", {
            detail: { projectId, text }
        }));
    }

    /** Load script text from a given project ID */
    function loadProjectText(projectId) {
        if (!projectId) return "";
        return localStorage.getItem(STORAGE_PREFIX + "project." + projectId) || "";
    }

    /** Save general editor settings */
    function saveSettings(settings) {
        localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));

        window.dispatchEvent(new CustomEvent("settings-changed", {
            detail: settings
        }));
    }

    /** Load settings (with fallback defaults) */
    function loadSettings() {
        const raw = localStorage.getItem(KEY_SETTINGS);
        if (!raw) return { ...defaultSettings };

        try {
            return { ...defaultSettings, ...JSON.parse(raw) };
        } catch (e) {
            console.warn("Failed to parse settings; using defaults.");
            return { ...defaultSettings };
        }
    }

    /** Remember last opened project */
    function setLastProject(projectId) {
        localStorage.setItem(KEY_LAST_PROJECT, projectId);
    }

    function getLastProject() {
        return localStorage.getItem(KEY_LAST_PROJECT);
    }

    // Expose global API
    window.SH = window.SH || {};
    window.SH.storage = {
        saveProjectText,
        loadProjectText,
        saveSettings,
        loadSettings,
        setLastProject,
        getLastProject,
        defaultSettings
    };

    console.log("%c[Storage] Ready", "color:#0b5fff");

})();
