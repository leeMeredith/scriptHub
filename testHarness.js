// ---------------------------
// Test harness for ScriptHub
// ---------------------------

console.log("[TestHarness] Loaded");

// Ensure all required modules exist
if (!window.SH?.storage || !window.SH?.ProjectIndex || !window.fileController) {
    console.error("[TestHarness] Required modules are missing");
} else {
    console.log("[TestHarness] All modules present");
}

// ---------------------------
// UI Elements
// ---------------------------
const projectSelectEl = document.getElementById("project-select");
const fileListEl = document.getElementById("file-list");
const editorEl = document.getElementById("editor");
const titleEl = document.getElementById("doc-title");

const btnNewProject = document.getElementById("new-project-btn");
const btnNewFile = document.getElementById("new-file-btn");
const btnSave = document.getElementById("save-btn");
const btnSaveAs = document.getElementById("saveas-btn");

// ---------------------------
// Helpers
// ---------------------------
function renderProjects() {
    projectSelectEl.innerHTML = "";
    const projects = window.projectController.listProjects();
    projects.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        projectSelectEl.appendChild(opt);
    });
}

function handleFileClick(file) {
    return async () => {
        await window.fileController.open(file.id);
        editorEl.value = window.ui_editor.getText();
        titleEl.textContent = file.name;
        updateEditorEnabledState();
    };
}

function renderFiles() {
    fileListEl.innerHTML = ""; // clear old list
    const project = window.projectController.getCurrentProject();
    if (!project) return;

    const files = window.projectController.listProjectFiles();
    files.forEach(f => {
        const div = document.createElement("div");
        div.textContent = f.name;
        div.onclick = handleFileClick(f);
        fileListEl.appendChild(div);
    });
}

function updateEditor() {
    if (!editorEl || !window.ui_editor) return;

    // Clear any existing listeners
    editorEl.oninput = null;

	editorEl.oninput = () => {
	    const currentFileId = window.fileController.getCurrentFile();
	    const saveState = window.fileController.getCurrentSaveState?.();
	
	    // Only allow typing / marking dirty if file is IDENTIFIED
	    if (currentFileId && saveState === window.fileController.SaveState.IDENTIFIED) {
	        window.ui_editor.setText(editorEl.value, { source: "editor" });
	
	        const event = new CustomEvent("text-changed", { detail: { options: { source: "editor" } } });
	        window.dispatchEvent(event);
	
	        window.unsavedChangesController.markDirty(currentFileId, "typing");
	    }
	};

}


function updateEditorEnabledState() {
    if (!window.fileController || !window.ui_editor) return;

    const saveState = window.fileController.getCurrentSaveState?.();
    const enabled =
        saveState === window.fileController.SaveState.IDENTIFIED;

    window.ui_editor.setEnabled(enabled);
}


// ---------------------------
// Event handlers
// ---------------------------
btnNewProject.onclick = () => {
    const name = prompt("New project name:");
    if (!name) return;

    const project = window.projectController.createProject(name);

    // Persist project to storage
    window.SH.storage.saveProject(project);

    renderProjects();
    projectSelectEl.value = project.id;
    renderFiles();
    updateEditorEnabledState();
};

btnNewFile.onclick = async () => {
    const project = window.projectController.getCurrentProject();
    if (!project) {
        alert("Please create or select a project before creating a file.");
        return;
    }

    const name = prompt("Enter file name:");
    if (!name) return;

    // Privileged creation via fileController / ProjectIndex
    const newFileId = window.SH.ProjectIndex.createFilePrivileged(name);
    if (!newFileId) {
        alert("Failed to create file.");
        return;
    }

    // Persist empty file content
    await window.SH.storage.saveFileText(newFileId, "");

    // Open the file
    await window.fileController.open(newFileId);

    renderFiles();
    editorEl.value = window.ui_editor.getText();
    titleEl.textContent = name;

    updateEditorEnabledState();
};

console.log("[InitPatch] Explicit project → file → editor flow in place");

btnSave.onclick = async () => {
    const saveState = window.fileController.getCurrentSaveState?.();
    if (saveState !== window.fileController.SaveState.IDENTIFIED) {
        alert("Please create or open a file first.");
        return;
    }

    // Save via fileController
    await window.fileController.save();

    // Persist the latest content to storage
    const currentFileId = window.fileController.getCurrentFile();
    const currentProject = window.projectController.getCurrentProject();
    if (currentFileId && currentProject) {
        const text = window.ui_editor.getText();
        await window.SH.storage.saveFileContent(currentFileId, currentProject.id, text);
    }

    alert("File saved!");
    updateEditorEnabledState();
};

btnSaveAs.onclick = async () => {
    const saveState = window.fileController.getCurrentSaveState?.();
    if (saveState !== window.fileController.SaveState.IDENTIFIED) {
        alert("Please create or open a file first.");
        return;
    }

    const name = prompt("Save As file name:");
    if (!name) return; // user cancelled

    await window.fileController.saveAs(name);

    // Refresh file list & update editor/title
    renderFiles();
    editorEl.value = window.ui_editor.getText();
    titleEl.textContent = name;

    updateEditorEnabledState();
};

// ---------------------------
// Project selection
// ---------------------------
// ---------------------------
// Project selection (fixed)
// ---------------------------
// ---------------------------
// Project select change handler
// ---------------------------
projectSelectEl.onchange = async () => {
    const projectId = projectSelectEl.value;
    if (!projectId) return;

    // Open the selected project
    const opened = window.projectController.openProject(projectId);
    if (!opened) {
        alert("[ProjectSelect] Failed to open project");
        return;
    }

    renderFiles();

    // Editor stays disabled until user opens or creates a file
    updateEditorEnabledState();

    const files = window.projectController.listProjectFiles();
    if (files?.length) {
        // Open the most recently opened file if known
        const lastOpenedFileId = window.fileController.getLastOpenedFile?.();
        const fileToOpen = files.find(f => f.id === lastOpenedFileId) || files[0];

        if (fileToOpen?.id) {
            await window.fileController.open(fileToOpen.id);
            editorEl.value = window.ui_editor.getText();
            titleEl.textContent = fileToOpen.name;
        }
    }
};

// ---------------------------
// Initial setup
// ---------------------------
window.addEventListener("storage-initialized", async () => {
    renderProjects();

    // Render files for the current project if any
    const currentProject = window.projectController.getCurrentProject();
    if (currentProject) {
        renderFiles();
    }

    // Check if a file was previously open
    if (window.fileController?.getCurrentFile()) {
        editorEl.value = window.ui_editor.getText();
    }

    // Editor state is controlled by updateEditorEnabledState()
    updateEditorEnabledState();
});


	document.addEventListener("DOMContentLoaded", async () => {
    // Initialize editor
    if (window.ui_editor?.init) {
        window.ui_editor.init();
    } else {
        console.error("[Init] ui_editor.init not available");
        return;
    }

    // ---------------------------
    // Render Projects in Select
    // ---------------------------
    const storedProjects = window.projectController.listProjects(); // in-memory / storage
    if (storedProjects?.length) {
        window.projectController.setProjects?.(storedProjects); // optional hook if exists
        renderProjects();
    }

    // ---------------------------
    // Ensure current project exists
    // ---------------------------
    let currentProject = window.projectController.getCurrentProject();
    if (!currentProject) {
        // Editor stays disabled until project exists
        updateEditorEnabledState();
        console.log("[Init] No project selected yet — waiting for user action");
        return;
    }

    renderFiles();

    // ---------------------------
    // Open last opened file if available
    // ---------------------------
    const lastFileId = window.fileController.getLastOpenedFile?.();
    if (lastFileId) {
        const fileOpened = await window.fileController.open(lastFileId);
        if (fileOpened) {
            editorEl.value = window.ui_editor.getText();
            titleEl.textContent = window.fileController.getCurrentFileName();
        }
    }

    // Editor enable state depends on having an identified file open
    updateEditorEnabledState();

    console.log("[Init] DOMContentLoaded: Project/File flow fixed and ready");
});




// ---------------------------
// Before-unload protection
// ---------------------------
// Warn only if an IDENTIFIED file has unsaved changes.
// Never blocks programmatic reloads or restores.
// ---------------------------

window.addEventListener("beforeunload", (e) => {
  if (!window.fileController || !window.unsavedChangesController) return;

  const saveState = window.fileController.getCurrentSaveState?.();
  const isDirty = window.unsavedChangesController.isDirty?.();

  // Only warn for real, identified files
  if (saveState !== window.fileController.SaveState.IDENTIFIED) return;
  if (!isDirty) return;

  e.preventDefault();

  // Required for modern browsers
  e.returnValue = "";
});

// ---------------------------
// Autosave Snapshots 
// ---------------------------
// autosaveSnapshots.js (or inline in testHarness for now)
(function () {
  const DEBOUNCE_MS = 1000; // wait 1 second after last change
  let timer = null;
  let lastDirtyState = null;

  function scheduleAutosave() {
    const fileId = window.fileController.getCurrentFile();
    if (!fileId) return;

    const isDirty = window.unsavedChangesController.isFileDirty(fileId);

    // Log dirty/clean transitions
    if (isDirty !== lastDirtyState) {
      console.log(`[DirtyState] File ${fileId} is now ${isDirty ? "dirty" : "clean"}`);
      lastDirtyState = isDirty;
    }

    // Only schedule autosave if dirty
    if (isDirty) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {   // <-- make the callback async
        const saveState = window.fileController.getCurrentSaveState();

        // Only save if file is IDENTIFIED and still dirty
        if (
          saveState === window.fileController.SaveState.IDENTIFIED &&
          window.unsavedChangesController.isFileDirty(fileId)
        ) {
          const text = window.ui_editor.getText();
          const projectId = window.projectController.getCurrentProject()?.id;
          if (projectId) {
            await window.SH.storage.saveFileContent(fileId, projectId, text);
            console.log("[Autosave] Snapshot saved for", fileId);
            lastDirtyState = false; // mark as clean after snapshot
          } else {
            console.log(`[Autosave] Skipped: No current project for file ${fileId}`);
          }
        }
      }, DEBOUNCE_MS);
    }
  }

  // Hook editor input event to schedule autosave
  window.addEventListener("text-changed", scheduleAutosave);

  console.log("[AutosaveSnapshots] Ready with dirty/clean logging");
})();



console.log("[TestHarness] Ready");
