import { app, toggleSet } from '../angular-app';

app.directive('workItemsPerUser', function() {
    return {
        scope: {
            itemsPerUser: '=',
            users: '=',
            highlight: '='
        },
        restrict: 'E',
        templateUrl: './directives/WorkItemsPerUser.html',
        link: function($scope, $element, $attrs) {
            $scope.toggleSet = toggleSet;
            $scope.ui = {
                showPerUser: true,
            };
            // Object.keys($scope.item).forEach(p => !!$scope.highlight && $scope.highlight.hasOwnProperty[p] ? $scop.highlight[p] = $scope.item[p] : null);
        }
    }
})