const angular = require('angular');

export function getGroupKeysByFn(items, groupKeyFn) {
    var keyMap = {};
    var addToMap = function(item) {
        var itemKey = groupKeyFn(item);
        if (!!itemKey) {
            keyMap[itemKey] = itemKey;
        }
    }
    items.forEach(function(item) {
        addToMap(item);
        if (item.children && item.children.length > 0) {
            item.children.forEach(addToMap);
        }
    });
    return keyMap;
}

export function groupPerSprint(items) {
    var keyMap = getGroupKeysByFn(items, item => item.sprint);
    var perSprintHierarchical = Object.keys(keyMap).map(function(sprintKey) {
        var entry = {
            key: sprintKey,
            values: angular.copy(items.filter(item => item.sprint == sprintKey || item.children.some(child => child.sprint == sprintKey))),
            stats: {
                codeReviews: [],
                taskCount: 0,
                totalEffort: 0
            }
        };
        entry.stats.taskCount = entry.values.length;
        entry.stats.totalEffort = entry.values.reduce((a, i) => a + (parseInt(i.effort) || 0), 0);
        return entry;
    });
    return perSprintHierarchical;
}

export function groupPerUser(items) {

    var keyMap = getGroupKeysByFn(items, item => item.assignedTo);

    var perUserHierarchical = Object.keys(keyMap).map(function(key) {
        var entry = {
            key: key,
            values: angular.copy(items.filter(item => item.assignedTo == key || item.children.some(child => child.assignedTo == key))),
            stats: {
                codeReviews: [],
                taskCount: 0,
                totalEffort: 0,
                activeEffort: 0
            }
        };
        entry.values.forEach(function(item) {
            var cr = item.children.filter(c => c.assignedTo == key && c.title.toLowerCase().indexOf('code review') > -1);
            if (cr.length > 0) {
                entry.stats.codeReviews.push(item);
                item.onlyCodeReview = true;
            } else {
                entry.stats.activeEffort += parseInt(item.effort) || 0;
            }
            entry.stats.totalEffort += parseInt(item.effort) || 0;
        });
        entry.stats.taskCount = entry.values.reduce((acc, item) => acc + item.children.filter(c => c.assignedTo == entry.key).length, 1);

        return entry;
    });
    return perUserHierarchical;
}