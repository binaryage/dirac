/* http://mit-license.org/ */

(function(global, doc) {
    if (global["favicon"]) {
        return;
    }

    // private

    const head = doc.getElementsByTagName("head")[0];
    let loopTimeout = null;
    const changeFavicon = function(iconURL) {
        const newLink = doc.createElement("link");
        newLink.type = "image/x-icon";
        newLink.rel = "icon";
        newLink.href = iconURL;
        removeExistingFavicons();
        head.appendChild(newLink);
    };
    const removeExistingFavicons = function() {
        const links = head.getElementsByTagName("link");
        for (let i = 0; i < links.length; i++) {
            if (/\bicon\b/i.test(links[i].getAttribute("rel"))) {
                head.removeChild(links[i]);
            }
        }
    };

    // public

    global["favicon"] = {
        "defaultPause": 2000,
        "change": function(iconURL, optionalDocTitle) {
            clearTimeout(loopTimeout);
            if (optionalDocTitle) {
                doc.title = optionalDocTitle;
            }
            if (iconURL !== "") {
                changeFavicon(iconURL);
            }
        },
        "animate": function(icons, optionalDelay) {
            clearTimeout(loopTimeout);
            // preload icons
            icons.forEach(function(icon) {
                (new Image()).src = icon;
            });
            optionalDelay = optionalDelay || this["defaultPause"];
            let iconIndex = 0;
            changeFavicon(icons[iconIndex]);
            loopTimeout = setTimeout(function animateFunc() {
                iconIndex = (iconIndex + 1) % icons.length;
                changeFavicon(icons[iconIndex]);
                loopTimeout = setTimeout(animateFunc, optionalDelay);
            }, optionalDelay);
        },
        "stopAnimate": function() {
            clearTimeout(loopTimeout);
        }
    };
})(window, document);
