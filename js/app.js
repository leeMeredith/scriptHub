// js/app.js
// Main startup logic for ScriptHub Editor

let currentProject = null;
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

            currentProject = result.filename;

            // Set editor text
            window.ui_editor?.setText?.(result.text);

            // Update title state
            if (window.SH?.titleState) {
                SH.titleState.setTitle(result.filename, { dirty: false });
                SH.titleState.markClean();
            }

            // App-level dirty flag
            markClean("open");

            // Restore saved editor state
            const savedStateKey = `editorState_${currentProject}`;
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

    async function openProject(filename) {
        if (!filename) return;

        try {
            const text = await SH.storage.loadProjectText(filename);

            replaceDocumentText(text);
            setCursorPosition(0);
            setScrollPosition(0);

            if (window.SH?.titleState) {
                SH.titleState.setTitle(filename, { dirty: false });
                SH.titleState.markClean();
            }

            markClean("Project opened");

            console.log(`[App] Opened project: ${filename}`);
        } catch (err) {
            console.error("[App] Failed to open project:", err);
            alert("Failed to open project. See console.");
        }
    }

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

            markClean("save");
            if (window.SH?.titleState) SH.titleState.markClean();

            console.log("[App] Saved", currentProject);
        } catch (err) {
            console.error("[App] Save error", err);
            alert("Save failed. Check console.");
        }
    });

    // SAVE AS
    saveAsBtn?.addEventListener("click", async () => {
        let filename = prompt("Save As filename:");
        if (!filename) return;

        const text = window.ui_editor?.getText?.() ?? "";

        try {
            const savedFilename = await FileAdapter.saveAs(filename, text);
            if (!savedFilename) return; // user cancelled

            currentProject = savedFilename;
            filenameLabel.textContent = currentProject;

            markClean("save");
            if (window.SH?.titleState) SH.titleState.markClean();

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

    await window.ui_editor.init();
    
	window.ui_editor.setDirtyCallback = markDirty;


    // ----------------------------
    // Track editor state (cursor + scroll) for restoration
    // ----------------------------
	window.ui_editor.onChange(() => {
	    if (!currentProject) return;
	
	    markDirty("editor change");
	    if (window.SH?.titleState) SH.titleState.markDirty();
	
	    const state = {
	        cursor: window.ui_editor.getCursor?.(),
	        scroll: window.ui_editor.getScroll?.()
	    };
	
	    localStorage.setItem(
	        `editorState_${currentProject}`,
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
