function renderPreview(text) {
    const preview = document.getElementById("preview");

    const parsed = fountain.parse(text);
    preview.innerHTML = parsed.html.script;
}
