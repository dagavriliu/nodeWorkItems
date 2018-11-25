import { WorkItemModel } from "./WorkItemModel";
import { WorkItemGroup } from "./WorkItemGroup";
export class AggregateModel {
  public workItems: WorkItemModel[];
  public perUser: WorkItemGroup[];
  public perSprint: WorkItemGroup[];
  public users?: any[];
}
