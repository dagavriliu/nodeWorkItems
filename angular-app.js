import angular from 'angular';
import { VssServiceHttpBuilder } from './services/VssServiceHttpBuilder';
import { JiraServiceHttpBuilder } from './services/JiraServiceHttpBuilder';

import { HelperService } from './services/HelperService';
import * as WorkItemHelpers from './services/WorkItemService';
const hs = new HelperService();

const WorkItemSchema = require('./services/WorkItemSchema.json');
const Ajv = require('ajv');

export const app = angular.module('workItemApp', ['ui.select', 'ui.grid']);
const vssOptions = require("./config/VssOptions.json");
const jiraOptions = require("./config/JiraOptions.json");

export function toggleSet(items, propertyName, stateHolder, stateHolderProperty) {
    stateHolder[stateHolderProperty] = !!!stateHolder[stateHolderProperty];
    items.forEach(item => item[propertyName] = stateHolder[stateHolderProperty]);
}

app.controller('WorkItemController', ['$q', '$scope', '$http', function($q, $scope, $http) {

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
        controller.view.perUser = WorkItemHelpers.groupPerUser(controller.view.workItems);
        controller.view.perSprint = WorkItemHelpers.groupPerSprint(controller.view.workItems);
        controller.view.users = controller.view.perUser.map(item => item.key);
    }

    this.view.cachedJsonPath = defaultJsonFilename;

    this.saveJson = function() {
        $http.post('/upload/' + controller.view.cachedJsonPath, controller._raw).then(function(response) {
            console.log('upload complete');
        });
    }

    this.view.cachedViewPath = 'cachedView.json';

    this.loadJson = function() {
        $http.get('/upload/' + controller.view.cachedJsonPath).then(function(r) {
            updateController(r.data);
        })
    }
    controller.loadJson();

    this.toggleSet = toggleSet;

    this.runLiveQueries = function() {
        var jiraQuery = "sprint in ('DEV Sprint 144', 'DEV Sprint 145', 'DEV Sprint 146', 'DEV Sprint 147', 'DEV Sprint 148', 'DEV Sprint 149', 'DEV Sprint 150', 'DEV Sprint 151', 'DEV Sprint 152', 'DEV Sprint 153', 'DEV Sprint 154', 'DEV Sprint 155', 'DEV Sprint 156', 'DEV Sprint 157', 'DEV Sprint 158', 'DEV Sprint 159', 'DEV Sprint 160', 'DEV Sprint 161', 'DEV Sprint 162', 'DEV Sprint 163', 'DEV Sprint 164', 'DEV Sprint 165') and project = DEV ORDER BY created ASC";
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

        $q.all([
            jiraBuilder.getItems(jiraQuery),
            // vssBuilder.getItems(vssQuery)
        ]).then(function(results) {
            var agg = results.reduce((a, i) => a.concat(i), []);
            updateController(agg);
        });
    }

    var subitemTypes = ["bug sub-task", "code review", "sub-task", "task", "test task"];
    var itemTypes = ["bug", "story"];

    function processResults(items, mapItem) {

        items.forEach(item => !validator(item) ? console.log(validator.errors) : null);

        //var localItems = items.filter(item=>['deleted', 'removed'].indexOf((item.status || '').toLowerCase()) < 0);
        var parentIdMap = {};
        var localItems = items;
        localItems.forEach(function(item) {
            item.children = localItems.filter(c => item.childrenIds.indexOf(c.id) > -1);
            item.parents = localItems.filter(p => item.parentIds.indexOf(p.id) > -1);
            item.parentIds.forEach(id => parentIdMap[id] = id);
        });
        var parents = localItems.filter(item => itemTypes.indexOf(item.type) > -1);

        return parents;
    }




}]);