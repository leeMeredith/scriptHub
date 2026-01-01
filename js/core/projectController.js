// js/core/projectController.js
// -----------------------------------------------------------------------------
// projectController
// -----------------------------------------------------------------------------
// Thin delegation layer over ProjectIndex.
// - Exposes a stable API to the rest of the app
// - Does NOT store content
// - Does NOT invent filesystem paths
// - Delegates all structure to ProjectIndex
//
// This keeps existing app.js code readable while allowing
// ProjectIndex to evolve independently.
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
  // Compatibility helpers (temporary)
  // ---------------------------------------------------------------------------
  // These exist ONLY so app.js doesn't break immediately.
  // They should be removed once app.js stops thinking in paths.
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

    // files
    createFile,
    listProjectFiles,
    getFile,
    renameFile,
    touchFile
  };

  console.log("%c[projectController] Ready", "color:#0b5fff;font-weight:700;");

})();
