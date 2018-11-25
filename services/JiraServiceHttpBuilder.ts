import { JiraOptionsModel } from "../models/JiraOptionsModel";
import { WorkItemModel } from "../models/WorkItemModel";
import { HelperService } from "./HelperService";
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
  private hs: HelperService;
  constructor(public $q: ng.IQService, public $http: ng.IHttpService, public options: JiraOptionsModel) {
    this.hs = new HelperService($q, $http);
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
    model.closedDate = "" + f.resolutiondate;
    model.createdDate = "" + f.created;
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
    const self = this;
    const deferred = self.$q.defer();

    self.$http(self.query(query)).then(
      function handleSuccess(result: any) {
        let skip = 0,
          take = 50,
          total = result.data.total;
        let configs: ng.IRequestConfig[] = [];
        let issues = result.data.issues.map(m => self.mapItem(m));
        while (skip + take <= total) {
          skip += take;
          configs.push(self.query(query, skip, take));
        }
        self.hs
          .batchPromises(configs, { batchSize: 5 }, function(response: any) {
            return response.data.issues.map(m => self.mapItem(m));
          })
          .then(items => deferred.resolve(issues.concat(items)));
      },
      function handleError(response) {
        console.error(response);
      }
    );

    return deferred.promise;
  }
  item(id: string): ng.IRequestConfig {
    return {
      method: "GET",
      url: this.url + "/rest/api/2/issue/" + id,
      headers: this.headers
    };
  }

  query(query: string, skip: number = 0, take: number = 50): ng.IRequestConfig {
    var params = {
      jql: query,
      startAt: skip || 0,
      maxResults: take || 50,
      fields: "*all"
    };
    return {
      method: "GET",
      url: this.url + "/rest/api/2/search?" + this.hs.createQuery(params),
      headers: this.headers
    };
  }
}
