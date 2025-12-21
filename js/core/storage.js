// js/core/storage.js
// Responsible for saving/loading drafts, project files,
// user settings, and firing events so other modules stay in sync.

(function () {

    const STORAGE_PREFIX = "ScriptHub.";
    const KEY_LAST_PROJECT = STORAGE_PREFIX + "lastProject";
    const KEY_SETTINGS = STORAGE_PREFIX + "settings";
    
    // -----------------------------------------------------------------------------
	// Snapshot storage (autosave / crash recovery)
	// Non-authoritative, non-user-facing, session safety only
	// -----------------------------------------------------------------------------
	
	function saveSnapshot(projectId, text, meta = {}) {
	    if (!projectId) return;
	
	    const payload = {
	        text,
	        meta,
	        timestamp: Date.now()
	    };
	
	    localStorage.setItem(
	        STORAGE_PREFIX + "snapshot." + projectId,
	        JSON.stringify(payload)
	    );
	}
	
	function loadSnapshot(projectId) {
	    if (!projectId) return null;
	
	    const raw = localStorage.getItem(
	        STORAGE_PREFIX + "snapshot." + projectId
	    );
	
	    if (!raw) return null;
	
	    try {
	        return JSON.parse(raw);
	    } catch {
	        return null;
	    }
	}
	
	function clearSnapshot(projectId) {
	    if (!projectId) return;
	
	    localStorage.removeItem(
	        STORAGE_PREFIX + "snapshot." + projectId
	    );
	}


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
	    // snapshots (non-authoritative)
	    saveSnapshot,
	    loadSnapshot,
	    clearSnapshot,
	
	    // project persistence (authoritative)
	    saveProjectText,
	    loadProjectText,
	
	    // settings
	    saveSettings,
	    loadSettings,
	
	    // session
	    setLastProject,
	    getLastProject,
	
	    defaultSettings
	};


    console.log("%c[Storage] Ready", "color:#0b5fff");
    window.dispatchEvent(new Event("storage-initialized"));


})();
