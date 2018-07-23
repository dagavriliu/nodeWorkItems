import {
    HelperService
} from './HelperService';
const hs = new HelperService();

export function VssServiceHttpBuilder(q, http, collectionUrl, projectName, accessToken) {
    var $q = q;
    var $http = http;
    var url = collectionUrl + projectName;
    var token = accessToken;

    var headers = {
        'Authorization': 'Basic ' + btoa("" + ":" + accessToken)
    };
    var fieldMap = {
        'sprint': 'System.IterationPath',
        'assignedTo': 'System.AssignedTo',
        'status': 'System.State',
        'closedDate': 'Microsoft.VSTS.Common.ClosedDate',
        'createdDate': 'System.CreatedDate',
        'title': 'System.Title'
    };
    var itemTypeMap = {
        'Product Backlog Item': 'story',
        'Bug': 'bug',
        'Task': 'task',
    };
    var fieldMapKeys = Object.keys(fieldMap);
    var fieldMapValues = Object.keys(fieldMap).map(k => fieldMap[k]);
    var self = this;

    this.mapItem = function (item) {

        var model = {
            id: '' + item.id
        };
        var sp = (item.fields['Microsoft.VSTS.Common.Severity'] || '').split('-');
        model.severity = (sp && sp.length > 1) ? (sp[1] || '').trim().toLowerCase() : '';
        model.effort = parseInt(item.fields['Microsoft.VSTS.Scheduling.Effort']) || 0;
        model.sprint = item.fields['System.IterationPath'];
        model.assignedTo = item.fields['System.AssignedTo'] || '';
        if (model.assignedTo) {
            model.assignedTo = model.assignedTo.substr(0, model.assignedTo.indexOf('<')).trim();
        }

        model.status = item['System.State'];
        model.closedDate = new Date(item.fields['Microsoft.VSTS.Common.ClosedDate']);
        model.createdDate = new Date(item.fields['System.CreatedDate']);
        model.title = item.fields['System.Title'];

        model.type = itemTypeMap[item.fields['System.WorkItemType']];

        if (model.title.toLowerCase().startsWith('sprint ')) {
            model.type = 'sprint';
        }

        model.sprint = model.sprint.substr(model.sprint.lastIndexOf('\\') + 1);
        model.viewUrl = url + '/_workitems/edit/' + model.id;

        model.parentIds = (item.relations || []).filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Reverse").map(rel => hs.getIdFromUri(rel.url))
        model.childrenIds = (item.relations || []).filter(relation => relation.rel == "System.LinkTypes.Hierarchy-Forward").map(rel => hs.getIdFromUri(rel.url))
        model.source = 'vss';
        return model;
    }

    var queryItems = function (query) {
        var deferred = $q.defer();
        $http(self.query(query)).then(function (r) {

            var ids = r.data.workItems.map(item => item.id);
            var httpOptions = [];
            hs.batchArray(ids, 50, function (batch) {
                var ho = self.getDetails(batch);
                if (!!ho) {
                    httpOptions.push(ho);
                }
            });
            hs.batchPromises($q, httpOptions, $http, {
                batchSize: 4,
                retry: false
            }, function (response) {
                var mapped = (response.data.value || []).map(self.mapItem);
                return mapped;
            }).then(deferred.resolve);
        });
        return deferred.promise;
    }
    this.getItems = function (query) {

        if (typeof (query) == 'string') {
            return queryItems(query);
        }
        if (query instanceof Array) {
            var d = $q.defer();

            $http(self.getDetails(query)).then(function (response) {
                var mapped = (response.data.value || []).map(self.mapItem);
                d.resolve(mapped);
            });
            return d.promise;
        }

    }

    this.query = function (query) {
        return {
            method: 'POST',
            url: url + '/_apis/wit/wiql?api-version=2.0',
            headers: headers,
            data: {
                Query: query
            }
        };
    };

    this.getDetails = function (itemIds) {
        var params = {
            'api-version': '2.0',
            'ids': (itemIds || []).filter(i => !!i).join(','),
            '$expand': 'all',
            //'fields': fieldMapValues.concat(['System.Links.LinkType']).join(',')
        };
        return {
            method: 'GET',
            url: collectionUrl + '/_apis/wit/workitems?' + hs.createQuery(params),
            headers: headers
        };
    };
}