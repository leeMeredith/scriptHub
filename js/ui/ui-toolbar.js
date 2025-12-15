// js/ui/ui-toolbar.js
(function() {
  const modes = {
    screenplay: ["INT.", "EXT.", "CHARACTER", "ACTION", "TRANSITION", "PAREN"],
    stageplay: ["Scene", "Actor", "Action", "Stage Direction"],
    tv: ["INT.", "EXT.", "CHARACTER", "ACTION", "CAMERA"]
  };

  let currentMode = "screenplay";

  function init() {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;

    populateToolbar(currentMode);

    console.log("%c[UI-Toolbar] Ready", "color:#7c3aed");
  }

  function populateToolbar(mode) {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;

    toolbar.innerHTML = ""; // clear previous buttons

    modes[mode].forEach(item => {
      const btn = document.createElement("button");
      btn.textContent = item;
      btn.dataset.insert = item + " "; // text to insert
      btn.className = "toolbar-btn";

      btn.addEventListener("click", () => {
        if (window.UIEditor && UIEditor.insertAtCursor) {
          UIEditor.insertAtCursor(btn.dataset.insert);
        }
      });

      toolbar.appendChild(btn);
    });
  }

  function setMode(mode) {
    if (!modes[mode]) return;
    currentMode = mode;
    populateToolbar(currentMode);
  }

  window.UIToolbar = { init, setMode };

})();
