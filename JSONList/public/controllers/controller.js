var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("hello from controller!");
    var refresh = function() {
        $http.get('/sourceList').success(function(res) {
            console.log('got data');
            $scope.sourceList = res;
            $scope.source = "";
        });
    }
    refresh();
    $scope.addSource = function() {
        console.log($scope.source);
        $http.post('/sourceList', $scope.source).success(function(res) {
            console.log(res + "is add ");
            refresh();
        });
    };
    $scope.removeSource = function(id) {
        console.log(id);
        $http.delete('/sourceList/' + id).success(function() {
            console.log("$scope.removSource ");
            refresh();
        });
    };
    $scope.editSource = function(id) {
        console.log(id + ' is editting');
        $http.get('/sourceList/' + id).success(function(res) {
            $scope.source = res;
        });
    };
    $scope.update = function(id) {
        console.log($scope.source._id + "is updating");
        $http.put('/sourceList/' + $scope.source._id, $scope.source).success(function(response) {
            refresh();
        });
    };
    $scope.deselect = function() {
        $scope.source = "";
    };
}]);
$(document).on('click', '#editBtn', function() {
    console.log("aaaaaaaaa");
    $(".changeAction h4").text("Source Edit");
    $(".modal-footer .btn-primary").attr("ng-click", "update()");
    $(".modal-footer .btn-primary").attr("id", "updateBtn");
    $(".modal-footer .btn-primary").text("update");
});
$(document).on('click', '#addBtn', function() {
    $(".changeAction h4").text("Source Add");
    console.log("sss");
    $(".modal-footer .btn-primary").text("submit");
    $(".modal-footer .btn-primary").bind("ng-click", addSource);

});