module.exports = function(base) {
    function F() {};
    F.prototype = base;
    return new F();
};
