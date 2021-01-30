from urllib.request import Request, urlopen, build_opener, HTTPHandler
from urllib.error import URLError, HTTPError
import urllib.parse
import json
import sys

import http.client
from urllib.parse import urlparse


class PutRequest(object):
    """A class for issuing HTTP PUT requests.
       Retunrs status, response body and, if new resource was created, the location header"""

    def putFileArgs(self, url, params, localFilePath) :
        """Updates/creates a job file or file resources, takes metadata by params"""
        ifMatchTag = "?ifMatch=" # appended to URL
        ifMatchValue = ""
        originTag = "?origin="  # appended to params
        originValue = ""

        try :
            # ifMatch?
            pos = url.find(ifMatchTag) 
            if pos != -1:
                ifMatchValue = url[pos + len(ifMatchTag) :]
                url = url[:pos]

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

            if ifMatchValue:
                req.add_header('If-Match', '"{0}"'.format(ifMatchValue))

            if originValue:
                req.add_header('Origin', originValue)

            opener = build_opener(HTTPHandler)
            req.get_method = lambda: 'PUT'
            resp = opener.open(req)

            content = resp.read()   

            if ifMatchValue:
                if resp.info()['etag']:
                    return ("OK", content.decode("utf-8"), '{0}\n{1}'.format(resp.info()['etag'], resp.info()['location']))   
                else:
                    return ("ERROR", "no ETag in response", "")
            elif originValue:
                if resp.info()['access-control-allow-origin']:
                    return ("OK", content.decode("utf-8"), '{0}\n{1}'.format(resp.info()['access-control-allow-origin'], resp.info()['location']))
                else:
                    return ("ERROR", "no Access-Control-Allow-Origin in response", "")
            else:
                return ("OK", content.decode("utf-8"), resp.info()['location'])  

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

    def putFile(self, url, localFilePath) :
        """Updates an existing file without arguments"""
        try :
            with open(localFilePath, 'rb') as f: 
               data = f.read()
                                         
            req = Request(url, data)

            opener = build_opener(HTTPHandler)
            req.get_method = lambda: 'PUT'
            resp = opener.open(req)

            content = resp.read()   

            return ("OK", content.decode("utf-8"), resp.info()['location'])    
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

    def putJson(self, url, jsonData) :
        """Updates resource using JSON data"""
        try :
            o = urlparse(url)

            host = o.netloc
            path = o.path
            headers = {'Content-type': 'application/json'}

            conn = http.client.HTTPConnection(host)

            jsonStrg = json.dumps(jsonData)
            conn.request('PUT', path, jsonStrg, headers)

            resp = conn.getresponse()
            respData = resp.read().decode("utf-8")

            if resp.code == 200 or resp.code == 204: # Ok & NoContent
                return ("OK", respData, '')
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

# test
if __name__ == "__main__":
    req = PutRequest()

    if len(sys.argv) < 3 :
        print('{ "error": "expecting at least 2 args!"}')
    elif sys.argv[1] == 'RESTEST' :
        # OK - update spotcolor resource
        okStatus, okResp, loc = req.putFileArgs("http://localhost:8111/resources/spotcolor/rulesets/{d043f8d5-2cba-4173-b5a2-614a9f33b80f}", "file-name=test SpotColor Ruleset.scs", \
                                                 r"C:\Work\Develop\Main\Source\Test\TestData\test SpotColor Ruleset.scs")
        print(okResp)

        # err
        errStatus, errResp, loc = req.putFileArgs("http://localhost:8111/resources/spotcolor/rulesets/xxx", "file-name=test SpotColor Ruleset.scs", \
                                                  r"C:\Work\Develop\Main\Source\Test\TestData\test SpotColor Ruleset.scs")
        print(errResp)

        # JSON
        jsonData = json.loads('{"id" : "alpha"}')
        errStatus, errResp, loc = req.putJson("http://localhost:8111/hotfolders/xxxxxxx", jsonData)
        print(errResp, loc)
        
    elif sys.argv[1] == 'FILETEST' :
        if len(sys.argv) != 4 :
            print('{ "error": "expecting 3 args!"}')
        else:
            # OK - upload a job input file
            okStatus, okResp, loc = req.putFileArgs("http://localhost:8111/files/xxx", "file-name=wall.jpg&client-id=mrkkrj", \
                                                    r"C:\Work\Develop\Main\Source\Test\WebGui\image\wall.jpg")
            print(okResp, loc)

            # err
            errStatus, errResp, loc = req.putFileArgs("http://localhost:8111/resources/spotcolor/xxxx", "file-name=test.scs", \
                                                     r"C:\Work\Develop\Main\Source\Test\WebGui\image\wall.jpg")
            print(errResp)

            errStatus1, errResp1, loc = req.putFileArgs("http://localhost:8111/files/xxx", "file-name=wall.jpg&client-id=mrkkrj", \
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
                status, resp, location = req.putJson(sys.argv[1], jsonData)
            else:
                status, resp, location = req.putFile(sys.argv[1], sys.argv[2])
        else:
            #file            
            status, resp, location = req.putFileArgs(sys.argv[1], sys.argv[2], sys.argv[3])

        if status == "ERROR":
            print('{{ "error": "{0}" }}'.format(resp))
        else:
            print('{0}\n{1}'.format(location, resp))

