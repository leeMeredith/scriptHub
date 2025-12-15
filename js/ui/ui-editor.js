// js/ui/ui-editor.js
// Connects <textarea id="editor"> to the state system.
// Handles input, cursor tools, and propagates text-changed events.

(function () {
    const SH = window.SH || (window.SH = {});

    let editor = null;

    function handleInput() {
    	const text = editor.value;
		SH.state.setText(text, { source: "editor" });
	}

    function onTextChanged(e) {
        // Prevent infinite loop: only update if editor didn't cause the change
        if (e.detail.options?.source === "editor") return;

        const newText = e.detail.text;
        if (editor.value !== newText) {
            editor.value = newText;
        }
    }

    function insertAtCursor(str) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        const newText = before + str + after;

        editor.value = newText;

        // Move cursor after inserted text
        const pos = start + str.length;
        editor.selectionStart = pos;
        editor.selectionEnd = pos;

        SH.state.setText(newText, { source: "editor" });
    }

    function init() {
        editor = document.getElementById("editor");

        if (!editor) {
            console.warn("ui-editor.js: #editor not found.");
            return;
        }

        editor.addEventListener("input", handleInput);
        window.addEventListener("text-changed", onTextChanged);

        console.log("%c[UI-Editor] Ready", "color:#7c3aed");

        // Export insert API for toolbar module
        window.ui_editor = { insertAtCursor };
    }

    window.ui_editor = window.ui_editor || { init };

})();
