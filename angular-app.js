import angular from 'angular';

import {
    VssServiceHttpBuilder
} from './VssServiceHttpBuilder';
import {
    JiraServiceHttpBuilder
} from './JiraServiceHttpBuilder';
import {
    LocalCache
} from './LocalCache'

import {
    HelperService
} from './HelperService';
const hs = new HelperService();


const WorkItemSchema = require('./WorkItemSchema.json');
const Ajv = require('ajv');
// require('./helpers');

const app = angular.module('workItemApp', ['ui.select', 'ui.grid']);
const vssOptions = require("./config/VssOptions.json");
const jiraOptions = require("./config/JiraOptions.json");


app.controller('WorkItemController', ['$q', '$scope', '$http', function ($q, $scope, $http) {

    var controller = this;
    controller.view = {
        ui: {
            showPerUser: true,
            showAll: false
        }
    };
    var jiraBuilder = new JiraServiceHttpBuilder($q, $http, jiraOptions.endpoint, jiraOptions.username, jiraOptions.password, jiraOptions.proxyEndpoint);
    var vssBuilder = new VssServiceHttpBuilder($q, $http, vssOptions.CollectionUrl, vssOptions.ProjectName, vssOptions.PersonalAccessToken);
    var ajv = new Ajv();
    var validator = ajv.compile(WorkItemSchema);
    const defaultJsonFilename = 'cachedWorkItems.json';

    function updateController(items) {

        controller._raw = angular.copy(items);
        controller.view.workItems = processResults(items);
        controller.view.perUser = groupPerUser(controller.view.workItems);
        controller.view.perSprint = groupPerSprint(controller.view.workItems);
        controller.view.users = controller.view.perUser.map(item => item.key);
    }

    this.view.cachedJsonPath = defaultJsonFilename;

    this.saveJson = function () {
        $http.post('/upload/' + controller.view.cachedJsonPath, controller._raw).then(function (response) {
            console.log('upload complete');
        });
    }

    this.view.cachedViewPath = 'cachedView.json';

    this.loadJson = function () {
        $http.get('/upload/' + controller.view.cachedJsonPath).then(function (r) {
            updateController(r.data);
        })
    }
    controller.loadJson();

    this.toggleSet = function (items, propertyName, stateHolder, stateHolderProperty) {
        stateHolder[stateHolderProperty] = !!!stateHolder[stateHolderProperty];
        items.forEach(item => item[propertyName] = stateHolder[stateHolderProperty]);
    }

    this.runLiveQueries = function () {
        var jiraQuery = "sprint in ('DEV Sprint 133','DEV Sprint 134','DEV Sprint 135','DEV Sprint 136','DEV Sprint 137', 'DEV Sprint 138', 'DEV Sprint 139', 'DEV Sprint 140') and project = DEV ORDER BY created ASC";
        // jiraQuery = "sprint in ('DEV Sprint 134') and project = DEV ORDER BY created ASC";

        //         var vssQuery = `
        //             SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags] 
        //             FROM WorkItems 
        //             WHERE 
        //                 [System.TeamProject] = @project
        //                 and [System.WorkItemType] <> ''
        //                 and [System.State] <> ''
        //                 and ( [System.IterationPath] in ('Splintt\\Release 1\\Sprint 125') ) 
        //             ORDER BY [System.Id]`;
        var vssQuery = `
            SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags] 
            FROM WorkItems 
            WHERE 
                [System.TeamProject] = @project
                AND [System.WorkItemType] <> ''
                AND [System.State] IN ('Done', 'Completed')
                AND (
                        (   [System.CreatedDate] >= '2017-04-17T00:00:00.0000000' 
                            AND [Microsoft.VSTS.Common.ClosedDate] <= '2017-08-08T00:00:00.0000000'
                        )
                    OR
                        [System.IterationPath] IN ('Splintt\\Release 1\\Sprint 120','Splintt\\Release 1\\Sprint 121','Splintt\\Release 1\\Sprint 122','Splintt\\Release 1\\Sprint 123','Splintt\\Release 1\\Sprint 124','Splintt\\Release 1\\Sprint 125','Splintt\\Release 1\\Sprint 126','Splintt\\Release 1\\Sprint 127','Splintt\\Release 1\\Sprint 128','Splintt\\Release 1\\Sprint 129','Splintt\\Release 1\\Sprint 130','Splintt\\Release 1\\Sprint 131','Splintt\\Release 1\\Sprint 132')
                    )
            ORDER BY [System.Id]`;

        // var asd = "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[System.Tags] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] <> '' AND [System.State] <> '' ";

        controller.view.workItems = [];
        controller.view.perUser = [];

        function applyOnBatch(mapFn) {
            return function (batch) {
                var mappedBatch = batch.map(mapFn);
                var processed = processResults(mappedBatch);
                updateController(processed.concat(controller.view.workItems || []));
            }
        }

        $q.all([jiraBuilder.getItems(jiraQuery), vssBuilder.getItems(vssQuery)]).then(function (results) {
            var mappedItems = results[0].concat(results[1]);
            updateController(mappedItems);
        });

    }

    var subitemTypes = ["bug sub-task", "code review", "sub-task", "task", "test task"];
    var itemTypes = ["bug", "story"];

    function processResults(items, mapItem) {

        items.forEach(item => !validator(item) ? console.log(validator.errors) : null);

        //var localItems = items.filter(item=>['deleted', 'removed'].indexOf((item.status || '').toLowerCase()) < 0);
        var parentIdMap = {};
        var localItems = items;
        localItems.forEach(function (item) {
            item.children = localItems.filter(c => item.childrenIds.indexOf(c.id) > -1);
            item.parents = localItems.filter(p => item.parentIds.indexOf(p.id) > -1);
            item.parentIds.forEach(id => parentIdMap[id] = id);
        });
        var parents = localItems.filter(item => itemTypes.indexOf(item.type) > -1);

        return parents;
    }

    function getGroupKeysByFn(items, groupKeyFn) {
        var keyMap = {};
        var addToMap = function (item) {
            var itemKey = groupKeyFn(item);
            if (!!itemKey) {
                keyMap[itemKey] = itemKey;
            }
        }
        items.forEach(function (item) {
            addToMap(item);
            if (item.children && item.children.length > 0) {
                item.children.forEach(addToMap);
            }
        });
        return keyMap;
    }

    function groupPerSprint(items) {
        var keyMap = getGroupKeysByFn(items, item => item.sprint);
        var perSprintHierarchical = Object.keys(keyMap).map(function (sprintKey) {
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


    function groupPerUser(items) {

        var keyMap = getGroupKeysByFn(items, item => item.assignedTo);

        var perUserHierarchical = Object.keys(keyMap).map(function (key) {
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
            entry.values.forEach(function (item) {
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
}]);
app.directive('workItemDetails', function () {
    return {
        scope: {
            item: '=',
            users: '=',
            highlight: '='
        },
        restrict: 'E',
        templateUrl: 'workitem-partial.html',
        link: function ($scope, $element, $attrs) {
            Object.keys($scope.item).forEach(p => !!$scope.highlight && $scope.highlight.hasOwnProperty[p] ? $scop.highlight[p] = $scope.item[p] : null);
        }
    }
})
app.filter('groupBy', ['$parse', function ($parse) {
    /// https://stackoverflow.com/questions/19992090/angularjs-group-by-directive-without-external-dependencies#20645945
    return function (list, group_by) {

        var filtered = [];
        var prev_item = null;
        var group_changed = false;
        // this is a new field which is added to each item where we append "_CHANGED"
        // to indicate a field change in the list
        //was var new_field = group_by + '_CHANGED'; - JB 12/17/2013
        var new_field = 'group_by_CHANGED';

        // loop through each item in the list
        angular.forEach(list, function (item) {

            group_changed = false;

            // if not the first item
            if (prev_item !== null) {

                // check if any of the group by field changed

                //force group_by into Array
                group_by = angular.isArray(group_by) ? group_by : [group_by];

                //check each group by parameter
                for (var i = 0, len = group_by.length; i < len; i++) {
                    let parsedPrev = $parse(group_by[i])(prev_item);
                    let parsedItem = $parse(group_by[i])(item);
                    if (parsedPrev !== parsedItem) {
                        group_changed = true;
                    }
                }

            } // otherwise we have the first item in the list which is new
            else {
                group_changed = true;
            }

            // if the group changed, then add a new field to the item
            // to indicate this
            if (group_changed) {
                item[new_field] = true;
            } else {
                item[new_field] = false;
            }

            filtered.push(item);
            prev_item = item;

        });

        return filtered;
    };
}]);