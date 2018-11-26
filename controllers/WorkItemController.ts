import * as angular from "angular";
import { app } from "../app";

import { JiraOptionsModel } from "./../models/JiraOptionsModel";
import { TfsOptionsModel } from "../models/TfsOptionsModel";

import { JiraServiceHttpBuilder } from "../services/JiraServiceHttpBuilder";
import { VssServiceHttpBuilder } from "../services/VssServiceHttpBuilder";
import * as WorkItemHelpers from "../services/WorkItemService";
import * as Helpers from "../services/HelperService";
import { AggregateModel } from "../models/AggregateModel";

const vssOptions: TfsOptionsModel = require("../config/VssOptions.json");
const jiraOptions: JiraOptionsModel = require("../config/JiraOptions.json");

class WorkItemController {
  private $q;
  private $http;
  private jiraBuilder: JiraServiceHttpBuilder;
  private vssBuilder: VssServiceHttpBuilder;
  public model?: AggregateModel;
  public view: any;
  constructor($q: ng.IQService, $scope: ng.IScope, $http: ng.IHttpService) {
    this.$q = $q;
    this.$http = $http;
    this.jiraBuilder = new JiraServiceHttpBuilder($q, $http, jiraOptions);
    this.vssBuilder = new VssServiceHttpBuilder($q, $http, vssOptions);
    const defaultJsonFilename = "cachedWorkItems.json";
    this.view = {
      cachedJsonPath: defaultJsonFilename,
      cachedViewPath: "cachedView.json"
    };
    this.loadJson();
  }
  saveJson() {
    if (this.model) {
      // const json = Helpers.stringifyOnce(this.model.raw);
      const json = this.model.raw;
      this.$http.post("/upload/" + this.view.cachedJsonPath, json).then(function(response) {
        console.log("upload complete");
      });
    }
  }
  loadJson() {
    const self = this;
    this.$http.get("/upload/" + this.view.cachedJsonPath).then(function(r) {
      self.updateController(r.data);
    });
  }
  toggleSet = Helpers.toggleSet;
  runLiveQueries() {
    const self = this;
    let jiraQuery = jiraOptions.defaultQueryLines.join(" ");
    let vssQuery = vssOptions.defaultQueryLines.join(" ");
    vssQuery = `
    SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags]
    FROM WorkItems 
    WHERE 
    [System.TeamProject] = @project
    AND [System.WorkItemType] <> ''
    AND [System.State] IN ('Done', 'Completed')
    AND (
           (   [System.CreatedDate] >= '2018-11-17T00:00:00.0000000'
               AND
               [Microsoft.VSTS.Common.ClosedDate] <= '2018-11-30T00:00:00.0000000' 
           )
    )
    ORDER BY [System.Id]`;

    this.$q
      .all([
        this.jiraBuilder.getItems(jiraQuery)
        // this.vssBuilder.getItems(vssQuery)
      ])
      .then(function(results) {
        var agg = results.reduce((a: [], i: []) => a.concat(i), []);
        self.updateController(agg);
      });
  }
  private updateController(items: any) {
    this.model = WorkItemHelpers.aggregateItems(items);
  }
}
app.controller("WorkItemController", ["$q", "$scope", "$http", WorkItemController]);
