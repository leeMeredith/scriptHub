// js/fountain.js
// Wrapper around fountain-parser.min.js to provide a clean global API.

(function () {

    if (!window.fountain) {
        console.warn("fountain.js: fountain-parser.min.js was not loaded before fountain.js");
    }

    function parse(text) {
        if (!window.fountain || !window.fountain.parse) {
            console.warn("fountain.js: parser missing.");
            return { html: { script: "<p>Parser missing.</p>" } };
        }
        return window.fountain.parse(text);
    }

    function init() {
        console.log("%c[Fountain] Parser Wrapper Ready", "color:#0b5fff");
    }

    window.FountainParser = { init, parse };

})();
