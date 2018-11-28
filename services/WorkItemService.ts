const angular = require("angular");
const Ajv = require("ajv");

import { WorkItemModel } from "../models/WorkItemModel";
import { WorkItemGroupStatistics } from "../models/WorkItemGroupStatistics";
import { WorkItemGroup } from "../models/WorkItemGroup";
import { AggregateModel } from "../models/AggregateModel";
import { parseDate, subreduce } from "../services/HelperService";

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
    let entry: WorkItemGroup = {
      key: sprintKey,
      values: angular.copy(items.filter(item => item.sprint == sprintKey || item.children.some(child => child.sprint == sprintKey))),
      stats: new WorkItemGroupStatistics()
    };
    const minReduce = (a, i) => (a > i ? i : a);
    const maxReduce = (a, i) => (a > i ? a : i);
    entry.stats.taskCount = entry.values.length;
    entry.stats.totalEffort = entry.values.reduce((a, i) => a + (parseInt(i.effort) || 0), 0);
    entry.stats.min.closedDate = subreduce(entry.values, v => v.closedDate, minReduce);
    entry.stats.min.createdDate = subreduce(entry.values, v => v.createdDate, minReduce);
    entry.stats.max.closedDate = subreduce(entry.values, v => v.closedDate, maxReduce);
    entry.stats.max.createdDate = subreduce(entry.values, v => v.createdDate, maxReduce);

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
      const userTasks = item.children.filter(c => c.assignedTo == key);
      const cr = userTasks.filter(c => c.type == "code review");
      if (cr.length > 0) {
        entry.stats.codeReviews.push(item);
        if (userTasks.length == cr.length) {
          item.onlyCodeReview = true;
          entry.stats.codeReviewCount++;
        }
      } else {
        entry.stats.itemCount++;
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
  if (errors.length > 0) {
    console.log("items have schema errors");
  }

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
  const raw = angular.copy(items);
  let processed = processResults(items);
  let data: AggregateModel = {
    raw: raw,
    workItems: processed,
    perSprint: groupPerSprint(processed),
    perUser: groupPerUser(processed)
  };
  data.users = data.perUser.map(item => item.key);
  return data;
}
