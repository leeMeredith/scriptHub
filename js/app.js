// js/app.js
// Main startup logic for ScriptHub Editor

let currentProject = null;

let isDirty = false;
window._debug_isDirty = () => isDirty;


window.addEventListener("DOMContentLoaded", async () => {

    console.log("%c[App] ScriptHub Editor Booting…", "color:#0b5fff; font-weight:700;");

    // ----------------------------
    // Topbar Buttons
    // ----------------------------
    const homeBtn = document.getElementById("homeButton");
    const saveBtn = document.getElementById("saveProject");
    const openBtn = document.getElementById("openProject");
    const hiddenInput = document.getElementById("fileInput");
    const filenameLabel = document.getElementById("filenameLabel");

    // HOME
    homeBtn?.addEventListener("click", () => window.location.href = "index.html");

    // OPEN
    openBtn?.addEventListener("click", () => hiddenInput?.click());

	hiddenInput?.addEventListener("change", async (ev) => {
	    const file = ev.target.files[0];
	    if (!file) return;
	
		// Inside your hiddenInput change listener, after setting text
		try {
		    const result = await FileAdapter.open(file);
		
		    currentProject = result.filename;
		    filenameLabel.textContent = result.filename;
		
		    // Restore editor text
		    window.ui_editor?.setText?.(result.text);
		    isDirty = false;

		
		    // --- RESTORE STATE ---
		    // Check if we have saved state for this file
		    const savedStateKey = `editorState_${currentProject}`;
		    const savedState = JSON.parse(localStorage.getItem(savedStateKey) || "{}");
		
		    // Restore cursor
		    if (savedState.cursor != null && window.ui_editor.setCursor) {
		        window.ui_editor.setCursor(savedState.cursor);
		    }
		
		    // Restore scroll
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
	    if (!currentProject) {
	        alert("No project open. Use Open or Save As.");
	        return;
	    }
	
	    const text = window.ui_editor?.getText?.() ?? "";
	
	    try {
	        await FileAdapter.save(currentProject, text);
	        isDirty = false;	        
	        console.log("[App] Saved", currentProject);
	    } catch (err) {
	        console.error("[App] Save error", err);
	        alert("Save failed. Check console.");
	    }
	});
	
	// SAVE AS
	const saveAsBtn = document.getElementById("saveProjectAs");
	
	saveAsBtn?.addEventListener("click", async () => {
	    let filename = prompt("Save As filename:");
	    if (!filename) return;
	
	    const text = window.ui_editor?.getText?.() ?? "";
	
	    try {
	        const savedFilename = await FileAdapter.saveAs(filename, text);
	        if (!savedFilename) return; // user cancelled
	
	        currentProject = savedFilename;
	        isDirty = false;
	        const filenameLabel = document.getElementById("filenameLabel");
	        if (filenameLabel) filenameLabel.textContent = currentProject;
	
	        localStorage.setItem("lastProject", currentProject);
	
	        console.log("[App] Saved As", currentProject);
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

    // Initialize editor first
    await window.ui_editor.init();
    
	    
	// ----------------------------
	// Track editor state (cursor + scroll) for restoration
	// ----------------------------
	if (window.ui_editor?.onChange) {
	    window.ui_editor.onChange(() => {
		    console.log("[Debug] onChange fired");
	        if (!currentProject) return;
	
	        // Set dirty flag
	        isDirty = true;
	
	        // Save editor state (cursor + scroll)
	        const state = {
	            cursor: window.ui_editor.getCursor?.(),
	            scroll: window.ui_editor.getScroll?.()
	        };
	
	        const key = `editorState_${currentProject}`;
	        localStorage.setItem(key, JSON.stringify(state));
	    });
	}


    // Initialize remaining modules in order
    window.ui_toolbar?.init?.();
    window.ui_tabs?.init?.();
    window.ui_navigation?.init?.();
    window.ui_search?.init?.();
    window.ui_titlePage?.init?.();
    window.ui_resize?.init?.();

    console.log("%c[App] All modules initialized.", "color:#0b5fff; font-weight:700;");
});
