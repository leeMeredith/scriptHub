/* -----------------------------------------------------
   ScriptHub Vertical Tabs Controller
   ----------------------------------------------------- */

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

function activateTab(name) {
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });

  tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${name}`);
  });

  // Trigger specific behaviors
  switch (name) {
    case 'preview':
      if (window.renderPreview) renderPreview();
      break;

    case 'pages':
      if (window.populatePageSelect) populatePageSelect();
      break;

    case 'versions':
      // Placeholder: in future we will load snapshots here
      break;

    case 'graph':
      // Placeholder for Git-like visualization
      const g = document.getElementById('graphContent');
      if (g && !g.dataset.initialized) {
        g.dataset.initialized = "true";
        g.innerHTML =
          `<div style="padding:20px;">
             <strong>Version Graph</strong><br><br>
             This panel will display branching timelines similar to GitHub.<br>
             It is ready for ELK.js / D3.js integration.
           </div>`;
      }
      break;
  }
}

// Hook button clicks
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Default tab:
activateTab('preview');
