import { app } from "../app";

app.directive("workItemGroupStats", function() {
  return {
    scope: {
      item: "=",
      stats: "="
    },
    restrict: "E",
    templateUrl: "./directives/WorkItemGroupStatistics.html",
    link: function($scope, $element, $attrs) {}
  };
});
