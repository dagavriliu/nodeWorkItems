import { HelperService, parseDate } from "./HelperService";
import { IQService, IHttpService, IRequestConfig } from "../node_modules/@types/angular/index";
import { TfsOptionsModel } from "../models/TfsOptionsModel";
import { WorkItemModel } from "../models/WorkItemModel";

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

export class VssServiceHttpBuilder {
  private url: string;
  private headers: any;
  private hs: HelperService;

  constructor(public $q: IQService, public $http: IHttpService, public options: TfsOptionsModel) {
    this.url = this.options.CollectionUrl + this.options.ProjectName;
    this.hs = new HelperService($q, $http);
    this.headers = {
      Authorization: "Basic " + btoa("" + ":" + this.options.PersonalAccessToken)
    };
  }

  mapItem(item) {
    let model = new WorkItemModel();
    const self = this;
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
    model.closedDate = parseDate(item.fields["Microsoft.VSTS.Common.ClosedDate"]);
    model.createdDate = parseDate(item.fields["System.CreatedDate"]);
    model.title = item.fields["System.Title"];

    model.type = itemTypeMap[item.fields["System.WorkItemType"]];

    if (model.title.toLowerCase().indexOf("sprint ") == 0) {
      model.type = "sprint";
    }

    model.sprint = model.sprint.substr(model.sprint.lastIndexOf("\\") + 1);
    model.viewUrl = this.url + "/_workitems/edit/" + model.id;

    model.parentIds = (item.relations || [])
      .filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Reverse")
      .map(rel => this.hs.getIdFromUri(rel.url));
    model.childrenIds = (item.relations || [])
      .filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Forward")
      .map(rel => this.hs.getIdFromUri(rel.url));
    model.source = "vss";
    return model;
  }

  queryItems(query) {
    const self = this;
    let deferred = self.$q.defer();

    self.$http(self.query(query)).then(function(r: any) {
      let ids = r.data.workItems.map(item => item.id);
      let httpOptions: IRequestConfig[] = [];
      self.hs.batchArray(ids, 50, function(batch) {
        const ho = self.getDetails(batch);
        if (!!ho) {
          httpOptions.push(ho);
        }
      });
      self.hs
        .batchPromises(httpOptions, { batchSize: 4, retry: false }, function(response) {
          return (response.data.value || []).map(m => self.mapItem(m));
        })
        .then(deferred.resolve);
    });
    return deferred.promise;
  }
  getItems(query) {
    const self = this;
    if (typeof query == "string") {
      return self.queryItems(query);
    }
    if (query instanceof Array) {
      const d = self.$q.defer();

      self.$http(self.getDetails(query)).then(function(response: any) {
        const mapped = (response.data.value || []).map(m => self.mapItem(m));
        d.resolve(mapped);
      });
      return d.promise;
    }
    return null;
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

  getDetails(itemIds): ng.IRequestConfig {
    const query = this.hs.createQuery({
      "api-version": "2.0",
      ids: (itemIds || []).filter(i => !!i).join(","),
      $expand: "all"
    });
    return {
      method: "GET",
      url: this.options.CollectionUrl + "/_apis/wit/workitems?" + query,
      headers: this.headers
    };
  }
}
