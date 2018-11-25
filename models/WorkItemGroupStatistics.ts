import { WorkItemModel } from "./WorkItemModel";

export class WorkItemGroupStatistics {
  taskCount: number = 0;
  totalEffort: number = 0;
  activeEffort: number = 0;
  codeReviews: WorkItemModel[] = [];
}
