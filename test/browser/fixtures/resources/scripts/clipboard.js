var client = new ZeroClipboard(document.getElementById("copy-button"));

client.on("ready", function(readyEvent) {
    client.on("aftercopy", function(event) {
        // console.log("Copied text to clipboard:\n" + event.data["text/plain"]);
    });
});