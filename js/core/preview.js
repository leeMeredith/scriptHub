// js/core/preview.js
// Responsible for: parsing Fountain, generating preview HTML,
// splitting pages, creating page snippets, and notifying UI modules.

(function () {
    const SH = window.SH || (window.SH = {});
    SH.pages = [];

    // DOM reference
    let previewEl = null;
    

	// render scheduling state
	let debounceTimer = null;
	const TYPING_DEBOUNCE_MS = 120;
	let lastText = "";
	let lastSource = null;

    // Initialize preview element reference
    function init() {
        previewEl = document.getElementById("preview");
        if (!previewEl) {
            console.warn("preview.js: Missing #preview element.");
            return;
        }
        console.log("%c[CorePreview] Initialized", "color: #0b5fff");
    }

    // Splits an HTML-script string into page chunks using <hr /> markers (fountain page breaks).
    function splitHtmlIntoPages(htmlScript) {
        if (!htmlScript) return [{ index: 0, html: "", snippet: "" }];
        // Normalize possible <hr> variants to <hr />
        const normalized = htmlScript.replace(/<hr\s*\/?>/gi, "<hr />");
        const parts = normalized.split("<hr />");

        return parts.map((html, i) => {
            const cleanText = html.replace(/<[^>]+>/g, "").trim();
            const snippet = cleanText.split("\n").map(l => l.trim()).find(l => l.length > 0) || "";
            return {
                index: i,
                html: html,
                snippet: snippet.slice(0, 120)
            };
        });
    }

    // Render the preview and build SH.pages
    function render(text) {
        if (!previewEl) {
            console.warn("preview.js: No preview element — cannot render.");
            return;
        }

        // Use parser wrapper if available. Falls back to parserless display.
        const res = SH.parser ? SH.parser.updateFromText(text) : { htmlScript: "<pre>" + escapeHtml(text) + "</pre>" };

        const htmlScript = res.htmlScript || "";

        // Build page DOM: wrap each page in a .page div with data-page-index
        const pages = splitHtmlIntoPages(htmlScript);

        // Construct combined HTML with wrappers so page elements exist
        const htmlPieces = pages.map(p => {
            // ensure inner html is available; keep original markup
            return `<div class="page" data-page-index="${p.index}"><div class="page-body">${p.html || ""}</div><div class="page-number">Page ${p.index + 1}</div></div>`;
        });

        previewEl.innerHTML = htmlPieces.join("\n");

        // Update SH.pages and notify
        SH.pages = pages;
        window.dispatchEvent(new CustomEvent("preview-updated", { detail: { pages } }));
    }
        
    // Single entry point from editor into preview pipeline
    function updateFromEditor(text, options) {
        options = options || {};

        const source = options.source || "unknown";
        const immediate = options.immediate === true;

        // Normalize text
        const nextText = text == null ? "" : String(text);

        // Avoid unnecessary work
        if (nextText === lastText && source !== "programmatic") {
            return;
        }

        lastText = nextText;
        lastSource = source;

        // Clear any pending render
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        // Decide timing
        if (immediate || source === "programmatic" || source === "initial-load") {
            render(nextText);
            return;
        }

        // Typing and similar sources are debounced
	    debounceTimer = setTimeout(() => {
	        debounceTimer = null;
	        render(lastText);
	    }, TYPING_DEBOUNCE_MS);
    }


    // small escape util
    function escapeHtml(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Expose API
    window.CorePreview = {
        init,
        updateFromEditor
    };
    
	document.addEventListener("DOMContentLoaded", () => {
		if (window.CorePreview && typeof CorePreview.init === "function") {
		    CorePreview.init({ previewId: "preview" });
		}
	});


})();
