import { HelperService } from "./HelperService";
import { IQService, IHttpService } from "../node_modules/@types/angular/index";
import { TfsOptionsModel } from "../model/TfsOptionsModel";
import { WorkItemModel } from "../model/WorkItemModel";
const hs = new HelperService();

const fieldMap = {
  sprint: "System.IterationPath",
  assignedTo: "System.AssignedTo",
  status: "System.State",
  closedDate: "Microsoft.VSTS.Common.ClosedDate",
  createdDate: "System.CreatedDate",
  title: "System.Title"
};
const itemTypeMap = {
  "Product Backlog Item": "story",
  Bug: "bug",
  Task: "task"
};
const fieldMapKeys = Object.keys(fieldMap);
const fieldMapValues = Object.keys(fieldMap).map(k => fieldMap[k]);

function mapVssItem(item: any) {
  let model = new WorkItemModel();
  model.id = "" + item.id;
  var sp = (item.fields["Microsoft.VSTS.Common.Severity"] || "").split("-");
  model.severity = sp && sp.length > 1 ? (sp[1] || "").trim().toLowerCase() : "";
  model.effort = "" + (parseInt(item.fields["Microsoft.VSTS.Scheduling.Effort"]) || 0);
  model.sprint = item.fields["System.IterationPath"];
  model.assignedTo = item.fields["System.AssignedTo"] || "";
  if (model.assignedTo) {
    model.assignedTo = model.assignedTo.substr(0, model.assignedTo.indexOf("<")).trim();
  }

  model.status = item["System.State"];
  model.closedDate = new Date(item.fields["Microsoft.VSTS.Common.ClosedDate"]);
  model.createdDate = new Date(item.fields["System.CreatedDate"]);
  model.title = item.fields["System.Title"];

  model.type = itemTypeMap[item.fields["System.WorkItemType"]];

  if (model.title.toLowerCase().indexOf("sprint ") == 0) {
    model.type = "sprint";
  }

  model.sprint = model.sprint.substr(model.sprint.lastIndexOf("\\") + 1);
  model.viewUrl = this.url + "/_workitems/edit/" + model.id;

  model.parentIds = (item.relations || [])
    .filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Reverse")
    .map(rel => hs.getIdFromUri(rel.url));
  model.childrenIds = (item.relations || [])
    .filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Forward")
    .map(rel => hs.getIdFromUri(rel.url));
  model.source = "vss";
  return model;
}

export class VssServiceHttpBuilder {
  private url: string;
  private headers: any;

  constructor(public $q: IQService, public $http: IHttpService, public options: TfsOptionsModel) {
    this.url = this.options.CollectionUrl + this.options.ProjectName;
    this.headers = {
      Authorization: "Basic " + btoa("" + ":" + this.options.PersonalAccessToken)
    };
  }

  mapItem(item) {
    return mapVssItem(item);
  }

  queryItems(query) {
    var deferred = this.$q.defer();
    this.$http(this.query(query)).then(function(r: any) {
      var ids = r.data.workItems.map(item => item.id);
      var httpOptions = [];
      hs.batchArray(ids, 50, function(batch) {
        var ho = this.getDetails(batch);
        if (!!ho) {
          httpOptions.push(ho);
        }
      });
      hs.batchPromises(
        this.$q,
        httpOptions,
        this.$http,
        {
          batchSize: 4,
          retry: false
        },
        function(response) {
          var mapped = (response.data.value || []).map(mapVssItem);
          return mapped;
        }
      ).then(deferred.resolve);
    });
    return deferred.promise;
  }
  getItems(query) {
    if (typeof query == "string") {
      return this.queryItems(query);
    }
    if (query instanceof Array) {
      const d = this.$q.defer();

      this.$http(this.getDetails(query)).then(function(response: any) {
        var mapped = (response.data.value || []).map(this.mapItem);
        d.resolve(mapped);
      });
      return d.promise;
    }
  }

  query(query) {
    return {
      method: "POST",
      url: this.url + "/_apis/wit/wiql?api-version=2.0",
      headers: this.headers,
      data: {
        Query: query
      }
    };
  }

  getDetails(itemIds) {
    var params = {
      "api-version": "2.0",
      ids: (itemIds || []).filter(i => !!i).join(","),
      $expand: "all"
    };
    return {
      method: "GET",
      url: this.options.CollectionUrl + "/_apis/wit/workitems?" + hs.createQuery(params),
      headers: this.headers
    };
  }
}
