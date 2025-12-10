// js/core/parser.js
// Wrapper around the fountain parser library (lib/fountain-parser.min.js).
// Provides a simple parse(text) method and safe fallback behavior.
// Exposes SH.parser.parse and SH.updateFromText convenience function.

(function () {
    const SH = window.SH || (window.SH = {});

    function isParserAvailable() {
        // The included minified lib exposes `fountain` (or `FountainParser`) depending on variant.
        return (typeof window.fountain !== "undefined" && typeof window.fountain.parse === "function")
            || (typeof window.FountainParser !== "undefined" && typeof window.FountainParser.parse === "function");
    }

    function getParser() {
        if (typeof window.fountain !== "undefined" && typeof window.fountain.parse === "function") {
            return window.fountain;
        } else if (typeof window.FountainParser !== "undefined" && typeof window.FountainParser.parse === "function") {
            return window.FountainParser;
        } else {
            return null;
        }
    }

    /**
     * Parse Fountain text and return a normalized object:
     * { html: { script: "...", title_page: "..." }, tokens: ... , title: ... }
     */
    function parse(text) {
        const parser = getParser();
        if (!parser) {
            console.warn("parser.js: Fountain parser not available.");
            return { html: { script: escapeHtml(text) }, tokens: [] };
        }

        try {
            const out = parser.parse(text);
            // ensure structure exists
            out.html = out.html || { script: "" };
            return out;
        } catch (err) {
            console.error("parser.js: parse error", err);
            return { html: { script: "<pre>" + escapeHtml(text) + "</pre>" }, tokens: [] };
        }
    }

    // small util
    function escapeHtml(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /**
     * Convenience: updateFromText(text)
     * - parses the text
     * - returns { parsed, htmlScript }
     */
    function updateFromText(text) {
        const parsed = parse(text);
        const htmlScript = (parsed && parsed.html && parsed.html.script) ? parsed.html.script : "";
        return { parsed, htmlScript };
    }

    // Expose API
    SH.parser = {
        parse,
        updateFromText
    };

    console.log("%c[Parser] Ready (fountain parser " + (isParserAvailable() ? "found" : "missing") + ")", "color:#0b5fff");
})();
