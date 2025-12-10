// js/app.js
// Main startup logic for ScriptHub Editor

window.addEventListener("DOMContentLoaded", function () {

    console.log("%c[App] ScriptHub Editor Booting…", "color:#0b5fff; font-weight:700;");

    // 1) Init core modules (state, parser, storage, preview)
    if (window.SH && SH.state && SH.state.init) SH.state.init();
    if (window.FountainParser && FountainParser.init) FountainParser.init();
    if (window.CoreStorage && CoreStorage.init) CoreStorage.init();
    if (window.CorePreview && CorePreview.init) CorePreview.init();
    if (window.CoreProjects && CoreProjects.init) CoreProjects.init();

    // 2) Init UI modules (editor, search, toolbar, tabs, nav, title, resize)
    if (window.UIEditor && UIEditor.init) UIEditor.init();
    if (window.UIToolbar && UIToolbar.init) UIToolbar.init();
    if (window.UITabs && UITabs.init) UITabs.init();
    if (window.UINavigation && UINavigation.init) UINavigation.init();
    if (window.UISearch && UISearch.init) UISearch.init();
    if (window.UITitlePage && UITitlePage.init) UITitlePage.init();
    if (window.UIResize && UIResize.init) UIResize.init();

    console.log("%c[App] All modules initialized.", "color:#0b5fff; font-weight:700;");
});
