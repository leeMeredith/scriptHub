// js/app.js
// Main startup logic for ScriptHub Editor


window.isProgrammaticChange = false;

window._debug_isDirty = () => unsavedChangesController.isDirty;

// ----------------------------
// Confirm discard if dirty
// SaveState-aware authority gate
// ----------------------------
async function confirmDiscardIfDirty() {
    const saveState = window.fileController.getCurrentSaveState();

    if (!unsavedChangesController.isDirty()) {
        return true;
    }

    // EPHEMERAL or IDENTIFIED files with unsaved changes must confirm
    if (
        saveState === window.fileController.SaveState.EPHEMERAL ||
        saveState === window.fileController.SaveState.IDENTIFIED
    ) {
        return confirm("You have unsaved changes. Discard them?");
    }

    return true;
}

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
        if (window.SH.storage?.loadFileText) {
            resolve();
        } else {
            window.addEventListener("storage-initialized", resolve);
        }
    });
}

async function logCurrentProjectFiles() {
  if (!projectController.hasOpenProject()) return;

  const files = await projectController.listProjectFiles();
  console.log("[Project Files]", files);
}

// ----------------------------
// First save flow helper
// Ensures project exists and resolves filename
// ----------------------------
async function handleFirstSave() {
    const projectRoot = projectController.ensureProjectExists();
    if (!projectRoot) return false;

    return await handleSaveAs();
}

// ----------------------------
// Save As flow helper
// Resolves project path when applicable
// ----------------------------
async function handleSaveAs() {
    const name = prompt("Save As filename:");
    if (!name) return false;

    // Ensure project exists (delegated correctly)
    if (!projectController.hasOpenProject()) {
        const projectId = projectController.ensureProjectExists();
        if (!projectId) return false;
    }

    // Create file within current project
    await window.fileController.saveAs(name);

    // Refresh project file list
    await logCurrentProjectFiles();

    return true;
}

// ============================================================================
// App startup
// ============================================================================
window.addEventListener("DOMContentLoaded", async () => {
    console.log("%c[App] ScriptHub Editor Booting…", "color:#0b5fff;font-weight:700;");

    let startupInProgress = true;

    // ----------------------------
    // UI elements
    // ----------------------------
    const quitBtn = document.getElementById("quitButton");
    const openBtn = document.getElementById("openFile");
    const saveBtn = document.getElementById("saveFile");
    const saveAsBtn = document.getElementById("saveFileAs");
    const newBtn = document.getElementById("newFileButton");
    
    const newProjectBtn = document.getElementById("newProject");
	const openProjectBtn = document.getElementById("openProject");

    
    // Browser-only open mechanism.
	// In Electron, this will be replaced by native dialogs
	// triggered from main process and routed here.
    const hiddenInput = document.getElementById("fileInput");
    const filenameLabel = document.getElementById("filenameLabel");

    if (hiddenInput) hiddenInput.value = "";

	// ----------------------------
	// Buttons
	// ----------------------------
	quitBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return;
	    window.location.href = "index.html";
	});
	
	
	newProjectBtn?.addEventListener("click", async () => {
	    const name = prompt("New project name:");
	    if (!name) return;
	
	    // For now, projects live under the server’s root
	    const rootPath = `projects/${name}`;
	
	    // Establish project identity
	    projectController.createProject(rootPath);
	
	    // Start with a new file inside the project
	    window.fileController.newFile();
	    
	    // Project established — list initial project files
	    await logCurrentProjectFiles();
	
	    console.log("[App] Created project:", rootPath);
	});

	openProjectBtn?.addEventListener("click", async () => {
	    const name = prompt("Open project name:");
	    if (!name) return;
	
	    const rootPath = `projects/${name}`;
	
	    projectController.openProject(rootPath);
	
	    // Clear editor state; user will open a file next
	    window.fileController.newFile();
	    
	    // Project opened — enumerate existing project files
	    await logCurrentProjectFiles();
	
	    console.log("[App] Opened project:", rootPath);
	});

	
	
	openBtn?.addEventListener("click", async () => {
		// Browser-only open mechanism.
		// In Electron, this callback will invoke a native dialog via IPC
		// instead of triggering a hidden file input.
	    if (!await confirmDiscardIfDirty()) return;
	    hiddenInput?.click();
	});
	
	hiddenInput?.addEventListener("change", async (e) => {
	    if (startupInProgress) {
	        e.target.value = "";
	        return;
	    }
	
	    const file = e.target.files[0];
	    if (!file) return;
	
		await window.fileController.openFileFromBrowser(file);
	    e.target.value = "";
	});
	
	// ----------------------------
	// Save button
	// SaveState governs first-save vs overwrite
	// ----------------------------
	saveBtn?.addEventListener("click", async () => {
	    const currentFile = window.fileController.getCurrentFile();
	    const saveState = window.fileController.getCurrentSaveState();
	
	    // EPHEMERAL or unidentified files must go through Save As
	    if (!currentFile || saveState === window.fileController.SaveState.EPHEMERAL) {
	        await handleFirstSave();
	        return;
	    }
	
	    await window.fileController.save();
	});
	
	saveAsBtn?.addEventListener("click", async () => {
	    await handleSaveAs();
	});
	
	
	//new file
	newBtn?.addEventListener("click", async () => {
	    if (!await confirmDiscardIfDirty()) return;
	    
	    window.fileController.newFile();
	    
	    if (!projectController.hasOpenProject()) {
    	    console.log("[New] No project open — file will require project on save");
    	}
    	
	});

	// Keyboard shortcuts (renderer).
	// Electron will later map native menu accelerators
	// to these same window.fileController actions.
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
		// SaveState governs first-save vs overwrite
		if (key === "s" && !e.shiftKey) {
		    e.preventDefault();
		
		    const currentFile = window.fileController.getCurrentFile();
		    const saveState = window.fileController.getCurrentSaveState();
		
		    // EPHEMERAL or unidentified files must go through Save As
		    if (!currentFile || saveState === window.fileController.SaveState.EPHEMERAL) {
		        await handleFirstSave();
		        return;
		    }
		
		    await window.fileController.save();
		}
	
	    // Save As
		if (key === "s" && e.shiftKey) {
		    e.preventDefault();
		    await handleSaveAs();
		}

	    // New file
		if (key === "n" && !e.shiftKey) {
		    e.preventDefault();
		    if (!await confirmDiscardIfDirty()) return;
		
		    // New always means new FILE
		    window.fileController.newFile();
		
		    // Optional clarity (non-blocking)
		    if (!projectController.hasOpenProject()) {
		        console.log("[New] No project open — file will require project on save");
		    }
		}
	});

	// Initialize CorePreview first
	CorePreview.init({ previewId: "preview" });
	
	// Then initialize editor
	await ui_editor.init({ previewId: "preview" });


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
	            
	            // IMPORTANT ARCHITECTURE NOTE
				// adoptOpenFile() MUST remain a non-creating operation.
				// It may associate the editor with an existing file identity,
				// but it must NEVER:
				// - create a ProjectIndex entry
				// - create a file implicitly
				// - persist metadata
				//
				// Reason:
				// Startup/session restore is a recovery path, not a creation path.
				// File identity is ONLY allowed to be created via explicit Save As.
				// Violating this will reintroduce silent EPHEMERAL → IDENTIFIED leaks.
                window.fileController.adoptOpenFile(session.filename);
                
                SH.titleState?.setTitle(session.filename, { dirty: true });
            } else {
                SH.titleState?.setTitle("Untitled", { dirty: true });
            }

            unsavedChangesController.markDirty("session restore");
            return;
        }

        window.fileController.newFile();
        
    })().finally(() => {
        startupInProgress = false;
        console.log("[Startup] Startup phase complete");
    });

    // ----------------------------
    // Track editor changes
    // ----------------------------
    window.ui_editor.onChange(() => {
        if (isProgrammaticChange) return;

        unsavedChangesController.markDirty("editor change");
        SH.titleState?.markDirty();

        localStorage.setItem("sessionState", JSON.stringify({
            filename: window.fileController.getCurrentFile(),
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
