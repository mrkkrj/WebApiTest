var filterText = "";
var protocol = "https";
var activeList = "";

//für auffinden des jobnamens zum file
var uid = "";
var jobStatusValues = new Array();

var pollInterval = 1000;

function updatePollInterval() {
    var t = $("input#pollInterval").val();
    if( t<500 ) t = 500;
    pollInterval = t;
}

function showWaitCursor(enable) {
    if (enable) {
        $('html,body').css('cursor', 'wait');
        $('html,body').addClass("loading");
    } else {
        $('html,body').css('cursor', 'auto');
        $('html,body').removeClass("loading");
    }
}

$(document).ready(function(){    
    //AJAX gobal params
    $.support.cors = true; 
    $.ajaxSetup({
        ifModified: false
    });    
    //event handler registration
    $(document).ajaxError(function (evt, jqXHR, plain, msg) {
        showWaitCursor(false);
        $(".ui-content").append("<h1 id=\"message\">Network error: No server response." +
                                " Protocol: <i><u>" + protocol + "</u></i>. Retry?</h1>");
        toggleProtocol();
    } );    
    $("#loadFiles").click( function(){
        clearMessages();
        getData("files");
        this.blur();
    });
    $("#loadResources").click( function(){
        clearMessages();
        getData("resources");
        this.blur();
    });
    $("#loadJobs").click( function(){
        clearMessages();
        getData("jobs");
        this.blur();
    });
    $("#deleteList").click(function () {
        $("#message").remove();
        deleteAllItemsFromList();
        this.blur();
    });

    // added (mrkkrj):
    $("#loadProfiles").click(function () {
        clearMessages();
        getData("resources/profiles");
        this.blur();
    });
    $("#loadIccSubst").click(function () {
        clearMessages();
        getData("resources/substitutions");
        this.blur();
    });
    $("#loadTemplates").click(function () {
        clearMessages();
        getData("resources/templates");
        this.blur();
    });
    $("#loadHotfolders").click(function () {
        clearMessages();
        getData("resources/workflows");
        this.blur();
    });
    $("#loadLocations").click(function () {
        clearMessages();
        getData("resources/locations");
        this.blur();
    });
    $("#loadPrinters").click(function () {
        clearMessages();
        getData("resources/printers");
        this.blur();
    });
    $("#loadSpotcolor").click(function () {
        clearMessages();
        getData("resources/spotcolor");
        this.blur();
    });
    $("#loadSmpDocuments").click(function () {
        clearMessages();
        getData("resources/smartprofiler/documents");
        this.blur();
    });
    $("#loadSmpDefaults").click(function () {
        clearMessages();
        getData("resources/smartprofiler/defaults");
        this.blur();
    });
});

function toggleProtocol() {
    if( protocol === "http" ) {
        protocol="https";        
    } else {        
        protocol="http";    
    }
    //try next time automatic the other protocol
}

function clearMessages() {
    $("#message").remove();
}

function getServerAddress() {
    return $("input#serveraddi").val();    
}

function clearCurrentList() {
    filterText = $(".ui-input-search > input").val();
    $("#mylist").remove();
    $(".ui-filterable").remove();
}

var clr = function() {
    clearCurrentList();
};

function getUrlStart() {
    return protocol+"://"+getServerAddress()+":8111/";
}

function getData( type ) {        
    activeList = type;    
    //clearCurrentList();
    showWaitCursor(true);

    // use default server! (mrkkrj)
    if (getServerAddress().length == 0) {
        $("input#serveraddi").val("localhost");
    }

    if( getServerAddress().length > 0 ) {        
        var callbackFunc = undefined;
        updatePollInterval();
        if( type === "files" ) callbackFunc = callbackFiles;
        if (type.match("^resources")) callbackFunc = callbackRes; // =starts with (mrkkrj)
        if (type.match("locations$")) callbackFunc = callbackLocations; // =ends with (mrkkrj)
        if (type.match("printers$")) callbackFunc = callbackPrinters // =ends with (mrkkrj)
        if (type.match("documents$")) callbackFunc = callbackSmpDocs // =ends with (mrkkrj)
        if (type.match("substitutions")) callbackFunc = callbackIccSubst        
        if( type === "jobs" ) callbackFunc = callbackJobs;
        clearMessages();
        $.ajax({
            url: getUrlStart()+type,
            timeout: 5000,
            cache: false,
            data: {},            
            type: "GET",
            dataType: "json",        
            success: callbackFunc,
            error: clr
        });
    } else {
        showWaitCursor(false);
        $(".ui-content").append("<h1 id=\"message\">No Server defined!</h1>"); 
    }
};

var pollJobs = function() {
    getData("jobs");
};

var pollFiles = function() {
    getData("files");
};

var pollResources = function() {
    getData("resources");
};

var callbackFiles = function(data,textStatus,jqXHR){
    clearCurrentList();
    showWaitCursor(false);

    if( data.length > 0 ) {
        $(".ui-content").append("<ul id=\"mylist\" data-role=\"listview\" data-inset=\"true\" data-filter=\"true\">");
        $.each( data, function(k,v){
            //k=index, v=data set
            var lnk="";
            if(v.linked) lnk=" linked";
            $("#mylist").append("<li><div class=\"name" + lnk + "\">(<b>#" +
                    (k + 1) + "/" + data.length + "</b>)&nbsp;&nbsp;" + v.name +
                    "</div><div class=\"clr\"></div><div class=\"status\">"+
                    v.id+"&nbsp;<button id=\""+v.id+
                    "\" class=\"ui-btn ui-mini ui-btn-inline ui-icon-shop ui-btn-icon-left myReverseJobLookup\">&nbsp;</button>&nbsp;<button id=\""+v.id+"\" class=\"ui-btn ui-mini ui-btn-inline ui-icon-delete ui-btn-icon-left myDelete\">&nbsp;</button></div></li>");
        });
        $("#mylist").listview().listview("refresh");
        $(".myReverseJobLookup").click(function(evtH){
            var fileId = evtH.target.attributes[1].value;
            getFileReverseJobLookup(fileId);
            this.blur();
        });
        $(".myDelete").click(function(evtH){
            var fileId = evtH.target.attributes[1].value;
            sendDeleteFile(fileId);
        });
        //reset filter from delete previous list
        $(".ui-input-search > input").val(filterText).change();
    } else {
         $(".ui-content").append("<h1 id=\"message\">No Files in Repository</h1>"); 
    }
    if( $("#pollCheck").is(':checked') ) {
        setTimeout(pollFiles,1000);
    }
};

var callbackRes = function(data,textStatus,jqXHR){
    clearCurrentList();
    showWaitCursor(false);

    if( data.length > 0 ) {
        $(".ui-content").append("<ul id=\"mylist\" data-role=\"listview\" data-inset=\"true\" data-filter=\"true\">");
        $.each( data, function(k,v){
            //k=index, v=data set
            $("#mylist").append("<li><div class=\"name\">(<b>#"+
                    (k + 1) + "/" + data.length + "</b>)&nbsp;&nbsp;"+v.name+
                    "</div><div class=\"clr\"></div><div class=\"status\">"+v.href+
                    "&nbsp;<button id=\""+v.href+"\" class=\"ui-btn ui-mini ui-btn-inline ui-icon-delete ui-btn-icon-left myDelete\">&nbsp;</button></div></li>");
        });
        $("#mylist").listview().listview("refresh");
        $(".myDelete").click(function(evtH){        
            var fileId = evtH.target.attributes[1].value;
            sendDeleteRes(fileId);
        });
        $(".ui-input-search > input").val(filterText).change();
    } else {
         $(".ui-content").append("<h1 id=\"message\">No Resources in Repository</h1>"); 
    }
    if( $("#pollCheck").is(':checked') ) {
        setTimeout(pollResources,1000);
    }
};

var callbackRessNoHref = function (hrefPath, data, textStatus, jqXHR) {
    clearCurrentList();
    showWaitCursor(false);

    if (data.length > 0) {
        $(".ui-content").append("<ul id=\"mylist\" data-role=\"listview\" data-inset=\"true\" data-filter=\"true\">");
        $.each(data, function (k, v) {
            //k=index, v=data set

            // special case, no href for locations (mrkkrj)!
            //   OPEN TODO:: use closure?!
            var href = hrefPath + "/"+ v.id

            $("#mylist").append("<li><div class=\"name\">(<b>#" +
                    (k +1) + "/" + data.length + "</b>)&nbsp;&nbsp;" +v.name +
                    "</div><div class=\"clr\"></div><div class=\"status\">" + href +
                    "&nbsp;<button id=\"" + href + "\" class=\"ui-btn ui-mini ui-btn-inline ui-icon-delete ui-btn-icon-left myDelete\">&nbsp;</button></div></li>");
        });
        $("#mylist").listview().listview("refresh");
        $(".myDelete").click(function (evtH) {
            var fileId = evtH.target.attributes[1].value;
            sendDeleteRes(fileId);
        });
        $(".ui-input-search > input").val(filterText).change();
    } else {
        $(".ui-content").append("<h1 id=\"message\">No Resources in Repository</h1>");
    }
    if ($("#pollCheck").is(':checked')) {
        setTimeout(pollResources, 1000);
    }
};

var callbackLocations = function (data, textStatus, jqXHR) {
    return callbackRessNoHref("resources/locations", data, textStatus, jqXHR);
}

var callbackPrinters = function (data, textStatus, jqXHR) {
    return callbackRessNoHref("resources/printers", data, textStatus, jqXHR);
}

var callbackIccSubst = function (data, textStatus, jqXHR) {
    return callbackRessNoHref("resources/substitutions", data, textStatus, jqXHR);
}

var callbackSmpDocs = function (data, textStatus, jqXHR) {
    return callbackRessNoHref("resources/smartprofiler/documents", data, textStatus, jqXHR);
}

var jobDataArrayFilter = function(obj) {
    if( filterText===undefined ) return true;
    if( filterText==="" ) return true;
    var ft = filterText.toLowerCase();
    if( obj.id.toLowerCase().includes(ft) ) return true;
    if( obj.name.toLowerCase().includes(ft) ) return true;
    if( obj.status.toLowerCase().includes(ft) ) return true;
    if( obj.statusType.toLowerCase().includes(ft) ) return true;
    if( obj.progress.toString().includes(ft) ) return true;
    return false;
};

var callbackJobs = function(data,textStatus,jqXHR){
    clearCurrentList();
    showWaitCursor(false);

    var runningJobs = {
        list: new Array()
    };
    console.log(data);
    if( data.length > 0 ) {
        $(".ui-content").append("<ul id=\"mylist\" data-role=\"listview\" data-inset=\"true\" data-filter=\"true\">");
        if( filterText!="" ) data = data.filter(jobDataArrayFilter);
        $.each( data, function(k,v){
            //k=index, v=data set
            var col = "";            
            //status
            var valProgress = "0%";
            var statusBar = "";
            if( v.status==="waiting" ) col=" s_waiting";
            if( v.status==="finished" ) col=" s_finished";
            if( v.status==="cancelled" ) col=" s_warning";
            if( v.status==="running" ) {
                col=" s_running";
                if( jobStatusValues.length > 0 ) {
                    var o = jobStatusValues.find(function(w){
                        return w.jobid == v.id;
                    });
                    if( o!=undefined ) valProgress = " "+o.progress+"%";
                }
                statusBar = "<div class=\"pbar\"><p class=\"pbartext\">"+valProgress+"</p></div>";
                runningJobs.list.push(v.id);
            }
            //statustyp
            if( v.statusType==="error" ) col=" error";
            //if( v.statusType==="info" ) col=" info";
            if( v.statusType==="warning" ) col=" warning";
            $("#mylist").append("<li data-id=" + v.id + "><div class=\"name" + col + "\">(<b>#" +
                    (k + 1) + "/" + data.length + "</b>)&nbsp;&nbsp;" + v.name + "&nbsp;-&nbsp;" + v.status + "&nbsp;(" + v.statusType +
                    ")</div><div class=\"clr\"></div>"+
                    statusBar+
                    "<div class=\"status\">"+v.id+"&nbsp;<button id=\""+
                    v.id+"\" class=\"ui-btn ui-mini ui-btn-inline ui-icon-delete ui-btn-icon-left myDelete\">&nbsp;</button></div></li>");
        });
        $("#mylist").listview().listview("refresh");
        $(".myDelete").click(function(evtH){
            var jobId = evtH.target.attributes[1].value;
            sendDeleteJob(jobId);            
        });
        $(".ui-input-search > input").val(filterText).change();
    } else {
         $(".ui-content").append("<h1 id=\"message\">No Jobs in Repository</h1>"); 
    }
    if( runningJobs.list.length > 0 ) {
        while(jobStatusValues.length > 0) {
            var jo = jobStatusValues.pop();
            $("li[data-id='"+jo.jobid+"'] > div.pbar > p.pbartext").css("width",jo.progress);
        }        
        getJobProcessingStatus(runningJobs);
    } else {        
        if( $("#pollCheck").is(':checked') ) {
            setTimeout(pollJobs,pollInterval);
        }
    }
    
};

function getJobProcessingStatus( obj ) {
    var id = obj.list.pop();
    $.ajax({
        async: true,
        url: getUrlStart()+"jobs/"+id+"/status",
        timeout: 5000,
        data: {},
        type: "GET",
        dataType: "json",        
        complete: function(data,jqXHR,textStatus) {
            var val = Math.round(data.responseJSON.progress*100);
            //var valt = val.toString()+"%";
            //var vals = "<div class=\"pbar\"><p class=\"pbartext\">"+valt+"</p></div>";
            //$("li[data-id='"+id+"'] > div.status").before(vals);
            $("li[data-id='"+id+"'] > div.pbar > p.pbartext").css("width",val);
            $("li[data-id='"+id+"'] > div.pbar > p.pbartext").text(" "+val+"%");
            jobStatusValues.push({
                jobid: id,
                progress: val
            })
            if( obj.list.length > 0 ) {
                getJobProcessingStatus(obj);
            } else {
                if( $("#pollCheck").is(':checked') ) {
                    setTimeout(pollJobs,pollInterval);
                }
            }
        }
    }); 
}

function sendDeleteFile( id ) {
    $.ajax({
        async: false,
        url: getUrlStart()+"files/"+id,
        timeout: 5000,
        data: {},
        type: "DELETE",
        dataType: "*/*",        
        complete: function(jqXHR,textStatus) {
            getData("files");
        }
    });    
};

function sendDeleteRes( id ) {    
    $.ajax({
        async: false,
        url: getUrlStart()+id,
        timeout: 5000,
        data: {},
        type: "DELETE",
        dataType: "*/*",        
        complete: function(jqXHR,textStatus) {
            //getData("resources");
            getData(activeList);
        }
    });    
};

function sendDeleteJob( id ) {
    $.ajax({
        async: false,
        url: getUrlStart()+"jobs/"+id,
        timeout: 5000,
        data: {},
        type: "DELETE",
        dataType: "*/*",        
        complete: function(jqXHR,textStatus) {
            getData("jobs");
        }
    });    
};

function deleteAllItemsFromList() {
   showWaitCursor(true); // OPEN TODO:: no working, sync Ajax calls!

    //only delete items that are visible - items that are filtered out aren't delteted
    var temp = $("ul#mylist li").not(".ui-screen-hidden");
    var path = activeList+"/";
    if (activeList.match("^resources")) path = ""; // begins with? (mrkkrj)

    temp.each(function(index,element){
        var id = $(element).find("div.status").delay(100).text();
        id = $.trim(id);
        console.log(getUrlStart()+path+id);
        $.ajax({
            async: false,
            url: getUrlStart()+path+id,            
            timeout: 5000,
            data: {},
            type: "DELETE",
            dataType: "*/*",        
            complete: function(jqXHR,textStatus) {
                //nothing
            }
        });        
    });

    showWaitCursor(false);
    getData(activeList);
}

function getFileReverseJobLookup( id ) {
    uid = id;
    $("ul li div.status:contains('"+id+"')").prepend("<div class=\"search\">Searching ...</div>&nbsp;");
    $.ajax({        
        url: getUrlStart()+"jobs",
        timeout: 20000,     //if job list is very large
        cache: false,
        data: {},            
        type: "GET",
        dataType: "json",        
        success: function(data,textStatus,jqXHR) {
            //search job by job recursive
            lookupJob(data,0,uid);
        }
    });
}

var lookupJob = function( data, index, searchId ) {    
    if(index>data.length-1) {
        //search ended -> clear search status
        $("ul li div.search").remove();
        return;
    } 
    $("ul li div.status:contains('"+uid+"') div.search").text("Searching "+(index+1)+" of "+data.length);
    $.ajax({
        //search in job result
        url: getUrlStart()+"jobs/"+data[index].id+"/result",
        timeout: 5000,
        cache: false,
        data: {},            
        type: "GET",
        dataType: "json",        
        success: function(d,textStatus,jqXHR){
            if( d.outputFiles[0]===undefined ) {
                //look in input files if there is no output available
                $.ajax({        
                url: getUrlStart()+"jobs/"+data[index].id+"/ticket",
                timeout: 5000,
                cache: false,
                data: {},            
                type: "GET",
                dataType: "json",
                success: function(e,textStatus,jqXHR){
                    if( e.inputFileId===undefined ) {
                        //no result found in input/output -> proceed with next job
                        lookupJob(data,index+1,searchId);
                        return;
                    }
                    if(searchId===e.inputFileId) {
                        //file found in input files section of job
                        $("ul li div.search").remove();
                        $("ul li div.status:contains('"+uid+"')").prepend("Job name="+data[index].name+"&nbsp;");
                    } else {
                        //input file doesn't match -> proceed with next job
                        lookupJob(data,index+1,searchId);
                    }
                },
                error: function(jqXHR,textStatus,errorThrown){
                    //error for any reason, maybe timeout -> try this job again
                    lookupJob(data,index,searchId);
                    }
                });                    
                return;
            }//end of search in input, if no match was found among outputs
            if(searchId===d.outputFiles[0].fileId) {
                //match!
                $("ul li div.search").remove();
                $("ul li div.status:contains('"+uid+"')").prepend("Job name="+data[index].name+"&nbsp;");
            } else {
                //no match in output -> next job
                lookupJob(data,index+1,searchId);
            }
        },
        error: function(jqXHR,textStatus,errorThrown){
            //error, try again
            lookupJob(data,index,searchId);
        }
    }); 
    
};
