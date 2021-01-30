from urllib.request import Request, urlopen, build_opener, HTTPHandler
from urllib.error import URLError, HTTPError
import sys

class OptionsRequest(object):
    """A class for issuing HTTP OPTIONS requests"""

    def getOptions(self, url) :
        """Gets the OPTIONS headers for a resource"""
        originTag = "?origin="
        originValue = ""
        methodTag = "&method=" # must be second
        methodValue = ""
        headerTag = "&header=" # optional, must be third, after method!
        headerValue = ""

        try :
            # origin?
            pos = url.find(originTag) 
            if pos != -1:
                # method expected!
                pos2 = url.find(methodTag) 
                if pos2 != -1:
                    # header?
                    pos3 = url.find(headerTag)
                    if pos3 != -1:
                        headerValue = url[pos3 + len(headerTag) :]
                        url = url[:pos3]

                    methodValue = url[pos2 + len(methodTag) :]
                else:
                    return ("ERROR", methodTag + " expected!")

                originValue = url[pos + len(originTag) : pos2]
                url = url[:pos]

            req = Request(url)   
                
            if originValue:
                req.add_header('Origin', originValue)                          
                req.add_header('Access-Control-Request-Method', methodValue) 
                if headerValue:
                    req.add_header('Access-Control-Request-Headers', headerValue) 

            opener = build_opener(HTTPHandler)
            req.get_method = lambda: 'OPTIONS'
            resp = opener.open(req)

            content = resp.read()  
            headers = ""
                    
            for key in resp.info().keys():
                headers +=  key  + ":" + resp.info()[key] + '\n'

            return ("OK", headers)

        except URLError as e :
            if hasattr(e, 'reason') and len(e.reason) != 0:
                # no connection to server?
                if e.reason == "Not Modified":
                    return ("OK", "Not Modified")  # ifModifSince used!
                else:
                    return ("ERROR", e.reason)
            elif hasattr(e, 'code') :
                # server error
                return ("ERROR", e.code)
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e))

# test
if __name__ == "__main__":
    req = OptionsRequest()

    if len(sys.argv) < 2 :
        print('{ "error": "expecting alt least one arg!"}')
    elif sys.argv[1] == 'TEST' :
        # OK
        okStatus, okResp = req.getOptions("http://localhost:8111/resources")
        print(okResp)

        # Error
        errStatus, errResp = req.getOptions("http://localhost:8111/resources?origin=null")
        print(errResp)

        # OK
        okStatus, okResp = req.getOptions("http://localhost:8111/resources?origin=null&method=GET")
        print(okResp)

        # OK
        okStatus, okResp = req.getOptions("http://localhost:8111/resources?origin=null&method=GET&header=X-My-Own-Extension")
        print(okResp)

    else :
        # regular script invocation
        status = ""
        resp = ""

        if len(sys.argv) == 2 :
            status, resp= req.getOptions(sys.argv[1])
        else:
            print('{ "error": "too many arguments!"}')

        if status == "ERROR":
            print('{{ "error": "{0}" }}'.format(resp))
        else:
            print(resp)


