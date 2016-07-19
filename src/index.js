if (window.location.pathname.indexOf('controls') !== -1) {
    require('./controls')
} else {
    require('./bootstrap')
}
