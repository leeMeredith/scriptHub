/* ---------------------------
   Storage module for ScriptHub
--------------------------- */

(function () {

    const STORAGE_PREFIX = "ScriptHub.";
    const KEY_SETTINGS = STORAGE_PREFIX + "settings";
    const SESSION_KEY = STORAGE_PREFIX + "lastSession";

    // ---------------------------
    // Snapshots (autosave / crash recovery)
    // ---------------------------
    function saveSnapshot(fileId, text, meta = {}) {
        if (!fileId) return;
        const payload = { text, meta, timestamp: Date.now() };
        localStorage.setItem(STORAGE_PREFIX + "snapshot." + fileId, JSON.stringify(payload));
    }

    function loadSnapshot(fileId) {
        if (!fileId) return null;
        const raw = localStorage.getItem(STORAGE_PREFIX + "snapshot." + fileId);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    function clearSnapshot(fileId) {
        if (!fileId) return;
        localStorage.removeItem(STORAGE_PREFIX + "snapshot." + fileId);
    }

    // ---------------------------
    // File persistence
    // ---------------------------
    function saveFileText(fileId, text) {
        if (!fileId) return;
        localStorage.setItem(STORAGE_PREFIX + "file." + fileId, text);
        window.dispatchEvent(new CustomEvent("storage-saved", { detail: { fileId, text } }));
    }

    function loadFileText(fileId) {
        if (!fileId) return "";
        return localStorage.getItem(STORAGE_PREFIX + "file." + fileId) || "";
    }

    function saveFileContent(fileId, projectId, text) {
        // projectId is managed by ProjectIndex; storage only saves text
        saveFileText(fileId, text);
    }

    // ---------------------------
    // Project persistence
    // ---------------------------
    function saveProject(project) {
        if (!project?.id) return;
        const key = STORAGE_PREFIX + "project." + project.id;
        localStorage.setItem(key, JSON.stringify(project));
    }

    function loadProject(projectId) {
        if (!projectId) return null;
        const key = STORAGE_PREFIX + "project." + projectId;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }

    function listAllProjects() {
        const projects = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(STORAGE_PREFIX + "project.")) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) projects.push(JSON.parse(raw));
                } catch {}
            }
        }
        return projects;
    }

    // ---------------------------
    // Settings
    // ---------------------------
    const defaultSettings = { mode: "screenplay", fontSize: 1.25, showPageNumbers: true, theme: "light" };

    function saveSettings(settings) {
        localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent("settings-changed", { detail: settings }));
    }

    function loadSettings() {
        const raw = localStorage.getItem(KEY_SETTINGS);
        if (!raw) return { ...defaultSettings };
        try { return { ...defaultSettings, ...JSON.parse(raw) }; } 
        catch { return { ...defaultSettings }; }
    }

    // ---------------------------
    // Session persistence
    // ---------------------------
    function saveLastSession(session) {
        try {
            const payload = { projectId: session?.projectId ?? null, fileId: session?.fileId ?? null };
            localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn("[Storage] Failed to save session", e);
        }
    }

    function loadLastSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return { projectId: null, fileId: null };
            const parsed = JSON.parse(raw);
            return { projectId: parsed.projectId ?? null, fileId: parsed.fileId ?? null };
        } catch (e) {
            console.warn("[Storage] Failed to load session", e);
            return { projectId: null, fileId: null };
        }
    }

    // ---------------------------
    // Initialization
    // ---------------------------
    async function init() {
        console.log("[Storage] Initializing...");
        // Any future async startup logic can go here
        window.dispatchEvent(new Event("storage-initialized"));
    }

    // ---------------------------
    // Expose API
    // ---------------------------
    window.SH = window.SH || {};
    window.SH.storage = {
        saveSnapshot,
        loadSnapshot,
        clearSnapshot,
        saveFileText,
        loadFileText,
        saveFileContent,
        saveProject,
        loadProject,
        listAllProjects,
        saveSettings,
        loadSettings,
        saveLastSession,
        loadLastSession,
        defaultSettings,
        init
    };

    console.log("[Storage] Ready");
})();
