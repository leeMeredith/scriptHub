// js/core/storage.js
// Responsible for saving/loading drafts, file files,
// user settings, and firing events so other modules stay in sync.

(function () {

    const STORAGE_PREFIX = "ScriptHub.";
    const KEY_LAST_FILE = STORAGE_PREFIX + "lastFile";
    const KEY_SETTINGS = STORAGE_PREFIX + "settings";
    
    // -----------------------------------------------------------------------------
	// Snapshot storage (autosave / crash recovery)
	// Non-authoritative, non-user-facing, session safety only
	// -----------------------------------------------------------------------------
	
	function saveSnapshot(fileId, text, meta = {}) {
	    if (!fileId) return;
	
	    const payload = {
	        text,
	        meta,
	        timestamp: Date.now()
	    };
	
	    localStorage.setItem(
	        STORAGE_PREFIX + "snapshot." + fileId,
	        JSON.stringify(payload)
	    );
	}
	
	function loadSnapshot(fileId) {
	    if (!fileId) return null;
	
	    const raw = localStorage.getItem(
	        STORAGE_PREFIX + "snapshot." + fileId
	    );
	
	    if (!raw) return null;
	
	    try {
	        return JSON.parse(raw);
	    } catch {
	        return null;
	    }
	}
	
	function clearSnapshot(fileId) {
	    if (!fileId) return;
	
	    localStorage.removeItem(
	        STORAGE_PREFIX + "snapshot." + fileId
	    );
	}


    // Default settings
    const defaultSettings = {
        mode: "screenplay",
        fontSize: 1.25,
        showPageNumbers: true,
        theme: "light"
    };

    /** Save the active script text under the active file ID */
    function saveFileText(fileId, text) {
        if (!fileId) return;

        localStorage.setItem(STORAGE_PREFIX + "file." + fileId, text);

        window.dispatchEvent(new CustomEvent("storage-saved", {
            detail: { fileId, text }
        }));
    }

    /** Load script text from a given file ID */
    function loadFileText(fileId) {
        if (!fileId) return "";
        return localStorage.getItem(STORAGE_PREFIX + "file." + fileId) || "";
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

    /** Remember last opened file */
    function setLastFile(fileId) {
        localStorage.setItem(KEY_LAST_FILE, fileId);
    }

    function getLastFile() {
        return localStorage.getItem(KEY_LAST_FILE);
    }

    // Expose global API
    window.SH = window.SH || {};

	window.SH.storage = {
	    // snapshots (non-authoritative)
	    saveSnapshot,
	    loadSnapshot,
	    clearSnapshot,
	
	    // file persistence (authoritative)
	    saveFileText,
	    loadFileText,
	
	    // settings
	    saveSettings,
	    loadSettings,
	
	    // session
	    setLastFile,
	    getLastFile,
	
	    defaultSettings
	};


    console.log("%c[Storage] Ready", "color:#0b5fff");
    window.dispatchEvent(new Event("storage-initialized"));


})();
