/**
 *  Other requests:
 *  - table/{tableID}/pasteCells
 *  - view/{viewId}/resizeColumn
 *  - column/{columnId}/create : when the new column is created
 *  - column/{columnId}/destroy
 *  - column/{columnId}/updateConfig : when the field type or properties changes
 */
var urls = [
    "https://airtable.com/v0.3/row/*/updatePrimitiveCell*" // Request to update the cell value. * => it's the row id
    , 'https://airtable.com/v0.3/row/*/updateArrayTypeCellByAddingItem*'
    , 'https://airtable.com/v0.3/table/*/destroyMultipleRows*' // Request to remove rows
    , 'https://airtable.com/v0.3/row/*/updateArrayTypeCellByRemovingItem*'
    , 'https://airtable.com/v0.3/row/*/updateArrayTypeCellByUpdatingPropertiesInItem*'
    , 'https://airtable.com/v0.3/row/*/create*'
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
        item.webhook_url && axios.post(item.webhook_url + '/' + path, data);
    }, function() {

    });
}

/**
 *
 * @param details
 * @returns {string}
 */
function getRowId(details) {
    return details.url.match(/row\/([0-9a-zA-Z]+)/).pop();
}

/**
 *
 * @param details
 * @param data
 */
function prepareAndSendRequest(details, data) {
    // Getting only `stringifiedObjectParams` from the request body
    let jsonResponse = JSON.parse(details.requestBody.formData.stringifiedObjectParams.pop()), action = '';

    if ( details.url.indexOf('/updatePrimitiveCell') > -1 ) { // Request to update cell
        jsonResponse.rowId = getRowId(details);

        // Only applied to primitive cell because the request are done with a delay every time user enters a character
        return debounce(function () {
            sendDataToWebhookUrl(jsonResponse, 'cellUpdated');
        }, jsonResponse.rowId + jsonResponse.columnId, 5000);
    }

    if ( details.url.indexOf('/updateArrayTypeCellByAddingItem') > -1 ) {
        action = 'itemAdded';
        jsonResponse.rowId = getRowId(details);
    } else if ( details.url.indexOf('/destroyMultipleRows') > -1 ) {
        action = 'rowsRemoved';
        jsonResponse.tableId = details.url.match(/table\/([0-9a-zA-Z]+)/).pop();
    } else if ( details.url.indexOf('/updateArrayTypeCellByRemovingItem') > -1 ) {
        action = 'itemRemoved';
        jsonResponse.rowId = getRowId(details);

        // Remove all the properties of the item (except id) if the request does not end with `ById`
        if( details.url.indexOf('/updateArrayTypeCellByRemovingItemById') === -1 ) {
            jsonResponse.itemId = jsonResponse.item.id;
            delete jsonResponse.item;
        }
    } else if ( details.url.indexOf('/updateArrayTypeCellByUpdatingPropertiesInItem') > -1 ) {
        action = 'itemUpdated';
        jsonResponse.rowId = getRowId(details);
    } else if ( details.url.indexOf('/create') > -1 ) {
        action = 'rowCreated';
        jsonResponse.rowId = getRowId(details);
    }

    sendDataToWebhookUrl(jsonResponse, action);
}

/**
 *
 * @param details
 */
function requestListener(details) {
    let filter  = browser.webRequest.filterResponseData(details.requestId);
    let data    = [];

    // Don't interrupt request, just collecting the response
    filter.ondata = function(event) {
        data.push(event.data);
        filter.write(event.data);
    };

    filter.onstop = function() {
        filter.close();

        prepareAndSendRequest(details, data);
    };
}

browser.webRequest.onBeforeRequest.addListener(requestListener, { urls: urls }, ["blocking", "requestBody"]);