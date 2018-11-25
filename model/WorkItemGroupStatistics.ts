import { WorkItemModel } from "./WorkItemModel";

export class WorkItemGroupStatistics {
  taskCount: number;
  totalEffort: number;
  activeEffort: number;
  codeReviews: WorkItemModel[];
  constructor() {
    this.codeReviews = [];
    this.taskCount = 0;
    this.totalEffort = 0;
    this.activeEffort = 0;
  }
}
