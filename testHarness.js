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
async function firstRunScaffoldIfNeeded() {
    const projects = window.projectController.listProjects?.() || [];
    if (projects.length > 0) return; // already initialized

    console.log("[FirstRun] No projects found — scaffolding initial project");

    const project = window.projectController.createProject("My First Script");
    await window.SH.storage.saveProject(project);

    const fileId = window.SH.ProjectIndex.createFilePrivileged("scene-01.fountain");
    await window.SH.storage.saveFileContent(fileId, project.id, "");

    await window.fileController.open(fileId);

    console.log("[FirstRun] Initial project and file created");
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
    projectSelectEl.innerHTML = "";

    const projects = window.projectController.listProjects();
    for (const project of projects) {
        const opt = document.createElement("option");
        opt.value = project.id;
        opt.textContent = project.name;
        projectSelectEl.appendChild(opt);
    }

    if (selectedId) {
        projectSelectEl.value = selectedId;
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
    window.ui_editor.setEnabled(saveState === window.fileController.SaveState.IDENTIFIED);
}

// ---------------------------
// Event handlers
// ---------------------------
btnNewProject.onclick = async () => {
    const name = prompt("New project name:");
    if (!name) return;

    const project = window.projectController.createProject(name);
    await window.SH.storage.saveProject(project);

    renderProjects();

    window.projectController.openProject(project.id);
    projectSelectEl.value = project.id;

    renderFiles();

    window.fileController.newFile();
    titleEl.textContent = "Untitled";

    updateEditorEnabledState();
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

    const newFileId = window.SH.ProjectIndex.createFilePrivileged(name);
    if (!newFileId) return alert("Failed to create file.");

    await window.SH.storage.saveFileText(newFileId, "");
    await window.fileController.open(newFileId);

    renderFiles();
    titleEl.textContent = name;
    updateEditorEnabledState();
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
    renderFiles();
    const files = window.projectController.listProjectFiles();
    if (files?.length) {
        const lastOpenedFileId = window.fileController.getLastOpenedFile?.();
        const fileToOpen = files.find(f => f.id === lastOpenedFileId) || files[0];
        if (fileToOpen?.id) {
            await window.fileController.open(fileToOpen.id);
            titleEl.textContent = fileToOpen.name;
            window.projectController.persistCurrentSession?.();
        }
    }
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
    await firstRunScaffoldIfNeeded();
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
