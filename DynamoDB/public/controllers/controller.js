var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("hello from controller!");
    var refresh = function() {
        $http.get('/Sources').success(function(res) {
            console.log('got data');
            $scope.Sources = res;
            $scope.source = "";
        });
    }
    refresh();
    $scope.addSources = function() {
        console.log($scope.source);
        $http.post('/Sources', $scope.source).success(function(res) {
            console.log(res + "is add ");
            refresh();
        });
    };
    $scope.removeSources = function(id) {
        console.log(id + "is going to be deleted");
        $http.delete('/Sources/' + id).success(function() {
            console.log("$scope.removSources !!");
        });
        refresh();
    };
    $scope.editSources = function(id) {
        console.log(id + ' is editting');
        $http.get('/Sources/' + id).success(function(res) {
            $scope.source = res;
        });
    };
    $scope.update = function(id) {
        console.log(id + "is updating");
        $http.put('/Sources/' + id, $scope.source).success(function(response) {
            refresh();
        });
    };
    $scope.deselect = function() {
        $scope.source = "";
    };
}]);