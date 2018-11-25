import { app } from "../app";
import { toggleSet } from "../services/HelperService";

app.directive("workItemsPerUser", function() {
  return {
    scope: {
      items: "=",
      users: "="
    },
    restrict: "E",
    templateUrl: "./directives/WorkItemsPerUser.html",
    link: function($scope, $element, $attrs) {
      $scope.toggleSet = toggleSet;
      $scope.ui = {
        hide: true
      };
    }
  };
});
