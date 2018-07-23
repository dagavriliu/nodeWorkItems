JSON.stringifyOnce = function (obj, replacer, indent) {
    var printedObjects = [];
    var printedObjectKeys = [];

    function printOnceReplacer(key, value) {
        if (printedObjects.length > 20000) {
            // browsers will not print more than 20K, I don't see the point to allow 2K.. algorithm will not be fast anyway if we have too many objects
            return 'object too long';
        }
        var printedObjIndex = false;
        printedObjects.forEach(function (obj, index) {
            if (obj === value) {
                printedObjIndex = index;
            }
        });

        if (key == '') {
            //root element
            printedObjects.push(obj);
            printedObjectKeys.push("root");
            return value;
        } else if (printedObjIndex + "" != "false" && typeof (value) == "object") {
            if (printedObjectKeys[printedObjIndex] == "root") {
                return "(pointer to root)";
            } else {
                return "(see " + ((!!value && !!value.constructor) ? value.constructor.name.toLowerCase() : typeof (value)) + " with key " + printedObjectKeys[printedObjIndex] + ")";
            }
        } else {

            var qualifiedKey = key || "(empty key)";
            printedObjects.push(value);
            printedObjectKeys.push(qualifiedKey);
            if (replacer) {
                return replacer(key, value);
            } else {
                return value;
            }
        }
    }
    return JSON.stringify(obj, printOnceReplacer, indent);
};

export class HelperService {

    arrayUnion(a, b) {
        return a.concat(b.filter(item => a.indexOf(item) < 0));
    }

    batchArray(array, size, fn) {
        var arr = array || [];
        var idx = 0;
        do {
            var subarr = arr.slice(idx, idx + size);
            idx += size;
            fn(subarr);
        } while (idx < array.length)
    }

    groupByFn(xs, groupKeyFn) {
        return xs.reduce(function (rv, x) {
            var value = groupKeyFn(x);
            if (!!value && !!x) {
                (rv[value] = rv[value] || []).push(x);
            }
            return rv;
        }, {});
    }

    batchPromises($q, items, fn, options, filter) {
        var results = [];
        var index = (options.batchSize - 1);
        var _filter = filter || function (item) {
            return item;
        };

        function getNextItem() {
            index++;
            if (items.length > index) {
                var nextItem = items[index];
                return getCurrentItem(nextItem);
            }
        }

        function getCurrentItem(item) {
            return fn(item).then(function (result) {
                var filtered = _filter(result);
                if (filtered) {
                    if (filtered instanceof Array) {
                        results = results.concat(filtered);
                    } else {
                        results.push(filtered);
                    }

                }
                return getNextItem();
            }).catch(function (data) {
                console.error(data);
                return options.retry ? getCurrentItem(item) : getNextItem();
            });
        };
        var promises = items.slice(0, options.batchSize).map(function (item) {
            return getCurrentItem(item);
        });
        return $q.all(promises).then(function () {
            return results;
        });
    }

    getIdFromUri(uri) {
        return parseInt(uri.substr(uri.lastIndexOf('/') + 1));
    }

    createQuery(obj) {
        return Object.keys(obj).filter(k => !!k && !!obj[k]).map(k => k + '=' + obj[k]).join('&');
    }
}