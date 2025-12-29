// js/app.js
// Main startup logic for ScriptHub Editor

let isProgrammaticChange = false;

window._debug_isDirty = () => unsavedChangesController.isDirty;


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
    const openBtn = document.getElementById("openFile");
    const saveBtn = document.getElementById("saveFile");
    const saveAsBtn = document.getElementById("saveFileAs");
    const newBtn = document.getElementById("newFileButton");
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
	    if (!await unsavedChangesController.confirmDiscardIfDirty()) return;
	    window.location.href = "index.html";
	});

	
	openBtn?.addEventListener("click", async () => {
		// Browser-only open mechanism.
		// In Electron, this callback will invoke a native dialog via IPC
		// instead of triggering a hidden file input.
	    await unsavedChangesController.confirmDiscardIfDirty(() => {
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
	    await fileController.open(result); // Open does NOT save automatically
	    e.target.value = "";
	});
	
	saveBtn?.addEventListener("click", async () => {
	    const current = fileController.getCurrentFile();
	
	    if (!current) {
	        const name = prompt("Save As filename:");
	        if (!name) return;
	        await fileController.saveAs(name);
	        return;
	    }
	
	    await fileController.save();
	});
	
	saveAsBtn?.addEventListener("click", async () => {
	    const name = prompt("Save As filename:");
	    if (!name) return;
	    await fileController.saveAs(name); // Save under new name, never clears editor
	});
	
	newBtn?.addEventListener("click", async () => {
	    if (!await unsavedChangesController.confirmDiscardIfDirty()) return; // Prompt if dirty
	    fileController.newFile(); // Clears editor only after consent
	});
	
	
	// Keyboard shortcuts (renderer).
	// Electron will later map native menu accelerators
	// to these same fileController actions.
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
	        if (!await unsavedChangesController.confirmDiscardIfDirty()) return;
	        hiddenInput?.click();
	    }
	
	    // Save
		if (key === "s" && !e.shiftKey) {
		    e.preventDefault();
		
		    const current = fileController.getCurrentFile();
		    if (!current) {
		        const name = prompt("Save As filename:");
		        if (!name) return;
		        await fileController.saveAs(name);
		        return;
		    }
		
		    await fileController.save();
		}
	
	    // Save As
	    if (key === "s" && e.shiftKey) {
	        e.preventDefault();
	        const name = prompt("Save As filename:");
	        if (!name) return;
	        await fileController.saveAs(name); // Always saves, never clears
	    }
	
	    // New
	    if (key === "n" && !e.shiftKey) {
	        e.preventDefault();
	        if (!await unsavedChangesController.confirmDiscardIfDirty()) return;
	        fileController.newFile(); // Clears editor only after consent
	    }
	});

	// Initialize CorePreview first
	CorePreview.init({ previewId: "preview" });
	
	// Then initialize editor
	await ui_editor.init({ previewId: "preview" });

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
                fileController.adoptOpenFile(session.filename);
                SH.titleState?.setTitle(session.filename, { dirty: true });
            } else {
                SH.titleState?.setTitle("Untitled", { dirty: true });
            }

            unsavedChangesController.markDirty("session restore");
            return;
        }

        fileController.newFile();
        
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
            filename: fileController.getCurrentFile(),
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
