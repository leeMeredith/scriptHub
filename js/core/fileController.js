// js/core/fileController.js
// -----------------------------------------------------------------------------
// fileController
// Core file lifecycle authority.
// Platform-agnostic: no dialogs, no UI, no environment-specific APIs.
// File access is delegated to FileAdapter.
// Safe to reuse in Electron (renderer) without modification.
// -----------------------------------------------------------------------------

const fileController = (() => {
    let currentFile = null;

    // ----------------------------
    // Accessors
    // ----------------------------
    function getCurrentFile() {
        return currentFile;
    }

    function adoptOpenFile(filename) {
        if (!filename) {
            currentFile = null;
            localStorage.removeItem("lastFile");
            console.log("[fileController] Cleared open file");
            return;
        }
        currentFile = filename;
        localStorage.setItem("lastFile", filename);
        console.log("[fileController] Adopted open file:", filename);
    }

    // ----------------------------
    // Open a file
    // ----------------------------
    async function open(input) {
        if (!input) return;

        let filename, text;

        if (typeof input === "string") {
            filename = input;
            await window.SH.storageReady;
            text = await SH.storage.loadFileText(filename);
        } else {
            filename = input.filename;
            text = input.text;
        }

        console.log("[fileController] Opening file:", filename);

        // Prevent marking as dirty while programmatically setting text
        window.isProgrammaticChange = true;
        window.ui_editor.setText(text);
        window.isProgrammaticChange = false;

        window.ui_editor.setCursor?.(0);
        window.ui_editor.setScroll?.(0);

        SH.titleState?.setTitle(filename, { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("file opened");
        adoptOpenFile(filename);
    }

    // ----------------------------
    // Save / Save As
    // ----------------------------
    async function save() {
        if (!currentFile) return;

        const text = window.ui_editor.getText();
        await FileAdapter.save(currentFile, text);

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

        adoptOpenFile(saved);
        SH.titleState?.setTitle(saved, { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("saved as");
        localStorage.removeItem("sessionState");

        window.isProgrammaticChange = false;
    }

    // ----------------------------
    // Create a new file
    // ----------------------------
    function newFile() {
        console.log("[fileController] New file");

        currentFile = null;
        localStorage.removeItem("lastFile");
        localStorage.removeItem("sessionState");

        window.isProgrammaticChange = true;
        window.ui_editor.setText("");
        window.isProgrammaticChange = false;

        window.ui_editor.setCursor?.(0);
        window.ui_editor.setScroll?.(0);

        SH.titleState?.setTitle("Untitled", { dirty: false });
        SH.titleState?.markClean();

        unsavedChangesController.markClean("new File");
    }
    
    //==============================
	//History Bridge (Writer ↔ Git)
	//==============================


    // ----------------------------
    // Public API
    // ----------------------------
    return {
        open,
        save,
        saveAs,
        newFile,
        getCurrentFile,
        adoptOpenFile
    };

})();

window.fileController = fileController;
