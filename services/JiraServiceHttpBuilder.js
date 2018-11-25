import {
    HelperService
} from './HelperService';
const hs = new HelperService();

export function JiraServiceHttpBuilder(q, http, endpoint, username, password, proxyEndpoint) {
    const $q = q,
        $http = http;

    const headers = {
        'Authorization': 'Basic ' + btoa(username + ":" + password)
    }
    const url = proxyEndpoint || endpoint;
    const fieldMap = {
        'sprint': 'System.IterationPath',
        'type': 'System.WorkItemType',
        'assignedTo': 'System.AssignedTo',
        'status': 'System.State',
        'closedDate': 'Microsoft.VSTS.Common.ClosedDate',
        'createdDate': 'System.CreatedDate',
        'title': 'System.Title'
    };
    var self = this;

    this.mapItem = function(item) {
        var model = {
            id: item.key,
        };
        var f = item.fields;
        if (!item.fields) {
            return model;
        }

        var sprint = f.customfield_10007 ? f.customfield_10007[0] : null;
        var sprintObj = {};
        var parts = /\[(.*)\]/.exec(sprint);
        if (parts && parts.length > 1)
            parts[1].split(',').map(part => sprintObj[part.split('=')[0]] = part.split('=')[1]);
        model.sprint = (sprintObj.name || '').replace('DEV ', '');
        model.type = (f.issuetype ? f.issuetype.name : '').toLowerCase();
        model.assignedTo = f.assignee ? f.assignee.displayName : '';
        if ((model.assignedTo || '').toLowerCase().indexOf('gavriliu') > -1) {
            model.assignedTo = 'Dan Gavriliu';
        }
        model.status = (f.status ? f.status.name : '').toLowerCase();
        model.closedDate = new Date(f.resolutiondate);
        model.createdDate = new Date(f.created);
        model.title = f.summary;
        model.parentIds = f.parent ? [f.parent.key] : [];
        model.childrenIds = f.subtasks ? f.subtasks.map(t => t.key) : [];
        model.viewUrl = endpoint + '/browse/' + model.id;
        model.severity = item.fields.priority.name.toLowerCase();
        model.effort = item.fields.customfield_10005;
        model.source = 'jira';
        return model;
    };

    this.getItems = function(query) {
        const deferred = $q.defer();

        $http(self.query(query)).then(function handleSuccess(result) {
            let skip = 0,
                take = 50,
                total = result.data.total;
            let httpOptions = [];
            let issues = result.data.issues.map(self.mapItem);
            while (skip + take <= total) {
                skip += take;
                httpOptions.push(self.query(query, skip, take));
            }
            hs.batchPromises($q, httpOptions, $http, {
                batchSize: 5
            }, function(response) {
                var mapped = response.data.issues.map(self.mapItem);
                return mapped;
            }).then(function(items) {
                var result = issues.concat(items);
                deferred.resolve(result);
            });
        }, function handleError(response) {
            console.error(response);
        });

        return deferred.promise;
    };
    this.item = function(id) {
        return {
            method: 'GET',
            url: url + '/rest/api/2/issue/' + id,
            headers: headers
        }
    }

    this.query = function(query, skip, take) {
        var params = {
            jql: query,
            startAt: skip || 0,
            maxResults: take || 50,
            fields: '*all'
        }
        return {
            method: 'GET',
            url: url + '/rest/api/2/search?' + hs.createQuery(params),
            headers: headers
        }
    }
}