export class WorkItemModel {
  id: string = "";
  sprint: string = "";
  type: string = "";
  assignedTo: string = "";
  status: string = "";
  closedDate: Date = new Date(0, 0, 0);
  createdDate: Date = new Date(0, 0, 0);
  title: string = "";
  parentIds: Number[] = [];
  childrenIds: Number[] = [];
  viewUrl: string = "";
  severity: string = "";
  effort: string = "";
  source: string = "";
  children: WorkItemModel[] = [];
  onlyCodeReview?: boolean;
}
