from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
#import json
import sys


class GetRequest(object):
    """A class for issuing HTTP GET requests"""

    def getJson(self, url) :
        """Gets an existing resource in JSON format"""
        ifModifTag = "?ifModifiedSince=" 
        ifModifValue = ""
        acceptTag = "?acceptFormat="
        acceptValue = ""
        langTag = "?acceptLanguage="
        langValue = ""
        ifNoneMatchTag = "?ifNoneMatch="
        ifNoneMatchValue = ""
        originTag = "?origin="
        originValue = ""
        getTimestampTag = "?lastModified=true"
        getTimestamp = False

        try :
            # ifModifiedSince?
            pos = url.find(ifModifTag) 
            if pos != -1:
                ifModifValue = url[pos + len(ifModifTag) :]
                ifModifValue = ifModifValue.replace("+", " ")
                # support for trailing params (range tests!)
                pos1 = url.find("&") 
                if pos1 != -1:
                    url = url[:pos] + "?" + url[pos1 + 1:]
                else:             
                    url = url[:pos]

            # acceptFormat?
            pos = url.find(acceptTag) 
            if pos != -1:
                acceptValue = url[pos + len(acceptTag) :]
                url = url[:pos]

            # acceptLanguage?
            pos = url.find(langTag) 
            if pos != -1:
                langValue = url[pos + len(langTag) :]
                url = url[:pos]

            # ifNoneMatch?
            pos = url.find(ifNoneMatchTag) 
            if pos != -1:
                ifNoneMatchValue = url[pos + len(ifNoneMatchTag) :]
                url = url[:pos]

            # origin?
            pos = url.find(originTag) 
            if pos != -1:
                originValue = url[pos + len(originTag) :]
                url = url[:pos]

            # getTimestamp?
            pos = url.find(getTimestampTag) 
            if pos != -1:
                getTimestamp = True;
                url = url[:pos]
                
            req = Request(url)

            if acceptValue:
                req.add_header('Accept', acceptValue)
            else:
                req.add_header('Accept', 'application/json') # default!

            if ifModifValue:
                req.add_header('If-Modified-Since', ifModifValue)

            if langValue:
                req.remove_header('Accept-Language')
                req.add_header('Accept-Language', langValue)

            if ifNoneMatchValue and (ifNoneMatchValue != "false"):
                req.add_header('If-None-Match', '"{0}"'.format(ifNoneMatchValue))      
                
            if originValue:
                req.add_header('Origin', originValue)                          

            resp = urlopen(req)
            content = resp.read()   
        
            if ifNoneMatchValue:
                if resp.info()['etag']:
                    return ("OK", resp.info()['etag'] + '\n' + content.decode("utf-8"))
                else:
                    return ("ERROR", "no ETag in response")
            elif originValue:
                if resp.info()['access-control-allow-origin']:
                    return ("OK", resp.info()['access-control-allow-origin'] + '\n' + content.decode("utf-8"))
                else:
                    return ("ERROR", "no Access-Control-Allow-Origin header in response")
            elif getTimestamp:
                if resp.info()['last-modified']:
                    return ("OK", resp.info()['last-modified'] + '\n' + content.decode("utf-8"))
                else:
                    return ("ERROR", "no Last-Modified header in response")                
            else:
                return ("OK", content.decode("utf-8"))

        #except HTTPError as e :
        #     return ("ERROR", e.reason + e[0]) ??? e.data() ???
        except URLError as e :             
            if hasattr(e, 'reason'):
                if isinstance(e.reason, str) and e.reason == "Not Modified": # caution: can be OS or HTTP error!
                    return ("OK", "Not Modified")  # ifModifSince used!
                else:
                    if hasattr(e, 'code') :
                        return ("ERROR", e.code) # reason missing!
                    else:
                        # no connection to serevr
                        return ("ERROR", e.reason)
            elif hasattr(e, 'code') :
                # server error
                if e.code == 304:
                    return ("OK", "Not Modified")  # ifModifSince used!
                else:
                    return ("ERROR", e.code)
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e))

    def getFile(self, url, localFilePath) :
        """Gets an existing resource as byte stream (i.e. file)"""
        ifNoneMatchTag = "?ifNoneMatch=" 
        ifNoneMatchValue = ""
        originTag = "?origin="
        originValue = ""

        try :
            req = Request(url)
            req.add_header('Accept', 'application/octet-stream')

            # ifNoneMatch?
            pos = url.find(ifNoneMatchTag) 
            if pos != -1:
                ifNoneMatchValue = url[pos + len(ifNoneMatchTag) :]
                url = url[:pos]
                req.add_header('If-None-Match', '"{0}"'.format(ifNoneMatchValue))       

            # origin?
            pos = url.find(originTag) 
            if pos != -1:
                originValue = url[pos + len(originTag) :]
                url = url[:pos]
                if originValue:
                    req.add_header('Origin', originValue)  

            resp = urlopen(req)

            with open(localFilePath, 'wb') as f: 
               f.write(resp.read())              

            if ifNoneMatchValue:
                if resp.info()['etag']:
                    return ("OK", resp.info()['etag'] + '\n' + localFilePath)
                else:
                    return ("ERROR", "no ETag in response")
            elif originValue:
                if resp.info()['access-control-allow-origin']:
                    return ("OK", resp.info()['access-control-allow-origin'] + '\n' + localFilePath)
                else:
                    return ("ERROR", "no Access-Control-Allow-Origin in response")

            return ("OK", localFilePath)                    

        except URLError as e :
            if hasattr(e, 'reason') :
                # no connection to serevr
                return ("ERROR", e.reason)
            elif hasattr(e, 'code') :
                # server error
                return ("ERROR", e.code)
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e))
        except EnvironmentError as e: # parent of IOError, OSError *and* WindowsError
            # local file error
            return ("ERROR", str(e))

# test
if __name__ == "__main__":
    req = GetRequest()

    if len(sys.argv) < 2 :
        print('{ "error": "expecting alt least one arg!"}')
    elif sys.argv[1] == 'TEST' :
        # OK
        okStatus, okResp = req.getJson("http://localhost:8111/resources/templates")
        print(okResp)

        # OK
        okStatus, okResp = req.getJson("http://localhost:8111/resources/templates?ifModifiedSince=Thu,+21+Aug+2014+15:14:25+GMT")
        print(okResp)

        # ERR
        errStatus, errResp = req.getJson("http://localhost:8111/resources/templates[")
        print(errResp)

        # ERR
        errStatus, errResp = req.getJson("http://localhost:8111/resources?xxx=yyy?acceptLanguage=pl-PL")
        print(errResp)

        # ERR
        errStatus, errResp = req.getJson("http://localhost:8111/resources/templates?acceptFormat=application/xml")
        print(errResp)

        # OK
        okStatus, okResp = req.getJson("http://localhost:8111/resources/templates/{caf3d2ee-5de5-4c11-bd02-5851ec55201b}?ifNoneMatch=xxxxx")
        print(okResp)

        # ERR
        errStatus, errResp = req.getJson("http://localhost:8111/templates")
        print(errResp)
    elif sys.argv[1] == 'FILETEST' :
        if len(sys.argv) != 3 :
            print('{ "error": "expecting 2 args!"}')
        else:
            okStatus, okResp = req.getFile("http://localhost:8111/files/{523d0b96-cce7-4803-a773-d7183564b2aa}", "./fileDownload.tmp")
            print(okResp)

            errStatus, errResp = req.getFile("http://localhost:8111/files/xxxx",  "./fileDownload.tmp")
            print(errResp)

            errStatus1, errResp1 = req.getFile("http://localhost:8111/files/{523d0b96-cce7-4803-a773-d7183564b2aa}", "C:/Windows/System32/xxx.tmp")
            print(errResp1)
    else :
        # regular script invocation
        status = ""
        resp = ""

        if len(sys.argv) == 2 :
            status, resp= req.getJson(sys.argv[1])
        else:
            status, resp= req.getFile(sys.argv[1], sys.argv[2])

        if status == "ERROR":
            print('{{ "error": "{0}" }}'.format(resp))
        else:
            print(resp)


