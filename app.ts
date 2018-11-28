const angular = require("angular");
const jquery = require("jquery");
require("bootstrap/dist/css/bootstrap.css");
require("bootstrap/dist/css/bootstrap-theme.css");

require("ajv");
require("angular-ui-grid/ui-grid.js");
require("angular-ui-grid/ui-grid.css");
require("angular-ui-select/select.js");
require("angular-ui-select/select.css");

export const app = angular.module("workItemApp", ["ui.select", "ui.grid"]);

require("./style.css");
require("./controllers/WorkItemController");
require("./directives/WorkItemDetails");
require("./directives/WorkItemsPerUser");
require("./directives/WorkItemsPerSprint");
require("./directives/WorkItemGroupStatistics");
require("./filters/groupBy");
