module.exports.getQueryStringAsObject = function() {
    const result = {}
    const nestedArray = window.location.search.substr(1)
        .split('&')
        .map(item => item.split('='))
        .forEach(item => {
            result[item[0]] = item[1]
        })
    return result
}
