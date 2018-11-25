export class WorkItemModel {
  id: string;
  sprint: string;
  type: string;
  assignedTo: string;
  status: string;
  closedDate: Date;
  createdDate: Date;
  title: string;
  parentIds: Number[];
  childrenIds: Number[];
  viewUrl: string;
  severity: string;
  effort: string;
  source: string;
  children: any[];
  onlyCodeReview?: boolean;
}
