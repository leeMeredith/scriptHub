/* ---------------------------
   Test harness for ScriptHub
--------------------------- */

console.log("[TestHarness] Loaded");

// Ensure all required modules exist
if (!window.SH?.storage || !window.SH?.ProjectIndex || !window.fileController) {
    console.error("[TestHarness] Required modules are missing");
} else {
    console.log("[TestHarness] All modules present");
}

// ---------------------------
// First-run scaffold (TEMP)
// ---------------------------
// ---------------------------
// First-run scaffold (explicit creation only)
// ---------------------------
async function firstRunScaffoldIfNeeded() {
    const projects = window.projectController.listProjects?.() || [];
    if (projects.length > 0) return;

    console.log("[FirstRun] No projects found — waiting for user to create one");

    // Editor disabled until user creates a file
    if (window.ui_editor) {
        window.ui_editor.setEnabled?.(false);
    }

    // Clear UI selects
    if (projectSelectEl) projectSelectEl.innerHTML = "";
    if (fileListEl) fileListEl.innerHTML = "";

    // Placeholder text
    if (projectSelectEl) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No projects yet";
        projectSelectEl.appendChild(opt);
    }
    if (titleEl) titleEl.textContent = "No file open";
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
function renderProjects(selectedId = null) {
    // Clear existing options
    projectSelectEl.innerHTML = "";

    const projects = window.projectController.listProjects();

    // Ensure the currently active project is selected if not explicitly passed
    const currentProjectId = window.projectController.getCurrentProject()?.id;
    const projectToSelect = selectedId || currentProjectId || "";

    for (const project of projects) {
        const opt = document.createElement("option");
        opt.value = project.id;
        opt.textContent = project.name;
        projectSelectEl.appendChild(opt);
    }

    // Explicitly select the current project
    if (projectToSelect) {
        projectSelectEl.value = projectToSelect;
    }
}


function handleFileClick(file) {
    return async () => {
        await window.fileController.open(file.id);
        titleEl.textContent = file.name;
        updateEditorEnabledState();
        window.projectController.persistCurrentSession?.();
    };
}


function renderFiles() {
    fileListEl.innerHTML = "";
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

function updateEditorEnabledState() {
    if (!window.fileController || !window.ui_editor) return;

    const saveState = window.fileController.getCurrentSaveState?.();
    const hasFile = !!window.fileController.getCurrentFile();

    // Editor enabled **ONLY** if we have an identified file
    const shouldEnable = (saveState === window.fileController.SaveState.IDENTIFIED) && hasFile;

    window.ui_editor.setEnabled?.(shouldEnable);
}


function hasStoredProjects() {
    const raw = localStorage.getItem("ScriptHub.projects");
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0;
    } catch {
        return false;
    }
}


// ---------------------------
// Event handlers
// ---------------------------
btnNewProject.onclick = async () => {
    const name = prompt("New project name:");
    if (!name) return;

    const project = window.projectController.createProject(name);
    await window.SH.storage.saveProject(project);

    // Render projects dropdown and select the new project
    renderProjects(project.id);

    // Open newly created project
    window.projectController.openProject(project.id);

    // Render files (should be empty)
    renderFiles();

    // Clear editor and disable typing until a file is created
    if (window.fileController) window.fileController.newFile(); // clears editor, sets EPHEMERAL
    if (window.ui_editor) window.ui_editor.setEnabled(false);

    titleEl.textContent = "No file selected";

    // Persist session
    window.projectController.persistCurrentSession?.();
};

btnNewFile.onclick = async () => {
    const project = window.projectController.getCurrentProject();
    if (!project) {
        alert("Please create or select a project before creating a file.");
        return;
    }

    const name = prompt("Enter file name:");
    if (!name) return;

    // Create new file
    const newFileId = window.SH.ProjectIndex.createFilePrivileged(name);
    if (!newFileId) return alert("Failed to create file.");

    // Save empty content
    await window.SH.storage.saveFileContent(newFileId, project.id, "");

    // Open file in editor
    await window.fileController.open(newFileId);

    // Render files
    renderFiles();

    // Enable editor
    if (window.ui_editor) {
        editorEl.value = "";
        window.ui_editor.setEnabled?.(true);
    }

    titleEl.textContent = name;
    window.fileController.setCurrentSaveState?.("IDENTIFIED");

    // Persist session
    window.projectController.persistCurrentSession?.();
};

btnSave.onclick = async () => {
    const saveState = window.fileController.getCurrentSaveState?.();
    if (saveState !== window.fileController.SaveState.IDENTIFIED) return alert("Please create or open a file first.");
    await window.fileController.save();
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
    if (saveState !== window.fileController.SaveState.IDENTIFIED) return alert("Please create or open a file first.");
    const name = prompt("Save As file name:");
    if (!name) return;
    await window.fileController.saveAs(name);
    renderFiles();
    titleEl.textContent = name;
    updateEditorEnabledState();
};

// ---------------------------
// Project select change handler
// ---------------------------
projectSelectEl.onchange = async () => {
    const projectId = projectSelectEl.value;
    if (!projectId) return;

    const opened = window.projectController.openProject(projectId);
    if (!opened) return alert("[ProjectSelect] Failed to open project");

    // Render files for the selected project
    renderFiles();

    const files = window.projectController.listProjectFiles();

    if (files?.length) {
        // Project has files → open last opened file or first file
        const lastOpenedFileId = window.fileController.getLastOpenedFile?.();
        const fileToOpen = files.find(f => f.id === lastOpenedFileId) || files[0];

        if (fileToOpen?.id) {
            await window.fileController.open(fileToOpen.id);
            titleEl.textContent = fileToOpen.name;
        }
    } else {
        // Project has **no files**
        // Clear editor, disable typing, reset SaveState to EPHEMERAL
        if (window.fileController) window.fileController.newFile(); // clears editor, sets EPHEMERAL
        if (window.ui_editor) window.ui_editor.setEnabled(false);
        editorEl.value = "";
        titleEl.textContent = "No file selected";
    }

    // Persist session
    window.projectController.persistCurrentSession?.();

    // Always update editor state based on current file/save state
    updateEditorEnabledState();
};

// ---------------------------
// DOMContentLoaded: Initialize editor
// ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
    if (!window.ui_editor || typeof window.ui_editor.init !== "function") {
        console.error("[Init] ui_editor.init not available");
        return;
    }

    try {
        await window.ui_editor.init();
        console.log("[Init] ui_editor initialized");
        window.dispatchEvent(new Event("ui-editor-ready"));
    } catch (err) {
        console.error("[Init] ui_editor.init failed", err);
    }
});



// ---------------------------
// Ensure storage-initialized fires correctly
// ---------------------------
(async function ensureStorageInitialized() {
    if (window.SH?.storage?.init) {
        await window.SH.storage.init?.();
        console.log("[Storage] Ready");
        window.dispatchEvent(new Event("storage-initialized"));
    } else {
        console.warn("[Storage] init not available; firing event manually");
        window.dispatchEvent(new Event("storage-initialized"));
    }
})();

// ---------------------------
// storage-initialized: Restore last session and render UI
// ---------------------------
window.addEventListener("ui-editor-ready", async () => {
    const hasProjects = hasStoredProjects();

    if (!hasProjects) {
        await firstRunScaffoldIfNeeded();
        renderProjects();
        updateEditorEnabledState();
        console.log("[Init] No stored projects — fresh install state");
        return;
    }

    await window.projectController.restoreLastSession();
    renderProjects();

    let currentProject = window.projectController.getCurrentProject();
    if (!currentProject) {
        const projects = window.projectController.listProjects();
        if (projects?.length) {
            window.projectController.openProject(projects[0].id);
            currentProject = window.projectController.getCurrentProject();
        }
    }

    if (currentProject) projectSelectEl.value = currentProject.id;
    renderFiles();

    const currentFileId = window.fileController.getCurrentFile();
    if (currentFileId) {
        const file = window.SH.ProjectIndex.getFile(currentFileId);
        if (file) {
            titleEl.textContent = file.name;
        }
    }

    updateEditorEnabledState();
    console.log("[Init] Storage initialized and session restored");
});


//Then in the console you just run:    resetScriptHub();
// ---------------------------
// Full ScriptHub reset
// ---------------------------
window.resetScriptHub = function () {
  console.log("[Reset] Nuking ScriptHub");

  localStorage.removeItem("ScriptHub.projects");
  localStorage.removeItem("ScriptHub.lastSession");
  localStorage.removeItem("ScriptHub.currentProjectId");
  localStorage.removeItem("sessionState");

  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("editorState_") || k.startsWith("scripthub_autosave")) {
      localStorage.removeItem(k);
    }
  });

  console.log("[Reset] Storage cleared. Reloading…");
  location.reload();
};
