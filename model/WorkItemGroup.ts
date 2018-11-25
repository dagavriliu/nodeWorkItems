import { WorkItemModel } from "./WorkItemModel";
import { WorkItemGroupStatistics } from "./WorkItemGroupStatistics";

export class WorkItemGroup {
  key: string;
  values: WorkItemModel[];
  stats: WorkItemGroupStatistics;
  constructor() {
    this.values = [];
  }
}
