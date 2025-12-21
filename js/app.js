// js/app.js
// Main startup logic for ScriptHub Editor

let isDirty = false;

window._debug_isDirty = () => isDirty;

function markDirty(reason = "") {
    if (!isDirty) {
        isDirty = true;
        console.log("[Dirty] marked dirty", reason);
    }
}

function markClean(reason = "") {
    if (isDirty) {
        isDirty = false;
        console.log("[Dirty] marked clean", reason);
    }
}

async function confirmDiscardIfDirty() {
    if (!isDirty) return true;

    const choice = confirm("You have unsaved changes.\n\nPress OK to save before opening a new file, Cancel to discard changes.");

    if (choice) {
        // User wants to save
        const currentProject = ProjectController.getCurrentProject();

        if (!currentProject) {
            const filename = prompt("No project open. Enter filename to save:");
            if (!filename) return false; // user cancelled
            await ProjectController.saveAs(filename);
        } else {
            await ProjectController.save();
        }

        return true;
    } else {
        // User wants to discard changes
        return confirm("Discard unsaved changes?\n\nPress OK to discard, Cancel to keep editing.");
    }
}

// Guard browser close / reload
window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = "";
});

// React to title state changes
window.addEventListener("title-changed", () => {
    updateWindowTitle();
});

// Optional: Live log for testing title state
window.addEventListener("title-changed", (e) => {
    const displayTitle = e.detail.displayTitle;

    // Visual update
    if (filenameLabel) filenameLabel.textContent = displayTitle;

    // Console debug
    console.log("[TitleState]", displayTitle);
});

// Derives title from titleState
function updateWindowTitle() {
    let title = "ScriptHub";

    if (window.SH && SH.titleState) {
        try {
            title = SH.titleState.getDisplayTitle();
        } catch {}
    }

    document.title = `${title} — ScriptHub`;
}

// ----------------------------
// Storage readiness gate
// ----------------------------
window.SH = window.SH || {};

if (!window.SH.storageReady) {
    window.SH.storageReady = new Promise((resolve) => {
        if (window.SH.storage?.loadProjectText) {
            console.log("[StorageReady] Storage already ready");
            resolve();
        } else {
            window.addEventListener("storage-initialized", () => {
                console.log("[StorageReady] Storage initialized");
                resolve();
            });
        }
    });
}

// Autosave control (placeholders)
let autosaveTimer = null;

function startAutosave() {}
function stopAutosave() {}
function scheduleAutosave() {}
function performAutosave() {}
/*
    ProjectController
    -----------------
    PURPOSE:
    This module is the single authoritative coordinator for
    opening, saving, and managing a "project" in ScriptHub.

    CURRENT ROLE:
    - Owns the concept of "currentProject"
    - Coordinates editor text loading
    - Manages dirty / clean state transitions
    - Updates title state consistently
    - Acts as the ONLY public entry point for project open/save

    IMPORTANT DESIGN CONSTRAINT:
    UI code (buttons, menus, welcome page, shortcuts)
    MUST NOT talk directly to FileAdapter, storage, or editor
    state for project operations. All such actions go through
    ProjectController.

    FUTURE EVOLUTION (INTENTIONAL):
    - FileAdapter may be replaced or supplemented by:
        * IndexedDB
        * Local project storage
        * Cloud sync / collaboration
    - UI code should NOT need to change when this happens.
    - ProjectController is the stability boundary.

    NOTE FOR FUTURE REFACTORING:
    If project open/save logic is duplicated elsewhere,
    that is a bug — not a feature.
*/

const ProjectController = (() => {
    let currentProject = null;

    function getCurrentProject() {
        return currentProject;
    }
    
    function adoptOpenProject(filename) {
	    if (!filename) return;
	
	    currentProject = filename;
	    localStorage.setItem("lastProject", filename);
	
	    console.log("[ProjectController] Adopted open project:", filename);
	}

	async function open(input) {
	    if (!input) return;
	
	    let filename, text;
	
	    if (typeof input === "string") {
	        // Opening from lastProject / storage
	        filename = input;
	
	        if (!window.SH?.storage?.loadProjectText) {
	            console.warn("[ProjectController] Storage not ready");
	            return;
	        }
	
	        text = await SH.storage.loadProjectText(filename);
	    } else if (typeof input === "object") {
	        // Opening from file picker with raw text
	        filename = input.filename;
	        text = input.text;
	    } else {
	        console.warn("[ProjectController] Invalid open input", input);
	        return;
	    }
	
	    console.log("[ProjectController] Opening project:", filename);
	
	    // Editor content
	    window.ui_editor?.setText?.(text);
	
	    // Reset view
	    window.ui_editor?.setCursor?.(0);
	    window.ui_editor?.setScroll?.(0);
	
	    // Title state
	    if (window.SH?.titleState) {
	        SH.titleState.setTitle(filename, { dirty: false });
	        SH.titleState.markClean();
	    }
	
	    markClean("project opened");
	
	    currentProject = filename;
	    localStorage.setItem("lastProject", filename);
	}

    async function save() {
        if (!currentProject) return;

        const text = window.ui_editor?.getText?.() ?? "";
        await FileAdapter.save(currentProject, text);

        markClean("project saved");
        window.SH?.titleState?.markClean();
    }

    async function saveAs(filename) {
        if (!filename) return;

        const text = window.ui_editor?.getText?.() ?? "";
        const savedFilename = await FileAdapter.saveAs(filename, text);
        if (!savedFilename) return;

        currentProject = savedFilename;
        localStorage.setItem("lastProject", savedFilename);

        markClean("project saved as");
        window.SH?.titleState?.markClean();
    }

    return {
		open,
		save,
		saveAs,
		getCurrentProject,
		adoptOpenProject
    };
})();


window.addEventListener("DOMContentLoaded", async () => {
    console.log("%c[App] ScriptHub Editor Booting…", "color:#0b5fff; font-weight:700;");
    

    // ----------------------------
    // Topbar Buttons
    // ----------------------------
    const homeBtn = document.getElementById("homeButton");
    const saveBtn = document.getElementById("saveProject");
    const openBtn = document.getElementById("openProject");
    const hiddenInput = document.getElementById("fileInput");
    const saveAsBtn = document.getElementById("saveProjectAs");
    const newProjectBtn = document.getElementById("newProjectButton");
    const filenameLabel = document.getElementById("filenameLabel");
    
    // HOME
	homeBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return;
	    window.location.href = "index.html";
	});

	// OPEN button
	openBtn?.addEventListener("click", async () => {
	    // Check for unsaved changes first
	    if (!await confirmDiscardIfDirty()) return;
	
	    // Trigger hidden file input
	    hiddenInput?.click();
	});
	
	// File input change handler
	hiddenInput?.addEventListener("change", async (ev) => {
	    const file = ev.target.files[0];
	    if (!file) return;
	
	    try {
	        const result = await FileAdapter.open(file);
	
	        // Unified open via ProjectController
	        await ProjectController.open({
	            filename: result.filename,
	            text: result.text
	        });
	
	        // Restore saved editor state
	        const savedStateKey = `editorState_${result.filename}`;
	        const savedState = JSON.parse(localStorage.getItem(savedStateKey) || "{}");
	
	        if (savedState.cursor != null && window.ui_editor.setCursor) {
	            window.ui_editor.setCursor(savedState.cursor);
	        }
	
	        if (savedState.scroll != null && window.ui_editor.setScroll) {
	            window.ui_editor.setScroll(savedState.scroll);
	        }
	
	        console.log("[App] Opened", result.filename);
	    } catch (err) {
	        console.error("[App] Open failed", err);
	        alert("Failed to open file.");
	    } finally {
	        // Reset input so same file can be re-selected
	        ev.target.value = "";
	    }
	});


	// ----------------------------
	// Keyboard shortcuts
	// ----------------------------
	document.addEventListener("keydown", async (e) => {
	    const isCmd = e.metaKey || e.ctrlKey;
	    if (!isCmd) return;
	
	    const key = e.key.toLowerCase();
	
	    // --------------------
	    // Open (Cmd/Ctrl + O)
	    // --------------------
	    if (key === "o" && !e.shiftKey) {
	        e.preventDefault();
	
	        // Check for unsaved changes first
	        if (!await confirmDiscardIfDirty()) return;
	
	        // Open file picker
	        hiddenInput?.click();
	    }
	
	    // --------------------
	    // Save (Cmd/Ctrl + S)
	    // --------------------
	    if (key === "s" && !e.shiftKey) {
	        e.preventDefault();
	        const currentProject = ProjectController.getCurrentProject();
	
	        if (!currentProject) {
	            alert("No project open. Use Save As (Shift+Cmd/Ctrl+S) to create a new project.");
	            return;
	        }
	
	        try {
	            await ProjectController.save();
	            console.log("[Keyboard] Saved via shortcut");
	        } catch (err) {
	            console.error("[Keyboard] Save error", err);
	            alert("Save failed. Check console.");
	        }
	    }
	
	    // --------------------
	    // Save As (Shift + Cmd/Ctrl + S)
	    // --------------------
	    if (key === "s" && e.shiftKey) {
	        e.preventDefault();
	        const filename = prompt("Save As filename:");
	        if (!filename) return;
	
	        try {
	            await ProjectController.saveAs(filename);
	            console.log("[Keyboard] Saved As via shortcut:", filename);
	        } catch (err) {
	            console.error("[Keyboard] Save As error", err);
	            alert("Save As failed. Check console.");
	        }
	    }
	});


    // SAVE
	saveBtn?.addEventListener("click", async () => {
	    if (!ProjectController.getCurrentProject()) {
	        alert("No project open. Use Open or Save As.");
	        return;
	    }
	
	    try {
	        await ProjectController.save();
	        console.log("[App] Saved");
	    } catch (err) {
	        console.error("[App] Save error", err);
	        alert("Save failed. Check console.");
	    }
	});

    // SAVE AS
	saveAsBtn?.addEventListener("click", async () => {
	    const filename = prompt("Save As filename:");
	    if (!filename) return;
	
	    try {
	        await ProjectController.saveAs(filename);
	        console.log("[App] Saved As", filename);
	    } catch (err) {
	        console.error("[App] Save As error", err);
	        alert("Save As failed. Check console.");
	    }
	});
	
	newProjectBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return;
	
	    // Clear editor and reset state
	    window.ui_editor?.setText?.("");
	    window.ui_editor?.setCursor?.(0);
	    window.ui_editor?.setScroll?.(0);
	
	    markClean("new project");
	    ProjectController.adoptOpenProject(null);
	
	    if (window.SH?.titleState) {
	        SH.titleState.setTitle("Untitled", { dirty: false });
	        SH.titleState.markClean();
	    }
	
	    console.log("[App] New project created");
	});

    // ----------------------------
    // Initialize UI Modules
    // ----------------------------
    if (!window.ui_editor?.init) {
        console.error("[App] ui_editor not found!");
        return;
    }

    await window.ui_editor.init();

	// Load last-opened project AFTER storage is ready
	window.SH.storageReady.then(async () => {
	    const lastProject = localStorage.getItem("lastProject");
	    if (!lastProject) return;
	
	    try {
			await ProjectController.open({ filename: lastProject });
	        console.log("[Startup] Last project loaded:", lastProject);
	    } catch (err) {
	        console.error("[Startup] Failed to load last project:", err);
	    }
	});

    
	window.ui_editor.setDirtyCallback = markDirty;


    // ----------------------------
    // Track editor state (cursor + scroll) for restoration
    // ----------------------------
	window.ui_editor.onChange(() => {
	    const cp = ProjectController.getCurrentProject();
	    if (!cp) return;
	
	    markDirty("editor change");
	    if (window.SH?.titleState) SH.titleState.markDirty();
	
	    const state = {
	        cursor: window.ui_editor.getCursor?.(),
	        scroll: window.ui_editor.getScroll?.()
	    };
	
	    localStorage.setItem(
	        `editorState_${cp}`,
	        JSON.stringify(state)
	    );
	});

    // ----------------------------
    // Visual filename label updates (dirty/star)
    // ----------------------------
    window.addEventListener("title-changed", (e) => {
        const displayTitle = e.detail.displayTitle;
        if (filenameLabel) filenameLabel.textContent = displayTitle;
    });

    // Initialize remaining modules
    window.ui_toolbar?.init?.();
    window.ui_tabs?.init?.();
    window.ui_navigation?.init?.();
    window.ui_search?.init?.();
    window.ui_titlePage?.init?.();
    window.ui_resize?.init?.();

    console.log("%c[App] All modules initialized.", "color:#0b5fff; font-weight:700;");
});
