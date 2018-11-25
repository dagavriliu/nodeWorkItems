import { app } from "../app";
import { toggleSet } from "../services/HelperService";

app.directive("workItemsPerSprint", function() {
  return {
    scope: {
      items: "=",
      users: "="
    },
    restrict: "E",
    templateUrl: "./directives/WorkItemsPerSprint.html",
    link: function($scope, $element, $attrs) {
      $scope.toggleSet = toggleSet;
      $scope.ui = {
        hide: true
      };
    }
  };
});
