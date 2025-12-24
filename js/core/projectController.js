// js/core/projectController.js
// -----------------------------------------------------------------------------
// projectController
// Core project lifecycle authority.
// Platform-agnostic: no dialogs, no UI, no environment-specific APIs.
// File access is delegated to FileAdapter.
// Safe to reuse in Electron (renderer) without modification.
// -----------------------------------------------------------------------------

const projectController = (() => {
    let currentProject = null;

    // ----------------------------
    // Accessors
    // ----------------------------
    function getCurrentProject() {
        return currentProject;
    }

    function adoptOpenProject(filename) {
        if (!filename) {
            currentProject = null;
            localStorage.removeItem("lastProject");
            console.log("[projectController] Cleared open project");
            return;
        }
        currentProject = filename;
        localStorage.setItem("lastProject", filename);
        console.log("[projectController] Adopted open project:", filename);
    }

    // ----------------------------
    // Open a project
    // ----------------------------
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

        console.log("[projectController] Opening project:", filename);

        // Prevent marking as dirty while programmatically setting text
        window.isProgrammaticChange = true;
        window.ui_editor.setText(text);
        window.isProgrammaticChange = false;

        window.ui_editor.setCursor?.(0);
        window.ui_editor.setScroll?.(0);

        SH.titleState?.setTitle(filename, { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("project opened");
        adoptOpenProject(filename);
    }

    // ----------------------------
    // Save / Save As
    // ----------------------------
    async function save() {
        if (!currentProject) return;

        const text = window.ui_editor.getText();
        await FileAdapter.save(currentProject, text);

        unsavedChangesController.markClean("saved");
        SH.titleState?.markClean();
        localStorage.removeItem("sessionState");

        window.isProgrammaticChange = false;
    }

    async function saveAs(filename) {
        if (!filename) return;

        const text = window.ui_editor.getText();
        const saved = await FileAdapter.saveAs(filename, text);
        if (!saved) return;

        adoptOpenProject(saved);
        SH.titleState?.setTitle(saved, { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("saved as");
        localStorage.removeItem("sessionState");

        window.isProgrammaticChange = false;
    }

    // ----------------------------
    // Create a new project
    // ----------------------------
    function newProject() {
        console.log("[projectController] New project");

        currentProject = null;
        localStorage.removeItem("lastProject");
        localStorage.removeItem("sessionState");

        window.isProgrammaticChange = true;
        window.ui_editor.setText("");
        window.isProgrammaticChange = false;

        window.ui_editor.setCursor?.(0);
        window.ui_editor.setScroll?.(0);

        SH.titleState?.setTitle("Untitled", { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("new project");
    }

    // ----------------------------
    // Public API
    // ----------------------------
    return {
        open,
        save,
        saveAs,
        newProject,
        getCurrentProject,
        adoptOpenProject
    };

})();

window.projectController = projectController;
