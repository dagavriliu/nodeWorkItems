import { app } from '../angular-app';

app.directive('workItemDetails', function() {
    return {
        scope: {
            item: '=',
            users: '=',
            highlight: '='
        },
        restrict: 'E',
        templateUrl: './directives/WorkItemDetails.html',
        link: function($scope, $element, $attrs) {
            Object.keys($scope.item).forEach(p => !!$scope.highlight && $scope.highlight.hasOwnProperty[p] ? $scop.highlight[p] = $scope.item[p] : null);
        }
    }
})