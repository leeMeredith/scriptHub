// js/fileAdapter.js
// Web implementation (temporary, Electron-safe)

window.FileAdapter = (() => {

    async function open(file) {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = () => resolve({
                filename: file.name,
                text: reader.result
            });
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async function exists(filename) {
        const res = await fetch(`/exists?file=${encodeURIComponent(filename)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.exists;
    }

    async function save(filename, text) {
        const res = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, text })
        });

        if (!res.ok) throw new Error("Save failed");
        return filename;
    }

    async function saveAs(filename, text) {
        // Normalize extension
        filename = filename.replace(/\.[^\.]+$/, "") + ".fountain";

        // Check if the file exists
        if (await exists(filename)) {
            const firstConfirm = confirm(`${filename} already exists. Overwrite?`);
            if (!firstConfirm) return false;

            const secondConfirm = confirm(
                `Are you absolutely sure? Selecting Yes will completely overwrite "${filename}".`
            );
            if (!secondConfirm) return false;
        }

        await save(filename, text);
        return filename;
    }

    return { open, save, saveAs };
})();
