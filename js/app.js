// js/app.js
// Main startup logic for ScriptHub Editor

let isDirty = false;
let isProgrammaticChange = false;

window._debug_isDirty = () => isDirty;

// ----------------------------
// Dirty state helpers
// ----------------------------
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



// ProjectController — lifecycle authority
// -------------------------------------------------
// Owns project state transitions (open, save, new).
// Must remain UI-agnostic and platform-agnostic.
// Electron menus, shortcuts, and IPC should call
// into this controller without duplicating logic.

// ----------------------------
// Confirm before losing changes
// ----------------------------
async function confirmDiscardIfDirty(onContinue) {
    if (!isDirty) {
        if (onContinue) await onContinue();
        return true;
    }

    const choice = confirm(
        "You have unsaved changes.\n\n" +
        "OK = Save first\n" +
        "Cancel = Discard changes"
    );

    if (choice) {
        const currentProject = ProjectController.getCurrentProject();
        if (!currentProject) {
            const filename = prompt("Enter filename to save:");
            if (!filename) return false;
            await ProjectController.saveAs(filename);
        } else {
            await ProjectController.save();
        }

        if (onContinue) await onContinue();
        return true;
    }

    const discard = confirm("Discard unsaved changes?");
    if (!discard) return false;

    if (onContinue) await onContinue();
    return true;
}

// ----------------------------
// Warn on reload / close
// ----------------------------
window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = "";
});

// ----------------------------
// Title handling
// ----------------------------
function updateWindowTitle() {
    let title = "ScriptHub";
    if (window.SH?.titleState) {
        try {
            title = SH.titleState.getDisplayTitle();
        } catch {}
    }
    document.title = `${title} — ScriptHub`;
}

window.addEventListener("title-changed", updateWindowTitle);

// ----------------------------
// Storage readiness gate
// ----------------------------
window.SH = window.SH || {};

if (!window.SH.storageReady) {
    window.SH.storageReady = new Promise((resolve) => {
        if (window.SH.storage?.loadProjectText) {
            resolve();
        } else {
            window.addEventListener("storage-initialized", resolve);
        }
    });
}

// ============================================================================
// ProjectController — lifecycle authority
// ============================================================================
const ProjectController = (() => {
    let currentProject = null;

    function getCurrentProject() {
        return currentProject;
    }

    function adoptOpenProject(filename) {
        if (!filename) {
            currentProject = null;
            localStorage.removeItem("lastProject");
            console.log("[ProjectController] Cleared open project");
            return;
        }
        currentProject = filename;
        localStorage.setItem("lastProject", filename);
        console.log("[ProjectController] Adopted open project:", filename);
    }

    async function open(input) {
        if (!input) return;

        let filename, text;

        if (typeof input === "string") {
            filename = input;
            await window.SH.storageReady;
            text = await SH.storage.loadProjectText(filename);
        } else {
            filename = input.filename;
            text = input.text;
        }

        console.log("[ProjectController] Opening project:", filename);

        isProgrammaticChange = true;
        window.ui_editor.setText(text);
        isProgrammaticChange = false;

        window.ui_editor.setCursor?.(0);
        window.ui_editor.setScroll?.(0);

        SH.titleState?.setTitle(filename, { dirty: false });
        SH.titleState?.markClean();

        markClean("project opened");
        adoptOpenProject(filename);
    }

	// FileAdapter
	// -------------------------------------------------
	// Abstracts all file system access.
	// Browser version uses input elements + local APIs.
	// Electron version will proxy to main process via IPC.
	// ProjectController MUST NOT depend on platform details.

    async function save() {
        if (!currentProject) return;

        const text = window.ui_editor.getText();
        
        await FileAdapter.save(currentProject, text);

        markClean("saved");
        SH.titleState?.markClean();
        localStorage.removeItem("sessionState");

        isProgrammaticChange = false;
    }

    async function saveAs(filename) {
        if (!filename) return;

        const text = window.ui_editor.getText();
        const saved = await FileAdapter.saveAs(filename, text);
        if (!saved) return;

        adoptOpenProject(saved);
        SH.titleState?.setTitle(saved, { dirty: false });
        SH.titleState?.markClean();

        markClean("saved as");
        localStorage.removeItem("sessionState");

        isProgrammaticChange = false;
    }
    
	function newProject() {
	    console.log("[ProjectController] New project");
	
	    currentProject = null;
	    localStorage.removeItem("lastProject");
	    localStorage.removeItem("sessionState");
	
	    isProgrammaticChange = true;
	    window.ui_editor.setText("");
	    isProgrammaticChange = false;
	
	    window.ui_editor.setCursor?.(0);
	    window.ui_editor.setScroll?.(0);
	
	    SH.titleState?.setTitle("Untitled", { dirty: false });
	    SH.titleState?.markClean();
	
	    markClean("new project");
	}
    
    return { 
	    open,
	    save,
	    saveAs,
	    newProject,
	    getCurrentProject,
	    adoptOpenProject
	};

})();

window.ProjectController = ProjectController;

// ============================================================================
// App startup
// ============================================================================
window.addEventListener("DOMContentLoaded", async () => {
    console.log("%c[App] ScriptHub Editor Booting…", "color:#0b5fff;font-weight:700;");

    let startupInProgress = true;

    // ----------------------------
    // UI elements
    // ----------------------------
    const homeBtn = document.getElementById("homeButton");
    const openBtn = document.getElementById("openProject");
    const saveBtn = document.getElementById("saveProject");
    const saveAsBtn = document.getElementById("saveProjectAs");
    const newBtn = document.getElementById("newProjectButton");
    // Browser-only open mechanism.
	// In Electron, this will be replaced by native dialogs
	// triggered from main process and routed here.
    const hiddenInput = document.getElementById("fileInput");
    const filenameLabel = document.getElementById("filenameLabel");

    if (hiddenInput) hiddenInput.value = "";

	// ----------------------------
	// Buttons
	// ----------------------------
	homeBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return; // Only Open/New-like prompt
	    window.location.href = "index.html";
	});
	
	openBtn?.addEventListener("click", async () => {
		// Browser-only open mechanism.
		// In Electron, this callback will invoke a native dialog via IPC
		// instead of triggering a hidden file input.
	    await confirmDiscardIfDirty(() => {
	        hiddenInput?.click(); // Finder opens immediately
	    });
	});
	
	hiddenInput?.addEventListener("change", async (e) => {
	    if (startupInProgress) {
	        e.target.value = "";
	        return;
	    }
	
	    const file = e.target.files[0];
	    if (!file) return;
	
	    const result = await FileAdapter.open(file);
	    await ProjectController.open(result); // Open does NOT save automatically
	    e.target.value = "";
	});
	
	saveBtn?.addEventListener("click", async () => {
	    const current = ProjectController.getCurrentProject();
	
	    if (!current) {
	        const name = prompt("Save As filename:");
	        if (!name) return;
	        await ProjectController.saveAs(name);
	        return;
	    }
	
	    await ProjectController.save();
	});
	
	saveAsBtn?.addEventListener("click", async () => {
	    const name = prompt("Save As filename:");
	    if (!name) return;
	    await ProjectController.saveAs(name); // Save under new name, never clears editor
	});
	
	newBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return; // Prompt if dirty
	    ProjectController.newProject(); // Clears editor only after consent
	});
	
	
	// Keyboard shortcuts (renderer).
	// Electron will later map native menu accelerators
	// to these same ProjectController actions.
	// ----------------------------
	// Keyboard shortcuts
	// ----------------------------
	document.addEventListener("keydown", async (e) => {
	    const isCmd = e.metaKey || e.ctrlKey;
	    if (!isCmd) return;
	
	    const key = e.key.toLowerCase();
	
	    // Open
	    if (key === "o" && !e.shiftKey) {
	        e.preventDefault();
	        if (!await confirmDiscardIfDirty()) return;
	        hiddenInput?.click();
	    }
	
	    // Save
		if (key === "s" && !e.shiftKey) {
		    e.preventDefault();
		
		    const current = ProjectController.getCurrentProject();
		    if (!current) {
		        const name = prompt("Save As filename:");
		        if (!name) return;
		        await ProjectController.saveAs(name);
		        return;
		    }
		
		    await ProjectController.save();
		}
	
	    // Save As
	    if (key === "s" && e.shiftKey) {
	        e.preventDefault();
	        const name = prompt("Save As filename:");
	        if (!name) return;
	        await ProjectController.saveAs(name); // Always saves, never clears
	    }
	
	    // New
	    if (key === "n" && !e.shiftKey) {
	        e.preventDefault();
	        if (!await confirmDiscardIfDirty()) return;
	        ProjectController.newProject(); // Clears editor only after consent
	    }
	});

    // ----------------------------
    // Editor init
    // ----------------------------
    await window.ui_editor.init();

    // ----------------------------
    // Startup decision
    // ----------------------------
    (async () => {
        const session = JSON.parse(localStorage.getItem("sessionState") || "null");

        if (session?.dirty && session.text != null) {
            isProgrammaticChange = true;
            window.ui_editor.setText(session.text);
            isProgrammaticChange = false;

            window.ui_editor.setCursor?.(session.cursor ?? 0);
            window.ui_editor.setScroll?.(session.scroll ?? 0);

            if (session.filename) {
                ProjectController.adoptOpenProject(session.filename);
                SH.titleState?.setTitle(session.filename, { dirty: true });
            } else {
                SH.titleState?.setTitle("Untitled", { dirty: true });
            }

            markDirty("session restore");
            return;
        }

        ProjectController.newProject();
        
    })().finally(() => {
        startupInProgress = false;
        console.log("[Startup] Startup phase complete");
    });

    // ----------------------------
    // Track editor changes
    // ----------------------------
    window.ui_editor.onChange(() => {
        if (isProgrammaticChange) return;

        markDirty("editor change");
        SH.titleState?.markDirty();

        localStorage.setItem("sessionState", JSON.stringify({
            filename: ProjectController.getCurrentProject(),
            text: window.ui_editor.getText(),
            cursor: window.ui_editor.getCursor?.(),
            scroll: window.ui_editor.getScroll?.(),
            dirty: true
        }));
    });

    // ----------------------------
    // Filename label updates
    // ----------------------------
    window.addEventListener("title-changed", (e) => {
        if (filenameLabel) filenameLabel.textContent = e.detail.displayTitle;
    });

    // ----------------------------
    // Remaining UI modules
    // ----------------------------
    window.ui_toolbar?.init?.();
    window.ui_tabs?.init?.();
    window.ui_navigation?.init?.();
    window.ui_search?.init?.();
    window.ui_titlePage?.init?.();
    window.ui_resize?.init?.();

    console.log("%c[App] All modules initialized.", "color:#0b5fff;font-weight:700;");
});
