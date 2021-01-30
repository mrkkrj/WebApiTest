from urllib.request import Request, urlopen, build_opener, HTTPHandler
from urllib.error import URLError, HTTPError
import urllib.parse
import json
import sys

import http.client
from urllib.parse import urlparse


class PostRequest(object):
    """A class for issuing HTTP POST requests.
       Retunrs status, response body and location header"""

    def postArgs(self, url, params) :
        """Creates a new resource using request parameters"""
        originTag = "?origin=" 
        originValue = ""

        try :
            # origin?
            pos = params.find(originTag) 
            if pos != -1:
                originValue = params[pos + len(originTag) :]
                params = params[:pos]

            o = urlparse(url)

            host = o.netloc
            path = o.path
            headers = {} 

            if originValue:
                headers['Origin'] = originValue
                
            paramsQuoted = urllib.parse.quote(params, safe='/;=,&')
            pathWithParams = path + "?" + paramsQuoted

            dummyData = urllib.parse.urlencode({ 'dummy' : 0});
            binary_dummyData = dummyData.encode("utf-8")

            conn = http.client.HTTPConnection(host)
            conn.request('POST', pathWithParams, binary_dummyData, headers) # POST expects data!

            resp = conn.getresponse()
            respData = resp.read().decode("utf-8")

            if resp.code == 200 or resp.code == 204: # Ok & NoContent
                return ("OK", respData, '')
            elif resp.code == 201 : # Created
                if originValue:
                    return self._returnWithOrigin(resp, respData)
                else:
                    return ("OK", respData, resp.info()['location'])   
            elif resp.code == 422 : # not supported by Casablanca
                return ("ERROR", "Unprocessable Entity", respData)           
            else:
                return ("ERROR", resp.reason, respData)  

        except http.client.HTTPException as e:
            # client error
            return ("ERROR", str(e), "")
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e), "")
        except TypeError as e:
            # URL syntax error
            return ("ERROR", str(e), "")

    def postJson(self, url, jsonData) :
        """Creates a new resource using JSON data"""
        try :
            o = urlparse(url)

            host = o.netloc
            path = o.path
            headers = {'Content-type': 'application/json'}

            conn = http.client.HTTPConnection(host)

            jsonStrg = json.dumps(jsonData)
            conn.request('POST', path, jsonStrg, headers)

            resp = conn.getresponse()
            respData = resp.read().decode("utf-8")

            if resp.code == 200 or resp.code == 204: # Ok & NoContent
                return ("OK", respData, '')
            elif resp.code == 201 : # Created
                return ("OK", respData, resp.info()['location'])   
            else:
                return ("ERROR", resp.reason, respData)  
           
        except http.client.HTTPException as e:
            # client error
            return ("ERROR", str(e), "")
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e), "")
        except TypeError as e:
            # URL syntax error
            return ("ERROR", str(e), "")                            

    def postFile(self, url, params, localFilePath) :
        """Creates a new file resource, sends metadata in request parameters"""
        originTag = "?origin=" # appemded to params
        originValue = ""

        try :
            # origin?
            pos = params.find(originTag) 
            if pos != -1:
                originValue = params[pos + len(originTag) :]
                params = params[:pos]

            paramsQuoted = urllib.parse.quote(params, safe='/;=,&')
            urlWithParams = url + "?" + paramsQuoted

            with open(localFilePath, 'rb') as f: 
               data = f.read()

            req = Request(urlWithParams, data)
            
            if originValue:
                req.add_header('Origin', originValue)

            opener = build_opener(HTTPHandler)
            req.get_method = lambda: 'POST'
            resp = opener.open(req)

            content = resp.read()  
             
            if resp.code == 201 : # Created
                if originValue:
                    return self._returnWithOrigin(resp, content.decode("utf-8"))
                else:
                    return ("OK", content.decode("utf-8"), resp.info()['location'])   
            else:
                return ("ERROR", resp.reason, content.decode("utf-8"))   

        except URLError as e :
            if hasattr(e, 'reason') :
                # no connection to serevr
                return ("ERROR", e.reason, "")
            elif hasattr(e, 'code') :
                # server error
                return ("ERROR", e.code, "")
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e), "")
        except TypeError as e:
            # URL syntax error
            return ("ERROR", str(e), "")
        except EnvironmentError as e: # parent of IOError, OSError *and* WindowsError
            # local file error
            return ("ERROR", str(e), "")

    # helper
    def _returnWithOrigin(self, resp, respData):
        if resp.info()['access-control-allow-origin']:
            return ("OK", respData, resp.info()['access-control-allow-origin'] + '\n' + resp.info()['location']) 
        else:
            return ("ERROR", "no Access-Control-Allow-Origin in response", "")

# test
if __name__ == "__main__":
    req = PostRequest()

    if len(sys.argv) < 3 :
        print('{ "error": "expecting at least 2 args!"}')
    elif sys.argv[1] == 'TEST' :
        # args
        okStatus, okResp, loc = req.postArgs("http://localhost:8111/resources/templates/xxx", "name=newName&description=no description&worker-id=ImageInversion")
        print(okResp, loc)

        # JSON
        jsonData = json.loads('{"id" : "alpha"}')
        errStatus, errResp, loc = req.postJson("http://localhost:8111/jobs", jsonData)
        print(errResp, loc)
    elif sys.argv[1] == 'FILETEST' :
        if len(sys.argv) != 4 :
            print('{ "error": "expecting 3 args!"}')
        else:
            okStatus, okResp, loc = req.postFile("http://localhost:8111/resources/spotcolor/rulesets/xxx", "file-name=test SpotColor Ruleset.scs", \
                                            r"C:\Work\Develop\Main\Source\Test\TestData\test SpotColor Ruleset.scs")
            print(okResp, loc)

            errStatus, errResp, loc = req.postFile("http://localhost:8111/resources/spotcolor/xxxx", "file-name=test.scs",  \
                                            r"C:\Work\Develop\Main\Source\Test\TestData\test SpotColor Ruleset.scs")
            print(errResp)

            errStatus1, errResp1, loc = req.postFile("http://localhost:8111/resources/spotcolor/rulesets/xxx", "file-name=testSpotColorRuleset.scs",\
                                                 "C:/Windows/System32/xxx.tmp")
            print(errResp1)
    else :
        # regular script invocation
        status = ""
        resp = ""
        location = ""

        if len(sys.argv) == 3 :           
            # args or JSON data?
            if sys.argv[2].startswith('{') or sys.argv[2].startswith('[') :
                jsonData = json.loads(sys.argv[2])
                status, resp, location = req.postJson(sys.argv[1], jsonData)
            else:
                status, resp, location = req.postArgs(sys.argv[1], sys.argv[2])
        else:
            # file
            status, resp, location = req.postFile(sys.argv[1], sys.argv[2], sys.argv[3])

        if status == "ERROR":
            print('{{ "error": "{0}", "detail" : {1} }}'.format(resp, location))
        else:
            print('{0}\n{1}'.format(location, resp))

