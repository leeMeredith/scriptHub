// js/core/previewNavigator.js
(function() {
    function jumpToPage(idx) {
        if (window.UINavigation && typeof window.UINavigation.jumpToPage === "function") {
            window.UINavigation.jumpToPage(idx);
        }
    }

    window.previewNavigator = { jumpToPage };
})();
