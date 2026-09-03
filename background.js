const WAYBACK = "https://wayback.webarchiv.cz/secure/";
const ADD_WEB = "https://www.webarchiv.cz/cs/pridat-web";


// ======================================================
// KONTEXTOVÉ MENU
// ======================================================

chrome.runtime.onInstalled.addListener(() => {

  chrome.contextMenus.removeAll(() => {

    chrome.contextMenus.create({
      id: "open-webarchiv",
      title: "Otevřít ve Webarchivu",
      contexts: ["selection", "link", "page"]
    });

    chrome.contextMenus.create({
      id: "add-webarchiv",
      title: "Přidat web do Webarchivu",
      contexts: ["page", "link"]
    });

  });

});


// ======================================================
// PRAVÉ TLAČÍTKO
// ======================================================

chrome.contextMenus.onClicked.addListener((info, tab) => {

  // ----------------------------------------------------
  // OTEVŘÍT VE WEBARCHIVU
  // ----------------------------------------------------

  if (info.menuItemId === "open-webarchiv") {

    let url =
      info.linkUrl ||
      info.selectionText ||
      tab?.url;

    if (!url) return;

    url = url.trim();

    // Pokud označený text nemá https://
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    chrome.tabs.create({
      url: WAYBACK + url
    });

    return;
  }


  // ----------------------------------------------------
  // PŘIDAT WEB DO WEBARCHIVU
  // ----------------------------------------------------

  if (info.menuItemId === "add-webarchiv") {

    const url =
      info.linkUrl ||
      tab?.url;

    if (!url) return;

    openAddWeb(url);

  }

});


// ======================================================
// ZPRÁVY Z POPUP.JS
// ======================================================

chrome.runtime.onMessage.addListener((message) => {

  // ----------------------------------------------------
  // OTEVŘÍT VE WEBARCHIVU
  // ----------------------------------------------------

  if (message.action === "openArchive") {

    if (!message.url) return;

    let url = message.url.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    chrome.tabs.create({
      url: WAYBACK + url
    });

    return;
  }


  // ----------------------------------------------------
  // PŘIDAT WEB DO WEBARCHIVU
  // ----------------------------------------------------

  if (message.action === "addWeb") {

    if (!message.url) return;

    openAddWeb(message.url);

  }

});


// ======================================================
// OTEVŘÍT STRÁNKU "PŘIDAT WEB"
// ======================================================

function openAddWeb(sourceUrl) {

  chrome.tabs.create(
    {
      url: ADD_WEB
    },

    (newTab) => {

      if (!newTab?.id) {
        return;
      }

      const tabId = newTab.id;


      // ------------------------------------------------
      // ČEKÁME NA ÚPLNÉ NAČTENÍ STRÁNKY
      // ------------------------------------------------

      const listener = (updatedTabId, changeInfo) => {

        if (
          updatedTabId !== tabId ||
          changeInfo.status !== "complete"
        ) {
          return;
        }


        // Listener už nepotřebujeme
        chrome.tabs.onUpdated.removeListener(listener);


        // ------------------------------------------------
        // Krátká prodleva pro načtení formuláře
        // ------------------------------------------------

        setTimeout(() => {

          chrome.scripting.executeScript({

            target: {
              tabId: tabId
            },

            func: fillUrl,

            args: [
              sourceUrl
            ]

          }).catch((error) => {

            console.error(
              "Webarchiv: chyba při spuštění skriptu:",
              error
            );

          });

        }, 700);

      };


      chrome.tabs.onUpdated.addListener(listener);

    }
  );

}


// ======================================================
// VYPLNĚNÍ URL DO FORMULÁŘE
//
// TENTO KÓD BĚŽÍ PŘÍMO NA WEBARCHIV.CZ
// ======================================================

function fillUrl(url) {


  // ----------------------------------------------------
  // NAJÍT A VYPLNIT TEXTAREA
  // ----------------------------------------------------

  function setValue() {


    // ==================================================
    // PŘESNÁ XPATH, KTEROU JSME ZJISTILI
    // ==================================================

    const xpath =
      "/html/body/section[2]/div/form/div[1]/div[2]/textarea";


    const result =
      document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );


    const textarea =
      result.singleNodeValue;


    // ==================================================
    // KONTROLA
    // ==================================================

    if (!textarea) {

      console.log(
        "Webarchiv: URL textarea zatím nebyla nalezena."
      );

      return false;

    }


    console.log(
      "Webarchiv: nalezena URL textarea:",
      textarea
    );


    // ==================================================
    // NASTAVENÍ HODNOTY
    // ==================================================

    const setter =
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;


    if (setter) {

      setter.call(
        textarea,
        url
      );

    } else {

      textarea.value = url;

    }


    // ==================================================
    // SIMULACE PSANÍ
    // ==================================================

    textarea.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );


    textarea.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true
        }
      )
    );


    // ==================================================
    // FOCUS
    // ==================================================

    textarea.focus();


    // ==================================================
    // POSUN STRÁNKY K URL POLI
    // ==================================================

    textarea.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


    console.log(
      "Webarchiv: URL úspěšně vyplněna:",
      url
    );


    return true;

  }


  // ====================================================
  // PRVNÍ POKUS
  // ====================================================

  if (setValue()) {
    return;
  }


  // ====================================================
  // OPAKOVANÉ POKUSY
  //
  // Pokud formulář ještě není připravený,
  // zkoušíme každých 300 ms.
  // ====================================================

  let attempts = 0;


  const timer =
    setInterval(() => {

      attempts++;


      if (
        setValue() ||
        attempts >= 30
      ) {

        clearInterval(timer);

      }

    }, 300);

}