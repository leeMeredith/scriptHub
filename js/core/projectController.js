// js/core/projectController.js
// -----------------------------------------------------------------------------
// ProjectController
// Core project lifecycle authority.
// Platform-agnostic: no dialogs, no UI, no environment-specific APIs.
// File access is delegated to FileAdapter.
// Safe to reuse in Electron (renderer) without modification.
// -----------------------------------------------------------------------------
// projectController.js
// -----------------------------------------------------------------------------
// ProjectController
// Lifecycle authority for editor projects.
// - Owns project identity (current filename or Untitled)
// - Owns transitions: New, Open, Save, Save As
// - Does NOT show dialogs or touch UI chrome
// - Does NOT know whether it runs in Browser or Electron
//
// Electron migration note:
// File I/O is abstracted via FileAdapter.
// UI-triggered actions (menus, dialogs) must live outside this module.
// -----------------------------------------------------------------------------
