module.exports = function(base) {
    var instance = Object.create(base);
    if (instance.initialize)
        instance.initialize.apply(instance, [].slice.call(arguments, 1));
    return instance;
};
