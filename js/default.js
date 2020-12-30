
$(document).ready(function() {

    $('#restQuery').click(function () {
        if (this.value === "enter REST query")
            this.value = "";
        //$(this).val("")
    })
    

    // GET handlers
    $('#fetchBtn').click(function () {
        var $btn = $(this);
        $btn.text("Fetching...");

        // default:
        if ($('#restQuery').val().length == 0) {
            $('#restQuery').val("http://localhost:8111/templates");
        }
        if ($('#restQuery').val() === "enter REST query" || 
            (!$('#restQuery').val().match("^http://") && !$('#restQuery').val().match("^https://"))) {
            alert("Wrong URL format!");
            $btn.text("Fetch");
            return;
        }

        function errFunc(errTxt) { 
            $btn.text("Fetch");
            $('#defaultData').hide();
            $('#responseData').hide();
            $('#errorData').show();
            if (errTxt !== "") {
                $('#errorText').text(errTxt + " !!!").show();                
            } else {
                $('#errorText').text("").hide();
            }
            
            //$('#restQuery').val("enter REST query")
        }

        $.ajax({ 
            type:"get", 
	        crossDomain: true,  // else: error=NoTransport!
	        url: $('#restQuery').val(),
	        dataType: ($('#asOctetStream').is(':checked')) ? "" : "json",
            cache: false,

            // as octet-stream?
            beforeSend: function (xhr) {
                if ($('#asOctetStream').is(':checked')) {
                    xhr.setRequestHeader('Accept', 'application/octet-stream');
                }
            },
            // from jQuery 1.5: headers: {"Accept": "xxxx"},

            success: function (data, code, xhr) {
                if (!data) {
                    errFunc("");
                    return;
                }
                $btn.text("Fetch");
                $('#defaultData').hide();
                $('#errorData').hide();
                $('#responseData').show();
                var jsonText = "";

		        function formatObjData(data, jsonText) {
		            jsonText += "{ ";
                    var j = 0;

                    for (var key in data) {
                        if (j != 0)
                            jsonText += ", ";

			            if($.type(data[key]) === 'object') {
			                jsonText += key + ": ";
			                jsonText = formatObjData(data[key], jsonText);
			                jsonText += " ";
			            } else {
			                jsonText += key + ": " + data[key] + " ";
			            }

                        j++;
                    }

                    jsonText += " }<br/>";
		            return jsonText;
		        }
		
		        jsonText = JSON.stringify(data, null, 4);
		        $('#responseText').html("<pre>" + jsonText + "</pre>");

		        var oldLastModif = $("#responseLastModified").text();
		        var oldEtag = $("#responseEtag").text();

		        $("#responseLastModified")
                    .html(xhr.getResponseHeader("Last-Modified"))
                    .toggleClass('red', (oldLastModif !== xhr.getResponseHeader("Last-Modified")));
		        $("#responseEtag")
                    .html(xhr.getResponseHeader("ETag"))
                    .toggleClass('red', (oldEtag !== xhr.getResponseHeader("ETag")));

		        if (Array.isArray(data)) {
		            $("#responseListContLabel").html("<br />&nbsp;List Count:");
                    $("#responseListCount").html(data.length.toString());
                } else {
                    $("#responseListContLabel").html("");
                    $("#responseListCount").html("");
                }
            },
            error: function (xhr, errType, thrownError) {
                errFunc(errType + " " + xhr.statusText);
            }
        });
    })
    

    $('#getMxChecksumsBtn').click(function () {
        var $btn = $(this);
        $btn.text("Fetching...");
        var serverAddr = $('#restQuery').val();

        if ($('#restQuery').val() === "enter REST query" ||
            (!$('#restQuery').val().match("^http://") && !$('#restQuery').val().match("^https://"))) {
            alert("Wrong URL format!");
            $btn.text("Fetch");
            return;
        } else {       
            if (!serverAddr.match(/profiles\/mx\?style=detailed$/)) {
                serverAddr += "/profiles/mx?style=detailed";
            }            
        }

        function errFunc(errTxt) {
            $btn.text("Fetch");
            $('#defaultData').hide();
            $('#responseData').hide();
            $('#errorData').show();
            if (errTxt !== "") {
                $('#errorText').text(errTxt + " !!!").show();
            } else {
                $('#errorText').text("").hide();
            }
        }

        function buildChecksumList(data) {
            if (!$.isArray(data)) {
                return "ERROR: array expected, got object/null !!!!"
            }

            // sort
            var arrayToSort = new Array()                      
            var dataLength = data.length;

            for (var i = 0; i < dataLength; i++) {
                var profChecksumStrg = data[i]['name'];
                profChecksumStrg += " ; ";
                profChecksumStrg += data[i]['parameters']['checksum'];
                arrayToSort.push(profChecksumStrg);
            }

            arrayToSort.sort(); // on name strings + checksums

            // format
            var resultString = " - MX Profile count: ";
            resultString += dataLength; // JS!
            resultString += "\n\n";

            for (var i = 0; i < dataLength; i++) {
                resultString += " "; // indent
                resultString += arrayToSort[i];
                resultString += "\n";
            }

            return resultString;
        }
        
        $.ajax({
            type: "get",
            crossDomain: true,  // else: error=NoTransport!
            url: serverAddr,
            dataType: "json",
            cache: false,

            success: function (data, code) {
                if (!data) {
                    errFunc("");
                    return;
                }
                $btn.text("Get Checksums");
                $('#defaultData').hide();
                $('#errorData').hide();
                $('#responseData').show();

                var checksumList = buildChecksumList(data);                                
                $('#responseText').html("<pre>" + checksumList + "</pre>");
            },
            error: function (xhr, errType, thrownError) {
                errFunc(errType + " " + xhr.statusText);
            }
        });
    })


    $('#showDetails').click(function () {
        $("#responseDetails").toggle('fast'); 
    })
    .hover(function () {
        $(this).css('cursor', 'pointer').attr('title', 'Show respose details.');
    }, function () {
        $(this).css('cursor', 'auto');
    });


    // POST handlers

    // --- template POST
    $('#postBtn').click(function () {
        var $btn = $(this);
        $btn.text("Sending...");

        // default:
        if ($('#restQuery').val().length == 0) {
            $('#restQuery').val("http://localhost:8111/templates");
        }
        if ($('#restQuery').val() === "enter REST query" ||
            (!$('#restQuery').val().match("^http://") && !$('#restQuery').val().match("^https://"))) {
            alert("Wrong URL format!")
            $btn.text("Post");
            return;
        }

        function errFunc(errTxt) {
            $btn.text("Post");
            $('#responseData').hide();
            $('#errorData').show();
            if (errTxt !== "") {
                $('#errorText').text(errTxt + " !!!").show();
            } else {
                $('#errorText').text("").hide();
            }

            //$('#restQuery').val("enter REST query")
        }

        /*
        var jsonInputTxt = $('#jsonData').val();

        if (jsonInputTxt.indexOf("{") == -1) {
            jsonInputTxt = "{" + jsonInputTxt + "}";
        }
        */
       
        var postRequest = $('#restQuery').val()
                               /*
                                + "&name=" + encodeURIComponent($('#templName').val())
                                + "&workerId=" + encodeURIComponent($('#workerType').val())
                                + "&description=" + encodeURIComponent($('#templDescr').val());
                                */
                                + "?name=" + $('#templName').val()
                                + "&workerId=" + $('#workerType').val()
                                + "&description=" + $('#templDescr').val();
        
        if (!confirm("Request to be sent: \n" + postRequest)) {
            $btn.text("Post");
            return;
        } else {
            $('#errorData').hide();
        }

        $.ajax({
            type: "post",
            crossDomain: true,  // else: error=NoTransport!
            url: postRequest,
            //data: jsonInputTxt,
            dataType: "json",
            cache: false,
            success: function (data, code) {
                if (!data) {
                    errFunc("");
                    return;
                }
                $btn.text("Post");
                $('#inputData').hide();
                $('#errorData').hide();
                $('#responseData').show();
                var jsonText = "";

                jsonText = JSON.stringify(data, null, 4);
                $('#responseText').html("<pre>" + jsonText + "</pre>");

            },
            error: function (xhr, errType, thrownError) {
                errFunc(errType + " " + xhr.statusText);
            }
        });
    })
    
    $('#jsonData').click(function () {
        if (this.textContent.indexOf("Input JSON data") == 0)
            this.textContent = "";
        //$(this).val("")
    })
    $('#templName').click(function () {
        if (this.value.indexOf("enter template name") == 0)
            this.value = "";
        //$(this).val("")
    })
    $('#templDescr').click(function () {
        if (this.value.indexOf("enter template description") == 0)
            this.value = "";
        //$(this).val("")
    })
    $('#workerType').click(function () {
        if (this.value.indexOf("enter worker type") == 0)
            this.value = "";
        //$(this).val("")
    })

    // bugfix: why hidden???
    $('#inputData').show();
    
    // --- generic POST
    $('#postSimpleBtn').click(function () {
        var $btn = $(this);
        $btn.text("Sending...");

        // CORS preflight on IE.11?
        if (navigator.userAgent.match(/msie/i) || navigator.userAgent.match(/trident/i)) {
            if ($('#addXTestHeader').is(':checked')) {
                alert("IE " + $.browser.version + ", force CORS probably won't work!"); 
                //alert(navigator.userAgent); 
            }
        }

        // default:
        if ($('#restQuery').val().length == 0) {
            //$('#restQuery').val("http://localhost:8111/jobs");
            $('#restQuery').val("http://localhost:8111/jobs?filePath=C|\\Users\\Marek.Krajewski\\Pictures\\avatar.jpg&templateName=Default%20test%20template%20IMG-Proc&clientId=jQuery");
        }

        if ($('#restQuery').val() === "enter REST query" ||
            (!$('#restQuery').val().match("^http://") && !$('#restQuery').val().match("^https://"))) {
            alert("Wrong URL format!")
            $btn.text("Post");
            return;
        }

        function errFunc(errTxt) {
            $btn.text("Post");
            $('#defaultData').hide();
            $('#responseData').hide();
            $('#errorData').show();
            if (errTxt !== "") {
                $('#errorText').text(errTxt + " !!!").show();
            } else {
                $('#errorText').text("").hide();
            }
        }

        if (!confirm("Request to be sent: \n" + $('#restQuery').val())) {
            $btn.text("Post");
            return;
        } else {
            $('#errorData').hide();
            $('#responseText').html("<pre> ??? </pre>");
        }

        $.ajax({
            type: "post",
            crossDomain: true,  // else: error=NoTransport!
            url: encodeURI($('#restQuery').val()),
            //data: jsonInputTxt,
            dataType: "json",
            cache: false,

            // force CORS preflight request?
            beforeSend: function (xhr) {
                if ($('#addXTestHeader').is(':checked')) {
                    xhr.setRequestHeader('X-Test-Header', 'x-test-value');
                }
            },
            // from jQuery 1.5: headers: {"X-Test-Header": "test-value"},

            success: function (data, code) {
                if (!data) {
                    if (code !== "success") {
                        errFunc("");
                        return;
                    }
                }
                $btn.text("Post");
                $('#defaultData').hide();
                $('#errorData').hide();
                $('#responseData').show();
                var jsonText = "";

                if (!data) {
                    jsonText = code;
                } else {
                    jsonText = JSON.stringify(data, null, 4);
                }                
                $('#responseText').html("<pre>" + jsonText + "</pre>");

            },
            error: function (xhr, errType, thrownError) {
                errFunc(errType + " " + xhr.statusText);
            }
        });
    })


    // DELETE handlers
    $('#deleteBtn').click(function () {
        var $btn = $(this);
        $btn.text("Deleting...");

        // default:
        if ($('#urlToDelete').val().length == 0) {
            $('#urlToDelete').val("http://localhost:8111");
        }
        if ($('#urlToDelete').val() === "enter URL" ||
            (!$('#urlToDelete').val().match("^http://") && !$('#urlToDelete').val().match("^https://"))) {
            alert("Wrong URL format!");
            $btn.text("Delete");
            return;
        }

        function errFunc(errTxt) {
            $btn.text("Delete");
            $('#defaultData').hide();
            $('#responseData').hide();
            $('#errorData').show();
            if (errTxt !== "") {
                $('#errorText').text(errTxt + " !!!").show();
            } else {
                $('#errorText').text("").hide();
            }
        }

        $.ajax({
            type: "delete",
            crossDomain: true, 
            url: $('#urlToDelete').val(),
            dataType: "json",
            cache: false,

            success: function (data, code) {
                if (code !== "success") {
                    errFunc(code);
                    return;
                }
                $btn.text("Delete");
                $('#defaultData').hide();
                $('#errorData').hide();
                $('#responseData').show();

                $('#responseText').html("<pre>" + code + "</pre>");
            },
            error: function (xhr, errType, thrownError) {
                errFunc(errType + " \"" + xhr.statusText + "\"");
            }
        });
    })

});

