// js/app.js
// Main startup logic for ScriptHub Editor

let currentProject = null;

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

    hiddenInput?.addEventListener("change", (ev) => {
        const file = ev.target.files[0];
        if (!file) return;

        // update filename display
		currentProject = file.name;
		filenameLabel.textContent = file.name;


        // load file content into editor
        const reader = new FileReader();
        reader.onload = () => window.ui_editor?.setText?.(reader.result);
        reader.readAsText(file);
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
	        const res = await fetch("/save", {
	            method: "POST",
	            headers: { "Content-Type": "application/json" },
	            body: JSON.stringify({
	                filename: currentProject,
	                text
	            })
	        });
	
	        if (!res.ok) throw new Error("Save failed");
	
	        console.log("[App] Saved", currentProject);
	    } catch (err) {
	        console.error("[App] Save error", err);
	        alert("Save failed. Check console.");
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

    // Initialize remaining modules in order
    window.ui_toolbar?.init?.();
    window.ui_tabs?.init?.();
    window.ui_navigation?.init?.();
    window.ui_search?.init?.();
    window.ui_titlePage?.init?.();
    window.ui_resize?.init?.();

    console.log("%c[App] All modules initialized.", "color:#0b5fff; font-weight:700;");
});
