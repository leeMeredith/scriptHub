window.onload = function() {
    const fileInput = document.getElementById("fileInput");
    const editor = document.getElementById("editor");
    const preview = document.getElementById("preview");

    const STORAGE_KEY = "scriptHubCurrentScript";

    function renderPreview(text) {
        if (typeof fountain !== "undefined" && fountain.parse) {
            const parsed = fountain.parse(text);
            preview.innerHTML = parsed.html.script || "No output from parser.";
        } else {
            preview.innerHTML = "Fountain parser not loaded.";
        }
    }

    // Load saved text from localStorage if available
    const savedText = localStorage.getItem(STORAGE_KEY);
    const initialText = savedText || `Title: Example Script
Author: You

INT. OFFICE - DAY

PERSON
Hello, this is a test.
`;
    editor.value = initialText;
    renderPreview(initialText);

    // Update preview and localStorage when editor content changes
    editor.addEventListener("input", () => {
        const text = editor.value;
        renderPreview(text);
        localStorage.setItem(STORAGE_KEY, text);
    });

    // Load selected .fountain file
    fileInput.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            editor.value = text;
            renderPreview(text);
            localStorage.setItem(STORAGE_KEY, text); // save loaded file
        };
        reader.readAsText(file);
    });
};
