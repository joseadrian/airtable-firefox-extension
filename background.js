var urls = [
    "https://airtable.com/v0.3/row/*/updatePrimitiveCell*" // Request to update the cell value. * => it's the row id
];

var timeouts = {};
function debounce(callback, id, ms) {
    clearTimeout(timeouts[id]);
    timeouts[id] = setTimeout(function () {
        callback();
        delete timeouts[id];
    }, ms || 3000);
}

/**
 *
 * @param data
 * @param path
 */
function sendDataToWebhookUrl(data, path) {
    browser.storage.sync.get("webhook_url").then(function (item) {
        axios.post(item.webhook_url + '/' + path, data);
    }, function() {

    });
}


/**
 *
 * @param details
 */
function requestListener(details) {
    let jsonResponse = JSON.parse(details.requestBody.formData.stringifiedObjectParams.pop());
    jsonResponse.rowId = details.url.match(/row\/([0-9a-zA-Z]+)/).pop();

    // Stop
    debounce(function() {
        sendDataToWebhookUrl(jsonResponse, 'cellUpdated');
    }, jsonResponse.rowId + jsonResponse.columnId, 5000);
}

browser.webRequest.onBeforeRequest.addListener(requestListener, { urls: urls }, ["blocking", "requestBody"]);