export function toggleSet(items: any[], propertyName: string, stateHolder: any, stateHolderProperty: string) {
  stateHolder[stateHolderProperty] = !!!stateHolder[stateHolderProperty];
  items.forEach(item => (item[propertyName] = stateHolder[stateHolderProperty]));
}

export function stringifyOnce(obj: any, replacer: any, indent?: string | number) {
  let printedObjects: any[] = [];
  let printedObjectKeys: any[] = [];

  function printOnceReplacer(key: any, value: any) {
    if (printedObjects.length > 20000) {
      // browsers will not print more than 20K, I don't see the point to allow 2K.. algorithm will not be fast anyway if we have too many objects
      return "object too long";
    }
    let printedObjIndex: any = false;
    printedObjects.forEach(function(obj, index) {
      if (obj === value) {
        printedObjIndex = index;
      }
    });

    if (key == "") {
      //root element
      printedObjects.push(obj);
      printedObjectKeys.push("root");
      return value;
    } else if (printedObjIndex + "" != "false" && typeof value == "object") {
      if (printedObjectKeys[printedObjIndex] == "root") {
        return "(pointer to root)";
      } else {
        return (
          "(see " +
          (!!value && !!value.constructor ? value.constructor.name.toLowerCase() : typeof value) +
          " with key " +
          printedObjectKeys[printedObjIndex] +
          ")"
        );
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
}

export class HelperService {
  arrayUnion(a: any[], b: any[]) {
    return a.concat(b.filter(item => a.indexOf(item) < 0));
  }

  batchArray(array: any[], size: number, fn: any) {
    var arr = array || [];
    var idx = 0;
    do {
      var subarr = arr.slice(idx, idx + size);
      idx += size;
      fn(subarr);
    } while (idx < array.length);
  }

  groupByFn(xs: any, groupKeyFn: any) {
    return xs.reduce(function(rv: any, x: any) {
      var value = groupKeyFn(x);
      if (!!value && !!x) {
        (rv[value] = rv[value] || []).push(x);
      }
      return rv;
    }, {});
  }

  batchPromises<T>($q: ng.IQService, items: T[], fn: (p: T) => Promise<T>, options: any, filter: any) {
    const batched: any[] = [];
    let index = options.batchSize - 1;
    let _filter = filter || ((item: any) => item);

    function getNextItem() {
      index++;
      if (items.length > index) {
        var nextItem = items[index];
        return getCurrentItem(nextItem);
      }
    }
    function getCurrentItem(item: any): Promise<any> {
      return fn(item)
        .then(function(result) {
          const filtered = _filter(result);
          if (filtered) {
            if (filtered instanceof Array) {
              filtered.forEach(batched.push);
            } else {
              batched.push(filtered);
            }
          }
          return getNextItem();
        })
        .catch(function(data) {
          console.error(data);
          return options.retry ? getCurrentItem(item) : getNextItem();
        });
    }
    var promises = items.slice(0, options.batchSize).map(function(item) {
      return getCurrentItem(item);
    });
    return $q.all(promises).then(function() {
      return batched;
    });
  }

  getIdFromUri(uri: string): number {
    return parseInt(uri.substr(uri.lastIndexOf("/") + 1));
  }

  createQuery(obj: any): string {
    return Object.keys(obj)
      .filter(k => !!k && !!obj[k])
      .map(k => k + "=" + obj[k])
      .join("&");
  }
}
