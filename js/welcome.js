// js/welcome.js
// Project launcher behavior only

function handleAction(action) {
  switch (action) {
    case "new":
      alert("Create a new project folder and enter the editor.");
      break;

    case "open":
      alert("Open an existing project folder.");
      break;

    case "sample":
      alert("Open a bundled sample project.");
      break;

    case "quit":
      alert("Quit application.");
      break;
  }
}

document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  handleAction(button.dataset.action);
});
