import { app, toggleSet } from '../angular-app';

app.directive('workItemsPerUser', function() {
    return {
        scope: {
            items: '=',
            users: '=',
            highlight: '='
        },
        restrict: 'E',
        templateUrl: './directives/WorkItemsPerUser.html',
        link: function($scope, $element, $attrs) {
            $scope.toggleSet = toggleSet;
            $scope.ui = {
                hide: true,
            };
            // Object.keys($scope.item).forEach(p => !!$scope.highlight && $scope.highlight.hasOwnProperty[p] ? $scop.highlight[p] = $scope.item[p] : null);
        }
    }
})