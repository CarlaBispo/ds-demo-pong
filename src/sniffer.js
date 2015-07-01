module.exports = function() { // should avoid user agent sniffing... but sometimes you just gotta do what you gotta do
    var ua  = navigator.userAgent.toLowerCase();
    var key =        ((ua.indexOf("opera")   > -1) ? "opera"   : null);
    key = key || ((ua.indexOf("firefox") > -1) ? "firefox" : null);
    key = key || ((ua.indexOf("chrome")  > -1) ? "chrome"  : null);
    key = key || ((ua.indexOf("safari")  > -1) ? "safari"  : null);
    key = key || ((ua.indexOf("msie")    > -1) ? "ie"      : null);

    try {
        var re      = (key == "ie") ? "msie (\\d)" : key + "\\/(\\d\\.\\d)";
        var matches = ua.match(new RegExp(re, "i"));
        var version = matches ? parseFloat(matches[1]) : null;
    } catch (e) {}

    return {
        full:      ua,
        name:      key + (version ? " " + version.toString() : ""),
        version:   version,
        isFirefox: (key == "firefox"),
        isChrome:  (key == "chrome"),
        isSafari:  (key == "safari"),
        isOpera:   (key == "opera"),
        isIE:      (key == "ie"),
        hasCanvas: (document.createElement('canvas').getContext),
        hasAudio:  (typeof(Audio) != 'undefined')
    };
};
