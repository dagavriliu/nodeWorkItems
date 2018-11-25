import { JiraOptionsModel } from "./../model/JiraOptionsModel";
import { WorkItemModel } from "./../model/WorkItemModel";
import { HelperService } from "./HelperService";
const hs = new HelperService();
const fieldMap = {
  sprint: "System.IterationPath",
  type: "System.WorkItemType",
  assignedTo: "System.AssignedTo",
  status: "System.State",
  closedDate: "Microsoft.VSTS.Common.ClosedDate",
  createdDate: "System.CreatedDate",
  title: "System.Title"
};

export class JiraServiceHttpBuilder {
  private headers: any;
  private url: string;

  constructor(public $q: ng.IQService, public $http: ng.IHttpService, public options: JiraOptionsModel) {
    this.headers = {
      Authorization: "Basic " + btoa(this.options.username + ":" + this.options.password)
    };
    this.url = this.options.proxyEndpoint || this.options.endpoint;
  }

  mapItem(item: any) {
    let model = new WorkItemModel();
    model.id = item.key;
    if (!item.fields) {
      return model;
    }
    let f = item.fields;
    let sprint = f.customfield_10007 ? f.customfield_10007[0] : null;
    let sprintObj: any = {};
    let parts = /\[(.*)\]/.exec(sprint);
    if (parts && parts.length > 1) parts[1].split(",").map(part => (sprintObj[part.split("=")[0]] = part.split("=")[1]));
    model.sprint = (sprintObj.name || "").replace("DEV ", "");
    model.type = (f.issuetype ? f.issuetype.name : "").toLowerCase();
    model.assignedTo = f.assignee ? f.assignee.displayName : "";
    if ((model.assignedTo || "").toLowerCase().indexOf("gavriliu") > -1) {
      model.assignedTo = "Dan Gavriliu";
    }
    model.status = (f.status ? f.status.name : "").toLowerCase();
    model.closedDate = new Date(f.resolutiondate);
    model.createdDate = new Date(f.created);
    model.title = f.summary;
    model.parentIds = f.parent ? [f.parent.key] : [];
    model.childrenIds = f.subtasks ? f.subtasks.map((t: any) => t.key) : [];
    model.viewUrl = this.options.endpoint + "/browse/" + model.id;
    model.severity = item.fields.priority.name.toLowerCase();
    model.effort = item.fields.customfield_10005;
    model.source = "jira";
    return model;
  }

  getItems(query: string) {
    const deferred = this.$q.defer();

    this.$http(this.query(query)).then(
      function handleSuccess(result: any) {
        let skip = 0,
          take = 50,
          total = result.data.total;
        let httpOptions = [];
        let issues = result.data.issues.map(this.mapItem);
        while (skip + take <= total) {
          skip += take;
          httpOptions.push(this.query(query, skip, take));
        }
        hs.batchPromises(this.$q, httpOptions, this.$http, { batchSize: 5 }, function(response: any) {
          var mapped = response.data.issues.map(this.mapItem);
          return mapped;
        }).then(function(items) {
          var result = issues.concat(items);
          deferred.resolve(result);
        });
      },
      function handleError(response) {
        console.error(response);
      }
    );

    return deferred.promise;
  }
  item(id: string) {
    return {
      method: "GET",
      url: this.url + "/rest/api/2/issue/" + id,
      headers: this.headers
    };
  }

  query(query: string, skip: number = 0, take: number = 50) {
    var params = {
      jql: query,
      startAt: skip || 0,
      maxResults: take || 50,
      fields: "*all"
    };
    return {
      method: "GET",
      url: this.url + "/rest/api/2/search?" + hs.createQuery(params),
      headers: this.headers
    };
  }
}
