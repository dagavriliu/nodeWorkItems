export function LocalCache(cacheKey) {
    var _cacheKey = cacheKey;

    function k(key) {
        return _cacheKey + key;
    };
    this.get = function (key) {
        return JSON.parse(window.localStorage.getItem(k(key)));
    };
    this.set = function (key, value) {
        return window.localStorage.setItem(k(key), JSON.stringify(value));
    };
    this.del = function (key) {
        return window.localStorage.removeItem(k(key));
    }
}