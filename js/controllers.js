
var app = angular.module('myApp', [])

// --- main controller

app.controller('ServerJobsController', function ($scope, $http, $document, $window, JobsPollingService) {

  $scope.serverUrl  = "";

  var nullJobList = [{ name: '',  status: '',  progress: 0,  id: '', statusType : '' }];
  $scope.jobList  = nullJobList;
  $scope.jobListEtag = "\"0\"";
  $scope.etagChangedClass ="";
  $scope.jobListLastModified = "";
  $scope.jobListCount = 0;
  $scope.lastModifChangedClass = "";
  $scope.selectedJobIndex = -1;

  $scope.serverNotAlive  = false;
  $scope.isPolling  = false;
  $scope.isQuerying = false;
  $scope.initialState = true;

  var getOnceText = "Get Once";
  var gettingOnceText = "Getting...";
  var pollText = "Poll";
  var pollingText = "Polling...";

  $scope.getOnceButtonText  = getOnceText;
  $scope.pollButtonText  = pollText;

  $scope.pollFrequency = 500; // ms
  $scope.jobFilter = "none";
    

  // --- get a list (only once)
  $scope.getJobs = function() {
    //$scope.jobListEtag  = "\"0\"";
    //$scope.jobList  = nullJobList;

      $scope.etagChangedClass ="";
      $scope.lastModifChangedClass = "";
      //$scope.jobListCount = 0; --> preserve last!

      makeRequest();
      $scope.initialState = false;
  };

  // --- start/stop polling
  $scope.startPolling = function() {
      if(!$scope.serverUrl) {
         //alert("No server address! \nWill use default: http://localhost:8111");
	     $scope.serverUrl = "http://localhost:8111"
      }

      JobsPollingService.serverUrl = $scope.serverUrl;
      JobsPollingService.pollInterval = $scope.pollFrequency;
      $scope.isPolling  = true;
      $scope.pollButtonText = pollingText;

      $scope.initialState = false;
  }

  $scope.stopPolling = function() {
      JobsPollingService.serverUrl = undefined;
      $scope.isPolling  = false;
      $scope.pollButtonText  = pollText;
  }

  // --- display job data in a popup
  $scope.showJob = function(index) {
      var jobUrl = $scope.serverUrl + '/jobs/'+ $scope.jobList[index].id
                        + '?style=detailed'
                        + '&_=' + Math.floor(Math.random() * 1000000); // cachebooster!
      $scope.selectedJobIndex = index;

      $http({
          method: 'GET',
          url: jobUrl,
          cache: false
      }).success(function (data, status, headers, config) {
	      //var jobText = angular.toJson(data) 
          //var jobText = JSON.stringify(data, null, 4); 
          $scope.selectedJobData = JSON.stringify(data, null, 2); 
	      $scope.showPopup(2);
      }).error(function (data, status, headers, config) {
          //var errTxt = "ERROR: " + status + (data) ? (", data=" + data) : "";
          $scope.selectedJobData = "Server communication Error!";
          $scope.showPopup(2);
          $scope.serverNotAlive = true;
      });
  }
    
  // --- change settings
  $scope.changeSettings = function () {

      JobsPollingService.pollInterval = $scope.pollFrequency;

      if($scope.jobFilter != "none") {
	      alert("Changing of the job filter not yet suported!");
	      $scope.jobFilter = "none";
      }

      // OPEN TODO::: .... job filtering!!!
  }
    
  // --- support for the pop-ups

  $scope.showPopup = function (whichpopup) {
      var scrollTop = $window.pageYOffset;
      //angular.element(document.querySelector('.overlay-bg')).show().css({ 'height': docHeight }); 
      angular.element(document.querySelector('.popup' + whichpopup)).css({ 'display': 'block' }).css({ 'top': scrollTop + 20 + 'px' });
      angular.element(document.querySelector('.popup' + whichpopup))[0].focus(); // as to enable Esc
  }

  $scope.hidePopup = function (whichpopup) {
      //angular.element(document.querySelector('.overlay-bg, .overlay-content')).hide();
      angular.element(document.querySelector('.popup' + whichpopup)).css({ 'display': 'none' });
  }
    
  // hide the popup when user presses the esc key
  $scope.hidePopeupOnEsc = function (e, whichpopup) {
      if (e.keyCode == 27) {
          $scope.hidePopup(whichpopup);
      }
  }

  // --- internal functions
  
  // get once
  var makeRequest = function() {    
    if(!$scope.serverUrl) {
        //alert("No server address! \nWill use default: http://localhost:8111");
	    $scope.serverUrl = "http://localhost:8111"
    }

    $scope.serverNotAlive  = false;
    $scope.isQuerying  = true;
    $scope.getOnceButtonText  = gettingOnceText;

    var jobsUrl = $scope.serverUrl + '/jobs' + '?_=' + Math.floor(Math.random()*1000000); // cachebooster!

    $http({
      method: 'GET',
      url: jobsUrl,
      cache: false,
      //timeout : 10 // Casablanca crash TEST!!!
    }).success(function(data, status, headers, config) {
        $scope.jobList = data;
        $scope.jobListEtag = headers("ETag");
        $scope.jobListLastModified = headers("Last-Modified");
        $scope.jobListCount = data.length;
        $scope.isQuerying  = false;
        $scope.getOnceButtonText  = getOnceText;
    }).error(function(data, status, headers, config) {
        $scope.jobList = "ERROR: " + status + (data) ? (", data=" + data) : "";
        $scope.jobListEtag = headers("--");
        $scope.jobListLastModified = headers("--");
        $scope.jobListCount = 0;
        $scope.serverNotAlive = true;
        $scope.isQuerying  = false;
	$scope.getOnceButtonText  = getOnceText;
    });
  }

  // use polling service:
  JobsPollingService.onJobListChanged = function(status, data, lastModified, etag) {
      $scope.jobList = data;

      if($scope.jobListEtag != etag) {
          $scope.etagChangedClass ="red";
      } else {
	      $scope.etagChangedClass ="";
      }

      $scope.jobListEtag = etag;

      if($scope.jobListLastModified != lastModified) {
          $scope.lastModifChangedClass ="red";
      } else {
	      $scope.lastModifChangedClass ="";
      }

      $scope.jobListLastModified = lastModified;

      $scope.jobListCount = data.length;

      $scope.serverNotAlive = (status != 200);

      if($scope.isPolling) {
          $scope.pollButtonText  = pollingText;
      }
  };

  JobsPollingService.onPollInitiated = function() {
      //$scope.jobList  = nullJobList;
      //$scope.jobListEtag  = "\"0\"";
      $scope.pollButtonText  = pollingText + "...";
  }  

});

// --- status display support
 
// OPEN TODO:::::
app.filter('status', function() {
    return function(input, scope) {
        switch(input) {
              case "running": return input;
              case "waiting": return input;
              case "finished": return input;//if(scope.getResultType() .... return "error")
        }
    }
  });

app.directive('jobStatus', function() {
    return {
      restrict: 'AE',
      template: '<div ng-class="statusClass"> <i> {{statusValue}} </i></div>',
      scope: {
          statusValue: '=',
          statusType: '='
      },
      link: function($scope) {
          switch($scope.statusValue) {
              case "running": $scope.statusClass = "orange"; break;
              case "waiting": $scope.statusClass = "gray"; break;
              case "finished":
                  if ($scope.statusType != "error") {
                      $scope.statusClass = "green"; 
                  } else {
                      $scope.statusClass = "red";
                  }
                  break;
              case "error": $scope.statusClass = "red"; break;
              case "cancelled": $scope.statusClass = "red"; break;
          }
      }
    };
  });

// --- service for polling

app.factory('JobsPollingService', function($timeout, $http) {
      function JobsPollingService($timeout, $http) {
          var self = this;

          self.serverUrl = "";
          self.pollInterval = 1000;
          self.onPollInitiated = null;
          self.onJobListChanged = null;
          
          var pollJobs = function() {
	      // initialized?
	      if(!self.serverUrl) {
		  $timeout(pollJobs, self.pollInterval);
		  return;
	      }

	      // else:
	      if(self.onPollInitiated !== null) {
                  self.onPollInitiated();
              }

              var jobsUrl = self.serverUrl + '/jobs' + '?_=' + Math.floor(Math.random()*1000000); // cachebooster!

              $http({
                method: 'GET',
                url: jobsUrl,
                cache: false,
                //timeout: 10 // Casablanca crash TEST!!!
              })
              .success(function(data, status, headers, config) {
                  if(self.onJobListChanged !== null) {
                        self.onJobListChanged(status, data, headers("Last-Modified"), headers("ETag"));
                  }
                  $timeout(pollJobs, self.pollInterval);
              })
	      .error(function(data, status, headers, config) {
                  if(self.onJobListChanged !== null) {
                        self.onJobListChanged(status, data, "", "");
                  }
                  $timeout(pollJobs, self.pollInterval)		 
               });
          };

	  pollJobs();
      }
      
      return new JobsPollingService($timeout, $http);
});
 
