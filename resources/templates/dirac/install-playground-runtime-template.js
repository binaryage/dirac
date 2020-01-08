(function (d, urls, after) {
  let require = function (url, f) {
    let s = d.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    if (f) {s.onload = f;}
    s.src = url;
    d.getElementsByTagName('head')[0].appendChild(s);
  };
  let next = function (rest) {
    let url = rest.shift();
    if (url) {
      require(url, function () {
        next(rest);
      });
    } else {
      if (after) after();
    }
  };
  next(urls);
})(document, [/*<URLS>*/], function() {
  /*<AFTER>*/
});
