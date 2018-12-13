chrome.commands.onCommand.addListener(function(command) {
    messageContent(command);
});

function messageContent(commandName) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        var activeTabId = activeTab.id;
        chrome.tabs.sendMessage(activeTabId, {action: commandName}, () => {});
    });
}
