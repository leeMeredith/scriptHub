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

function confirmDiscardIfDirty() {
    if (!isDirty) return true;

    return confirm(
        "You have unsaved changes.\n\nDo you want to discard them?"
    );
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

    async function open(filename) {
        if (!filename) return;

        if (!window.SH?.storage?.loadProjectText) {
            console.warn("[ProjectController] Storage not ready");
            return;
        }

        console.log("[ProjectController] Opening project:", filename);

        const text = await SH.storage.loadProjectText(filename);

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
    const filenameLabel = document.getElementById("filenameLabel");
    
    // HOME
    homeBtn?.addEventListener("click", () => {
        if (!confirmDiscardIfDirty()) return;
        window.location.href = "index.html";
    });

    // OPEN
    openBtn?.addEventListener("click", () => hiddenInput?.click());

    hiddenInput?.addEventListener("change", async (ev) => {
        if (!confirmDiscardIfDirty()) {
            ev.target.value = ""; // reset file input
            return;
        }

        const file = ev.target.files[0];
        if (!file) return;

        try {
            const result = await FileAdapter.open(file);

            // Current: manually sets the editor text from a freshly opened file
			// Future: ProjectController.open() should handle both filenames and raw file content,
			//         so we can remove this manual setText call and centralize open logic
            window.ui_editor?.setText?.(result.text);
            
            // Tell ProjectController that a project is now open
			ProjectController.adoptOpenProject(result.filename);

            // Update title state
            if (window.SH?.titleState) {
                SH.titleState.setTitle(result.filename, { dirty: false });
                SH.titleState.markClean();
            }

            // App-level dirty flag
            markClean("open");

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
        }
    });

    // Quick key Ctrl/Cmd + O
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
            e.preventDefault();
            hiddenInput?.click();
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

    // ----------------------------
    // Initialize UI Modules
    // ----------------------------
    if (!window.ui_editor?.init) {
        console.error("[App] ui_editor not found!");
        return;
    }

    await window.ui_editor.init();

	// Load last-opened project (via ProjectController)
	// NOTE: At this point storage may not be ready yet. 
	//       The warning "[ProjectController] Storage not ready" is expected if
	//       SH.storage hasn't initialized. 
	//       In a future refactor, we should wait for storage initialization 
	//       before attempting to open the last project to ensure auto-load works.
	const lastProject = localStorage.getItem("lastProject");
	if (lastProject) {
	    ProjectController.open(lastProject);
	}

    
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
