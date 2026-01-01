// js/core/bootstrap.js
// -----------------------------------------------------------------------------
// Ensures SH.storage and SH.ProjectIndex exist before other modules load
// -----------------------------------------------------------------------------
window.SH = window.SH || {};

// In-memory storage placeholder
SH.storage = SH.storage || {
    _data: {},
    getItem(key) {
        return this._data[key] || null;
    },
    setItem(key, value) {
        this._data[key] = value;
    },
    removeItem(key) {
        delete this._data[key];
    },
    clear() {
        this._data = {};
    }
};

// Minimal ProjectIndex placeholder
SH.ProjectIndex = SH.ProjectIndex || (() => {
    let projects = {};
    let currentProjectId = null;

    function createProject(name) {
        const id = `proj_${Date.now()}`;
        projects[id] = { id, name, files: {} };
        currentProjectId = id;
        return projects[id];
    }

    function getCurrentProject() {
        return currentProjectId ? projects[currentProjectId] : null;
    }

    function createFile(name) {
        const project = getCurrentProject();
        if (!project) throw new Error("No current project for file creation");
        const fileId = `file_${Date.now()}`;
        project.files[fileId] = { id: fileId, name, lastModified: Date.now() };
        return project.files[fileId];
    }

    function getFile(fileId) {
        for (const proj of Object.values(projects)) {
            if (proj.files[fileId]) return proj.files[fileId];
        }
        return null;
    }

    function touchFile(fileId) {
        const file = getFile(fileId);
        if (file) file.lastModified = Date.now();
    }

    function highlightFile(fileId) {
        // Placeholder: implement UI highlight later
        console.log(`Highlight file: ${fileId}`);
    }

    return {
        createProject,
        getCurrentProject,
        createFile,
        getFile,
        touchFile,
        highlightFile
    };
})();
