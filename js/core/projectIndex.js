// js/core/projectIndex.js
// -----------------------------------------------------------------------------
// ProjectIndex
// -----------------------------------------------------------------------------
// Authoritative index of projects and their files.
// - Stores project + file metadata ONLY
// - Does NOT store file contents
// - File contents live in storage.js (saveFileText / loadFileText)
// - Survives reloads
// - Browser-safe, Electron-safe
// -----------------------------------------------------------------------------

(function () {

  const STORAGE_KEY = "ScriptHub.projects";
  const CURRENT_PROJECT_KEY = "ScriptHub.currentProjectId";

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function loadAllProjects() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveAllProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function generateId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function now() {
    return Date.now();
  }

  // ---------------------------------------------------------------------------
  // Project state
  // ---------------------------------------------------------------------------

  let projects = loadAllProjects();
  let currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
  let currentFileId = null;

  function persistCurrentProject() {
    if (currentProjectId) {
      localStorage.setItem(CURRENT_PROJECT_KEY, currentProjectId);
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  }

  // ---------------------------------------------------------------------------
  // Project API
  // ---------------------------------------------------------------------------

  function createProject(name) {
    if (!name) return null;

    const id = generateId("project");

	projects[id] = {
	  id,
	  name,
	  created: now(),
	  lastOpened: now(),
	
	  // Files are created ONLY via createFile()
	  // Projects never auto-create files
	  files: {} // fileId → metadata
	};
	
    currentProjectId = id;

    saveAllProjects(projects);
    persistCurrentProject();

    return id;
  }

  function openProject(projectId) {
    if (!projects[projectId]) return false;

    currentProjectId = projectId;
    projects[projectId].lastOpened = now();

    saveAllProjects(projects);
    persistCurrentProject();

    return true;
  }

  function getCurrentProject() {
    if (!currentProjectId) return null;
    return projects[currentProjectId] || null;
  }

  function listProjects() {
    return Object.values(projects).map(p => ({
      id: p.id,
      name: p.name,
      created: p.created,
      lastOpened: p.lastOpened
    }));
  }

	// ---------------------------------------------------------------------------
	// File API (project-scoped)
	// ---------------------------------------------------------------------------
	
	let _allowFileCreation = false;
	
	function _setFileCreationPrivilege(allow) {
	    _allowFileCreation = allow;
	}
	
	function createFile(name) {
	    // File creation is ALWAYS explicit and privileged
	    // Only saveAs() (or other privileged flow) may create files
	    if (!_allowFileCreation) {
	        console.warn("[ProjectIndex] createFile blocked — not privileged");
	        return null;
	    }
	
	    if (!currentProjectId) return null;
	    if (!name) return null;
	
	    const project = projects[currentProjectId];
	    if (!project) return null;
	
	    const fileId = generateId("file");
	
	    project.files[fileId] = {
	        id: fileId,
	        name,
	        created: now(),
	        modified: now()
	    };
	
	    saveAllProjects(projects);
	
	    return fileId;
	}
	
	// Privileged entry point
	function createFilePrivileged(name) {
	    _setFileCreationPrivilege(true);
	    const fileId = createFile(name);
	    _setFileCreationPrivilege(false);
	    return fileId;
	}


  function renameFile(fileId, newName) {
    const project = getCurrentProject();
    if (!project) return false;
    if (!project.files[fileId]) return false;

    project.files[fileId].name = newName;
    project.files[fileId].modified = now();

    saveAllProjects(projects);
    return true;
  }

  function touchFile(fileId) {
    const project = getCurrentProject();
    if (!project) return false;
    if (!project.files[fileId]) return false;

    project.files[fileId].modified = now();
    saveAllProjects(projects);
    return true;
  }

  function listFiles() {
    const project = getCurrentProject();
    if (!project) return [];

    return Object.values(project.files);
  }

	function getFile(fileId) {
	  const project = getCurrentProject();
	  if (!project) return null;
	  if (!fileId) return null;
	
	  return project.files[fileId] || null;
	}

  
	function highlightFile(fileId) {
	  const project = getCurrentProject();
	  if (!project) return false;
	
	  // Highlighting NEVER creates files
	  // If it does not exist, we do nothing
	  if (!project.files[fileId]) return false;
	
	  currentFileId = fileId;
	
	  // Event-only helper for UI layers
	  // No persistence, no side effects
	  window.dispatchEvent(
	    new CustomEvent("file-highlighted", {
	      detail: { fileId }
	    })
	  );
	
	  return true;
	}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.SH = window.SH || {};
  window.SH.ProjectIndex = {
    // projects
    createProject,
    openProject,
    getCurrentProject,
    listProjects,

    // files
    createFile,
    createFilePrivileged,
    renameFile,
    touchFile,
    listFiles,
    getFile,
    highlightFile
  };

  console.log("%c[ProjectIndex] Ready", "color:#0b5fff;font-weight:700;");

})();
