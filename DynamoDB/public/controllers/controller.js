var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("hello from controller!");
    var refresh = function() {
        $http.get('/Movies').success(function(res) {
            console.log('got data');
            $scope.Movies = res;
            $scope.movie = "";
        });
    }
    refresh();
    $scope.addMovies = function() {
        console.log($scope.movie);
        $http.post('/Movies', $scope.movie).success(function(res) {
            console.log(res + "is add ");
            refresh();
        });
    };
    $scope.removeMovies = function() {
        console.log("is going to be deleted");
        $http.delete('/Movies', $scope.movie).success(function() {
            console.log("$scope.removMovies ");
        });
        refresh();
    };
    $scope.editMovies = function() {
        //console.log(id + ' is editting');
        $http.get('/Movies', $scope.movie).success(function(res) {
            $scope.movie = res;
        });
    };
    $scope.update = function() {
        console.log($scope.movie._id + "is updating");
        $http.put('/Movies', $scope.movie).success(function(response) {
            refresh();
        });
    };
    $scope.deselect = function() {
        $scope.movie = "";
    };
}]);