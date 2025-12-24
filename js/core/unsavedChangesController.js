// js/core/unsavedChangesController.js
// -----------------------------------------------------------------------------
// UnsavedChangesController
// Handles confirm / dirty flow before destructive actions.
// Platform-agnostic: no editor knowledge, no UI chrome beyond confirm/prompt.
// -----------------------------------------------------------------------------
const unsavedChangesController = (() => {
    let isDirty = false;

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
            const currentProject = projectController.getCurrentProject();
            if (!currentProject) {
                const filename = prompt("Enter filename to save:");
                if (!filename) return false;
                await projectController.saveAs(filename);
            } else {
                await projectController.save();
            }

            if (onContinue) await onContinue();
            return true;
        }

        const discard = confirm("Discard unsaved changes?");
        if (!discard) return false;

        if (onContinue) await onContinue();
        return true;
    }

    // Warn on reload / close
    window.addEventListener("beforeunload", (e) => {
        if (!isDirty) return;
        e.preventDefault();
        e.returnValue = "";
    });

    return { isDirty, markDirty, markClean, confirmDiscardIfDirty };
})();

window.unsavedChangesController = unsavedChangesController;