// ---------------------------
// Test harness for ScriptHub
// ---------------------------

console.log("[TestHarness] Loaded");

// Ensure all required modules exist
if (!window.SH?.storage || !window.SH?.projects || !window.SH?.ProjectIndex || !window.fileController) {
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

function renderFiles(projectId) {
    fileListEl.innerHTML = "";
    const project = window.projectController.getCurrentProject();
    if (!project) return;

    const files = window.projectController.listProjectFiles();
    files.forEach(f => {
        const div = document.createElement("div");
        div.textContent = f.name;
        div.onclick = async () => {
            await window.fileController.open(f.id);
            editorEl.value = window.ui_editor.getText();
            titleEl.textContent = f.name;
        };
        fileListEl.appendChild(div);
    });
}

function updateEditor() {
    if (!editorEl || !window.ui_editor) return;
    editorEl.oninput = () => {
        window.ui_editor.setText(editorEl.value);
    };
}

// ---------------------------
// Event handlers
// ---------------------------
btnNewProject.onclick = () => {
    const name = prompt("New project name:");
    if (!name) return;
    window.projectController.createProject(name);
    renderProjects();
    projectSelectEl.value = window.projectController.getCurrentProject().id;
    renderFiles();
};

btnNewFile.onclick = async () => {
    const name = prompt("New file name:");
    if (!name) return;
    await window.fileController.saveAs(name);
    renderFiles();
    editorEl.value = window.ui_editor.getText();
    titleEl.textContent = name;
};

btnSave.onclick = async () => {
    await window.fileController.save();
    alert("File saved!");
};

btnSaveAs.onclick = async () => {
    const name = prompt("Save As file name:");
    if (!name) return;
    await window.fileController.saveAs(name);
    renderFiles();
    editorEl.value = window.ui_editor.getText();
    titleEl.textContent = name;
};

// ---------------------------
// Project selection
// ---------------------------
projectSelectEl.onchange = async () => {
    const projectId = projectSelectEl.value;
    if (!projectId) return;

    window.projectController.openProject(projectId);
    renderFiles();

    const files = window.projectController.listProjectFiles();
    if (!files || files.length === 0) {
        window.fileController.newFile();
        return;
    }

    // Prefer most recently touched file
    const fileToOpen = files
        .slice()
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

    if (fileToOpen?.id) {
        await window.fileController.open(fileToOpen.id);
        editorEl.value = window.ui_editor.getText();
        titleEl.textContent = fileToOpen.name;
    }
};

// ---------------------------
// Initial setup
// ---------------------------
window.addEventListener("storage-initialized", async () => {
    renderProjects();
    updateEditor();

    if (window.projectController?.restoreLastSession) {
        const restored = await window.projectController.restoreLastSession();
        if (restored) {
            renderFiles();
            return;
        }
    }
});


document.addEventListener("DOMContentLoaded", async () => {
    if (window.ui_editor?.init) {
        window.ui_editor.init();
    } else {
        console.error("[TestHarness] ui_editor.init not available");
        return;
    }

    // SECOND-CHANCE RESTORE (UI-safe)
    if (window.projectController?.restoreLastSession) {
        const restored = await window.projectController.restoreLastSession();
        if (restored) {
            renderProjects();
            renderFiles();
        }
    }
});


console.log("[TestHarness] Ready");
