const angular = require("angular");
const Ajv = require("ajv");

import { WorkItemModel } from "../models/WorkItemModel";
import { WorkItemGroupStatistics } from "../models/WorkItemGroupStatistics";
import { WorkItemGroup } from "../models/WorkItemGroup";
import { AggregateModel } from "../models/AggregateModel";

const WorkItemSchema = require("./WorkItemSchema.json");
const ajv = new Ajv();
const validator = ajv.compile(WorkItemSchema);

function getGroupKeysByFn(items: any[], groupKeyFn: ((a: any) => string)) {
  let keyMap: any = {};
  var addToMap = function(item: any) {
    var itemKey = groupKeyFn(item);
    if (!!itemKey) {
      keyMap[itemKey] = itemKey;
    }
  };
  items.forEach(function(item) {
    addToMap(item);
    if (item.children && item.children.length > 0) {
      item.children.forEach(c => addToMap(c));
    }
  });
  return keyMap;
}

function groupPerSprint(items: WorkItemModel[]): WorkItemGroup[] {
  let keyMap = getGroupKeysByFn(items, item => item.sprint);
  let grouped = Object.keys(keyMap).map(function(sprintKey) {
    let entry = {
      key: sprintKey,
      values: angular.copy(items.filter(item => item.sprint == sprintKey || item.children.some(child => child.sprint == sprintKey))),
      stats: new WorkItemGroupStatistics()
    };
    entry.stats.taskCount = entry.values.length;
    entry.stats.totalEffort = entry.values.reduce((a, i) => a + (parseInt(i.effort) || 0), 0);
    return entry;
  });
  return grouped;
}

function groupPerUser(items: WorkItemModel[]): WorkItemGroup[] {
  var keyMap = getGroupKeysByFn(items, item => item.assignedTo);

  var grouped = Object.keys(keyMap).map(function(key) {
    let entry: WorkItemGroup = {
      key: key,
      values: angular.copy(items.filter(item => item.assignedTo == key || item.children.some(child => child.assignedTo == key))),
      stats: new WorkItemGroupStatistics()
    };
    entry.values.forEach(function(item) {
      const cr = item.children.filter(c => c.assignedTo == key && c.title.toLowerCase().indexOf("code review") > -1);
      if (cr && cr.length > 0) {
        entry.stats.codeReviews.push(item);
        item.onlyCodeReview = true;
      } else {
        entry.stats.activeEffort += parseInt(item.effort) || 0;
      }
      entry.stats.totalEffort += parseInt(item.effort) || 0;
    });
    entry.stats.taskCount = entry.values.reduce((acc, item) => acc + item.children.filter(c => c.assignedTo == entry.key).length, 1);

    return entry;
  });
  return grouped;
}

var subitemTypes = ["bug sub-task", "code review", "sub-task", "task", "test task"];
var itemTypes = ["bug", "story"];

export function processResults(items: any[]) {
  const errors: any[] = [];
  items.forEach(item => (!validator(item) ? errors.push(validator.errors) : null));
  console.error(errors);
  //var localItems = items.filter(item=>['deleted', 'removed'].indexOf((item.status || '').toLowerCase()) < 0);
  let parentIdMap: any = {};
  var localItems = items;
  localItems.forEach(function(item) {
    item.children = localItems.filter(c => item.childrenIds.indexOf(c.id) > -1);
    item.parents = localItems.filter(p => item.parentIds.indexOf(p.id) > -1);
    item.parentIds.forEach(id => (parentIdMap[id] = id));
  });
  var parents = localItems.filter(item => itemTypes.indexOf(item.type) > -1);

  return parents;
}

export function aggregateItems(items: any[]): AggregateModel {
  let processed = processResults(items);
  let data: AggregateModel = {
    raw: angular.copy(items),
    workItems: processed,
    perSprint: groupPerSprint(processed),
    perUser: groupPerUser(processed)
  };
  data.users = data.perUser.map(item => item.key);
  return data;
}
