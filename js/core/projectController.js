// js/core/projectController.js
// -----------------------------------------------------------------------------
// projectController
// -----------------------------------------------------------------------------
// Thin delegation layer over ProjectIndex.
// Exposes stable API, does NOT store content or manipulate DOM.
// -----------------------------------------------------------------------------

(function () {

  if (!window.SH?.ProjectIndex) {
    console.error("[projectController] ProjectIndex not available");
    return;
  }

  const ProjectIndex = window.SH.ProjectIndex;

  // ---------------------------------------------------------------------------
  // Project lifecycle
  // ---------------------------------------------------------------------------

  function createProject(name) {
    return ProjectIndex.createProject(name);
  }

  function openProject(projectId) {
    return ProjectIndex.openProject(projectId);
  }

  function getCurrentProject() {
    return ProjectIndex.getCurrentProject();
  }

  function hasOpenProject() {
    return !!ProjectIndex.getCurrentProject();
  }

  function listProjects() {
    return ProjectIndex.listProjects();
  }

  // ---------------------------------------------------------------------------
  // File lifecycle (project-scoped)
  // ---------------------------------------------------------------------------

  function createFile(name) {
    return ProjectIndex.createFile(name);
  }

  function listProjectFiles() {
    return ProjectIndex.listFiles();
  }

  function getFile(fileId) {
    return ProjectIndex.getFile(fileId);
  }

  function renameFile(fileId, newName) {
    return ProjectIndex.renameFile(fileId, newName);
  }

  function touchFile(fileId) {
    return ProjectIndex.touchFile(fileId);
  }

  // ---------------------------------------------------------------------------
  // Session persistence
  // ---------------------------------------------------------------------------

	async function restoreLastSession() {
	    const storage = window.SH?.storage;
	    if (!storage?.loadLastSession) return false;
	
	    const session = storage.loadLastSession();
	    if (!session?.projectId) return false;
	
	    // Open last project
	    const opened = openProject(session.projectId);
	    if (!opened) return false;
	
	    let fileOpened = false;
	
	    // Open last file if possible
	    if (session.fileId && window.fileController?.open) {
	        try {
	            fileOpened = await window.fileController.open(session.fileId);
	        } catch (e) {
	            console.warn("[projectController] Failed to restore file", e);
	        }
	    }
	
	    // Persist session after restore
	    window.projectController.persistCurrentSession?.();
	
	    return true;
	}

  function persistCurrentSession() {
    const storage = window.SH?.storage;
    if (!storage?.saveLastSession) return;

    const projectId = getCurrentProject()?.id;
    const fileId = window.fileController?.getCurrentFile();

    if (!projectId) return;

    storage.saveLastSession({ projectId, fileId });
  }

  // ---------------------------------------------------------------------------
  // Compatibility / temp helpers
  // ---------------------------------------------------------------------------

  function ensureProjectExists() {
    if (hasOpenProject()) return getCurrentProject().id;

    const name = prompt("Project name:");
    if (!name) return null;

    return createProject(name);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.projectController = {
    // projects
    createProject,
    openProject,
    getCurrentProject,
    hasOpenProject,
    listProjects,
    ensureProjectExists,
    restoreLastSession,
    persistCurrentSession,

    // files
    createFile,
    listProjectFiles,
    getFile,
    renameFile,
    touchFile
  };

  console.log("%c[projectController] Ready", "color:#0b5fff;font-weight:700;");

})();
