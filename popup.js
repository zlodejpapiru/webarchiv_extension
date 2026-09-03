async function getCurrentTab() {

  const tabs =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  return tabs[0];

}


// Otevřít ve Webarchivu

document
  .getElementById("openArchive")
  .addEventListener("click", async () => {

    const tab =
      await getCurrentTab();

    if (!tab?.url) return;


    chrome.runtime.sendMessage({
      action: "openArchive",
      url: tab.url
    });

  });


// Přidat web

document
  .getElementById("addWeb")
  .addEventListener("click", async () => {

    const tab =
      await getCurrentTab();

    if (!tab?.url) return;


    chrome.runtime.sendMessage({
      action: "addWeb",
      url: tab.url
    });

  });