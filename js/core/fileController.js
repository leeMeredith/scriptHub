// js/core/fileController.js
// -----------------------------------------------------------------------------
// fileController
// -----------------------------------------------------------------------------
// Orchestrates file lifecycle:
// - Creates files via ProjectIndex
// - Persists content via storage.js
// - Manages the "current file" and authoritative save state
// -----------------------------------------------------------------------------

// ============================================================================
// SAVE STATE & FILE IDENTITY ROADMAP — DO NOT REORDER
// ============================================================================
//
// The following steps MUST be completed in this order.
// Partial implementation or reordering WILL reintroduce silent file creation.
//
// 1. Audit adoptOpenFile() for identity leakage
//    - Must NEVER create files
//    - Must NEVER persist metadata
//    - Must ONLY bind editor state to an existing file identity
//
// 2. Formalize SaveState transitions inside fileController
//    - Every public action must declare:
//        FROM SaveState
//        TO SaveState
//    - Transitions must be explicit and commented
//    - No implicit or inferred transitions allowed
//
// 3. Lock ProjectIndex so file creation is ONLY possible via saveAs()
//    - createFile() must remain explicit
//    - No helper, restore, open, or highlight path may create files
//
// This roadmap exists to prevent EPHEMERAL → IDENTIFIED leaks,
// especially during startup restore and UI-driven flows.
// ============================================================================


console.log(
  "[fileController] LOADED",
  document.currentScript?.src,
  "time:",
  performance.now()
);

(function () {

  if (!window.SH?.storage || !window.SH?.ProjectIndex) {
    console.error("[fileController] Required modules missing");
    return;
  }

  const storage = window.SH.storage;
  const ProjectIndex = window.SH.ProjectIndex;

  let currentFileId = null;

// ---------------------------------------------------------------------------
// SaveState — AUTHORITATIVE FILE IDENTITY STATE
// ---------------------------------------------------------------------------
// EPHEMERAL
//   - Editor has text but NO file identity
//   - No ProjectIndex entry exists
//   - save() is NOT allowed
//   - saveAs() is REQUIRED to create identity
//
// IDENTIFIED
//   - File identity already exists in ProjectIndex
//   - save() overwrites existing file
//   - No new identity is created
//
// DERIVED
//   - Conceptual transition only
//   - Represents identity creation via saveAs()
//   - NOT persisted as a runtime state
//   - Immediately collapses to IDENTIFIED after saveAs completes
//
// HARD RULE:
// SaveState transitions are owned by fileController ONLY.
// UI, editor, and ProjectIndex must never infer or modify SaveState.
// ---------------------------------------------------------------------------
  const SaveState = Object.freeze({
    EPHEMERAL: "EPHEMERAL",     // Text exists, no identity yet
    IDENTIFIED: "IDENTIFIED",   // Opened or loaded existing file
	DERIVED: "DERIVED"          // Conceptual only — never stored as runtime state
  });

  // Authoritative SaveState
  let currentFileSaveState = SaveState.EPHEMERAL;

  function setCurrentSaveState(state) {
    currentFileSaveState = state;
    console.log("[fileController] SaveState set to", state);
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------
  function getCurrentFile() {
    return currentFileId;
  }

  function getCurrentSaveState() {
    return currentFileSaveState;
  }

	// ---------------------------------------------------------------------------
	// adoptOpenFile
	// ---------------------------------------------------------------------------
	// Binds the editor to an EXISTING file identity ONLY.
	//
	// HARD RULES:
	// - MUST NOT create files
	// - MUST NOT persist metadata
	// - MUST NOT infer identity
	// - MUST FAIL if file does not already exist
	//
	// This function exists primarily for:
	// - session restore
	// - controlled re-binding during open flows
	//
	// If this function ever succeeds for a nonexistent fileId,
	// the system has already broken a core invariant.
	// ---------------------------------------------------------------------------
	function adoptOpenFile(fileId) {
	  if (!fileId) {
	    console.warn("[fileController] adoptOpenFile called with no fileId");
	    return false;
	  }
	
	  const project = window.SH?.ProjectIndex?.getCurrentProject?.();
	  if (!project) {
	    console.warn("[fileController] adoptOpenFile called with no active project");
	    return false;
	  }
	
	  const file = window.SH.ProjectIndex.getFile(fileId);
	  if (!file) {
	    console.error(
	      "[fileController] adoptOpenFile refused — file does not exist:",
	      fileId
	    );
	    return false;
	  }
	
	  // Identity binding ONLY — no persistence, no creation
	  currentFileId = fileId;
	
	  // This file already exists, therefore IDENTIFIED
	  setCurrentSaveState(SaveState.IDENTIFIED);
	
	  return true;
	}

	// ---------------------------------------------------------------------------
	// newFile
	// ---------------------------------------------------------------------------
	// SaveState transition:
	//   ANY → EPHEMERAL
	//
	// Meaning:
	// - Clears identity
	// - Clears editor contents
	// - Does NOT create files
	// - Does NOT touch ProjectIndex
	//
	// This is a pure editor reset.
	// ---------------------------------------------------------------------------
	function newFile() {
	    currentFileId = null;
	
		if (window.ui_editor && typeof window.ui_editor.setText === "function") {
		    window.isProgrammaticChange = true;
		    window.ui_editor.setText("");
		    window.isProgrammaticChange = false;
		} else {
		    console.warn("[fileController] Editor not ready in newFile");
		}
	
	    window.SH?.titleState?.setTitle("Untitled", { dirty: false });
	
	    setCurrentSaveState(SaveState.EPHEMERAL);
	
	    unsavedChangesController?.onFileClosed();
	}


	// ---------------------------------------------------------------------------
	// open
	// ---------------------------------------------------------------------------
	// SaveState transition:
	//   EPHEMERAL → IDENTIFIED
	//   IDENTIFIED → IDENTIFIED
	//
	// Preconditions:
	// - fileId MUST already exist in ProjectIndex
	//
	// Meaning:
	// - Binds editor to an existing file via adoptOpenFile()
	// - Loads persisted content
	// - Never creates identity
	// ---------------------------------------------------------------------------
	async function open(fileId) {
	    if (!fileId) return false;
	
	    if (!window.ui_editor || typeof window.ui_editor.setText !== "function") {
	        console.warn("[fileController] Editor not ready during open, aborting");
	        return false;
	    }
	
	    const adopted = adoptOpenFile(fileId);
	    if (!adopted) {
	        alert(`[fileController] Cannot open file: ${fileId} does not exist.`);
	        return false;
	    }
	
	    const text = await storage.loadFileText(fileId) || "";
	
	    window.isProgrammaticChange = true;
	    window.ui_editor.setText(text, { source: "open" });
	    window.isProgrammaticChange = false;
	
	    ProjectIndex.highlightFile(fileId);
	
	    unsavedChangesController?.onFileOpened(fileId);
	
	    window.SH?.titleState?.setTitle(
	        ProjectIndex.getFile(fileId)?.name || "Untitled",
	        { dirty: false }
	    );
	
	    if (window.SH?.storage?.saveLastSession) {
	        const project = ProjectIndex.getCurrentProject();
	        if (project?.id) {
	            window.SH.storage.saveLastSession({
	                projectId: project.id,
	                fileId
	            });
	        }
	    }
	
	    return true;
	}

	async function openFileFromBrowser(file) {
	  if (!file) return;
	
	  const { filename, text } = await window.FileAdapter.open(file);
	
	  // Ensure a project exists
	  if (!ProjectIndex.getCurrentProject()) {
	    const projectName = prompt("Project name:");
	    if (!projectName) return;
	    ProjectIndex.createProject(projectName);
	  }
	
	  // Explicit, privileged identity creation (equivalent to Save As)
	  const fileId = ProjectIndex.createFilePrivileged(filename);
	  if (!fileId) return;
	
	  // Persist imported text
	  await storage.saveFileText(fileId, text);
	
	  // Open via normal path
	  await open(fileId);
	
	  // SaveState is IDENTIFIED via adoptOpenFile()
	}

// ---------------------------------------------------------------------------
// save
// ---------------------------------------------------------------------------
// SaveState transition:
//   IDENTIFIED → IDENTIFIED
//
// Preconditions:
// - currentFileId MUST exist
// - SaveState MUST NOT be EPHEMERAL
//
// Meaning:
// - Overwrites existing file contents only
// - Never creates identity
// ---------------------------------------------------------------------------
  async function save() {
	  
	// Guard: save() must never be used to create identity
    const fileId = currentFileId;
    
    if (!fileId) return false;

    if (!window.ui_editor || typeof window.ui_editor.getText !== "function") {
	    console.warn("[fileController] Editor not ready during save");
	    return false;
	}
	
	const text = window.ui_editor.getText();


    const success = await storage.saveFileText(fileId, text);

    if (success) {
      ProjectIndex.touchFile(fileId);
      unsavedChangesController?.onFileSaved(fileId);
      window.SH?.titleState?.markClean?.();

      // Any saved file is IDENTIFIED
      setCurrentSaveState(SaveState.IDENTIFIED);
    }

    return success;
  }

// ---------------------------------------------------------------------------
// saveAs
// ---------------------------------------------------------------------------
// SaveState transition:
//   EPHEMERAL → DERIVED
//   IDENTIFIED → DERIVED
//
// Meaning:
// - EXPLICIT creation of a new file identity
// - This is the ONLY place file identity is allowed to be created
//
// After first successful save, DERIVED behaves as IDENTIFIED.
// ---------------------------------------------------------------------------
  async function saveAs(name) {
    if (!name) return false;

    if (!ProjectIndex.getCurrentProject()) {
      const projectName = prompt("Project name:");
      if (!projectName) return false;
      ProjectIndex.createProject(projectName);
    }

	const fileId = ProjectIndex.createFilePrivileged(name);
	if (!fileId) return false;

    currentFileId = fileId;

    if (!window.ui_editor || typeof window.ui_editor.getText !== "function") {
	    console.warn("[fileController] Editor not ready during saveAs");
	    return false;
	}
	
	const text = window.ui_editor.getText();

    const success = await storage.saveFileText(fileId, text);

    if (success) {
      unsavedChangesController?.onFileSaved(fileId);
      window.SH?.titleState?.setTitle(name, { dirty: false });

	// File now has a stable identity and is fully saved
	// DERIVED is a conceptual step only and is not stored
	setCurrentSaveState(SaveState.IDENTIFIED);
    }

    return success;
  }
  
// ---------------------------------------------------------------------------
// Editor → Dirty State Bridge
// ---------------------------------------------------------------------------
// This is the ONLY place editor input is allowed to mark a file dirty.
// Programmatic changes (open, restore, setText) must never mark dirty.
// ---------------------------------------------------------------------------

	window.addEventListener("text-changed", (e) => {
	  const options = e.detail?.options || {};
	
	  // Ignore programmatic changes
	  if (options.source && options.source !== "editor") return;
	
	  // Only mark dirty if we have an identified file
	  if (currentFileSaveState !== SaveState.IDENTIFIED) return;
	
	  if (!currentFileId) return;
	
	  unsavedChangesController?.markDirty(
	    currentFileId,
	    "editor input"
	  );
	});
	

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.fileController = {
    // lifecycle
    newFile,
    open,
    adoptOpenFile,

    // saving
    save,
    saveAs,

	// state
	getCurrentFile,
	getCurrentSaveState,

    openFileFromBrowser,

    // SaveState enum reference for external usage
    SaveState
  };

  console.log("%c[fileController] Ready", "color:#0b5fff;font-weight:700;");

})();
