// js/ui/ui-editor.js
// Connects <textarea id="editor"> to the state system.
// Handles input, cursor tools, and propagates text-changed events.

(function () {
    const SH = window.SH || (window.SH = {});

    let editor = null;

    function hasState() {
        return SH.state && typeof SH.state.setText === "function";
    }

    function handleInput() {
        if (!editor) return;

        const text = editor.value;

        // Always allow typing
        // Only propagate if state exists
        if (hasState()) {
            SH.state.setText(text, { source: "editor" });
        }
    }

    function onTextChanged(e) {
        if (!editor) return;

        // Ignore our own updates
        if (e.detail?.options?.source === "editor") return;

        const newText = e.detail?.text;
        if (typeof newText !== "string") return;

        if (editor.value !== newText) {
            editor.value = newText;
        }
    }
    
    function getText() {
        return editor ? editor.value : "";
	}
	
	function setText(text, options = {}) {
	    if (!editor) return;
	
	    const newText = text ?? "";
	
	    // Update editor directly
	    if (editor.value !== newText) {
	        editor.value = newText;
	    }
	
	    // Notify the rest of the app
	    window.dispatchEvent(
	        new CustomEvent("text-changed", {
	            detail: { text: newText, options }
	        })
	    );
	}


    function insertAtCursor(str) {
        if (!editor) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        const newText = before + str + after;

        editor.value = newText;

        const pos = start + str.length;
        editor.selectionStart = pos;
        editor.selectionEnd = pos;

        if (hasState()) {
            SH.state.setText(newText, { source: "editor" });
        }
    }
    
    function setEnabled(enabled) {
	    if (!editor) return;
	
	    editor.disabled = !enabled;
	    editor.readOnly = !enabled;
	
	    if (enabled) {
	        editor.classList.remove("editor-disabled");
	    } else {
	        editor.classList.add("editor-disabled");
	    }
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

        // Public API
		window.ui_editor = {
		    init,
		    insertAtCursor,
		    getText,
		    setText,
		    setEnabled
		};


    }

	window.ui_editor = window.ui_editor || {};
	window.ui_editor.init = init;

})();
