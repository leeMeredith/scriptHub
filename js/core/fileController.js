// js/core/fileController.js
// -----------------------------------------------------------------------------
// fileController
// -----------------------------------------------------------------------------
// Orchestrates file lifecycle:
// - Creates files via ProjectIndex
// - Persists content via storage.js
// - Manages the "current file"
// -----------------------------------------------------------------------------

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
  // Accessors
  // ---------------------------------------------------------------------------

  function getCurrentFile() {
    return currentFileId;
  }

  function adoptOpenFile(fileId) {
    currentFileId = fileId;
  }

  // ---------------------------------------------------------------------------
  // New file
  // ---------------------------------------------------------------------------
  // Creates a new *unsaved* file.
  // Actual persistence happens on first save.
  // ---------------------------------------------------------------------------

  function newFile() {
    currentFileId = null;

    window.ui_editor?.setText("");
    window.SH?.titleState?.setTitle("Untitled", { dirty: false });
  }

	// ---------------------------------------------------------------------------
	// Open file
	// ---------------------------------------------------------------------------
	// Loads content by fileId and updates editor, project index, and dirty tracking.
	// ---------------------------------------------------------------------------
	
	async function open(fileId) {
	  if (!fileId) return;
	
	  // Set current file
	  currentFileId = fileId;
	
	  // Load text (async-safe)
	  const text = await storage.loadFileText(fileId) || "";
	
	  // Update editor without marking dirty
	  window.isProgrammaticChange = true;
	  window.ui_editor.setText(text, { source: "open" });
	  window.isProgrammaticChange = false;
	
	  // Highlight file in ProjectIndex
	  ProjectIndex.highlightFile(fileId);
	
	  // Update dirty tracking
	  unsavedChangesController?.onFileOpened(fileId);
	
	  // Update document title via TitleState (optional, can be integrated into ProjectIndex.highlightFile)
	  window.SH?.titleState?.setTitle(
	    ProjectIndex.getFile(fileId)?.name || "Untitled",
	    { dirty: false }
	  );
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
	
	    // Create file inside project
	    const fileId = ProjectIndex.createFile(filename);
	    if (!fileId) return;
	
	    // Persist imported text
	    await storage.saveFileText(fileId, text);
	
	    // Open it normally
	    await open(fileId);
	}

	// ---------------------------------------------------------------------------
	// Save (existing file)
	// ---------------------------------------------------------------------------
	// Saves current file content, updates ProjectIndex, and clears dirty state.
	// ---------------------------------------------------------------------------
	
	async function save() {
	  const fileId = currentFileId;
	  if (!fileId) return false;
	
	  // Get text from editor
	  const text = window.ui_editor.getText();
	
	  // Save text to storage (async-safe)
	  const success = await storage.saveFileText(fileId, text);
	
	  if (success) {
	    // Update ProjectIndex timestamp / mark touched
	    ProjectIndex.touchFile(fileId);
	
	    // Mark file as clean in unsavedChangesController
	    unsavedChangesController?.onFileSaved(fileId);
	
	    // Optional: update TitleState clean indicator
	    window.SH?.titleState?.markClean?.();
	  }
	
	  return success;
	}

  // ---------------------------------------------------------------------------
  // Save As / First Save
  // ---------------------------------------------------------------------------
  // Creates file metadata, then saves content.
  // ---------------------------------------------------------------------------

	async function saveAs(name) {
	  if (!name) return false;
	
	  if (!ProjectIndex.getCurrentProject()) {
	    const projectName = prompt("Project name:");
	    if (!projectName) return false;
	    ProjectIndex.createProject(projectName);
	  }
	
	  const fileId = ProjectIndex.createFile(name);
	  if (!fileId) return false;
	
	  currentFileId = fileId;
	
	  const text = window.ui_editor.getText();
	
	  // save text and only mark clean if successful
	  const success = await storage.saveFileText(fileId, text);
	  if (success) {
	    unsavedChangesController?.onFileSaved(fileId);
	    window.SH?.titleState?.setTitle(name, { dirty: false });
	  }
	
	  return success;
	}

  
  	// ----------------------------
	// EDITOR → DIRTY TRACKING
	// ----------------------------
	
	//If I ever want fileController to listen to editor events again, do it like this:
	/*
		function attachEditor(editor) {
		  editor.onChange(() => {
		    if (window.isProgrammaticChange) return;
		    if (!currentFileId) return;
		    unsavedChangesController.markDirty(currentFileId);
		  });
		}
	*/
	//And call it from app.js, after editor init:
	//fileController.attachEditor(window.ui_editor);


  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.fileController = {
    // lifecycle
    newFile,
    open,

    // saving
    save,
    saveAs,

    // state
    getCurrentFile,
    adoptOpenFile,
    
    openFileFromBrowser
  };

  console.log("%c[fileController] Ready", "color:#0b5fff;font-weight:700;");

})();
