function saveOptions(e) {
    e.preventDefault();
    browser.storage.sync.set({
        webhook_url: document.querySelector("#webhook_url").value
    });
}

function restoreOptions() {

    function setCurrentChoice(result) {
        document.querySelector("#webhook_url").value = result.webhook_url || "";
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    let getting = browser.storage.sync.get("webhook_url");
    getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);