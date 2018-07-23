# node work item aggregator

## configuration file format:

- JIRA options:

```
{
    "endpoint": "https://jira-endpoint.net",
    "username": "<username>",
    "password": "<password>",
    "proxyEndpoint": "http://localhost:8080/proxy"
}
```

- VSS options:
```
{
    "CollectionUrl": "https://tfs-site.net/tfs/DefaultCollection/",
    "ProjectName": "<SomeProject>",
    "PersonalAccessToken": "<AccessToken>",
    "EditItemUriFormat": "https://tfs-site.net/tfs/DefaultCollection/<SomeProject>/_workitems/edit/{0}",
    "ProjectId": "<some_guid>",
    "WorkItemQuery": "\r\nSELECT \r\n    [System.Id], \r\n    [System.WorkItemType], \r\n    [System.Title], \r\n    [System.AssignedTo], \r\n    [System.State], \r\n    [System.Tags] \r\nFROM \r\n    WorkItems \r\nWHERE   \r\n    (\r\n        [System.TeamProject] = @project \r\n        and [System.WorkItemType] IN ('Product Backlog Item', 'Bug', 'Task')\r\n        and [System.State] <> '' \r\n        and [System.IterationPath] in ('Sprint 119', 'Sprint 120', 'Sprint 121', 'Sprint 122', 'Sprint 123', 'Sprint 124', 'Sprint 125', 'Sprint 126', 'Sprint 127', 'Sprint 128', 'Sprint 129', 'Sprint 130', 'Sprint 131', 'Sprint 132', 'Sprint 133')\r\n    )\r\n    ORDER BY[System.Id]\r\n"
}
```

## local run `npm install && npm start`

## local dev `npm install && npm run serve`