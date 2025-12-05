function saveDraft(text) {
    localStorage.setItem("scriptDraft", text);
}

function loadDraft() {
    return localStorage.getItem("scriptDraft");
}
