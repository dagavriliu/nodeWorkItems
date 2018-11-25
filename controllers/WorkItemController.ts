import { JiraOptionsModel } from "./../model/JiraOptionsModel";
import * as angular from "angular";
import { app } from "../app";
import { JiraServiceHttpBuilder } from "../services/JiraServiceHttpBuilder";
import { VssServiceHttpBuilder } from "../services/VssServiceHttpBuilder";
import * as WorkItemHelpers from "../services/WorkItemService";
import * as Helpers from "../services/HelperService";

const vssOptions = require("../config/VssOptions.json");
const jiraOptions: JiraOptionsModel = require("../config/JiraOptions.json");

app.controller("WorkItemController", [
  "$q",
  "$scope",
  "$http",
  function($q: ng.IQService, $scope: ng.IScope, $http: ng.IHttpService) {
    var controller = this;
    controller.view = {
      ui: {
        showPerUser: true,
        showAll: false
      }
    };
    var jiraBuilder = new JiraServiceHttpBuilder($q, $http, jiraOptions);
    var vssBuilder = new VssServiceHttpBuilder($q, $http, vssOptions.CollectionUrl, vssOptions.ProjectName, vssOptions.PersonalAccessToken);
    const defaultJsonFilename = "cachedWorkItems.json";

    this.view.cachedJsonPath = defaultJsonFilename;

    this.saveJson = function() {
      $http.post("/upload/" + controller.view.cachedJsonPath, controller._raw).then(function(response) {
        console.log("upload complete");
      });
    };

    this.view.cachedViewPath = "cachedView.json";

    this.loadJson = function() {
      $http.get("/upload/" + controller.view.cachedJsonPath).then(function(r) {
        updateController(r.data);
      });
    };
    controller.loadJson();

    this.toggleSet = Helpers.toggleSet;

    this.runLiveQueries = function() {
      var jiraQuery = jiraOptions.defaultQueryLines.join(" ");
      var vssQuery = vssOptions.defaultQueryLines.join(" ");

      $q.all([
        jiraBuilder.getItems(jiraQuery)
        // vssBuilder.getItems(vssQuery)
      ]).then(function(results) {
        var agg = results.reduce((a: [], i: []) => a.concat(i), []);
        updateController(agg);
      });
    };

    function updateController(items: any) {
      controller._raw = angular.copy(items);
      controller.view = WorkItemHelpers.aggregateItems(items);
    }
  }
]);
