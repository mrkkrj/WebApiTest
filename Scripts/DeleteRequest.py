from urllib.request import Request, urlopen, build_opener, HTTPHandler
from urllib.error import URLError, HTTPError
#import json
import sys


class DeleteRequest(object):
    """A class for issuing HTTP DELETE requests"""

    def delete(self, url) :
        """Deletes an existing resource"""
        ifMatchTag = "?ifMatch=" 
        ifMatchValue = ""
        originTag = "?origin="
        originValue = ""

        try :
            # ifMatch?
            pos = url.find(ifMatchTag) 
            if pos != -1:
                ifMatchValue = url[pos + len(ifMatchTag) :]
                url = url[:pos]

            # origin?
            pos = url.find(originTag) 
            if pos != -1:
                originValue = url[pos + len(originTag) :]
                url = url[:pos]

            opener = build_opener(HTTPHandler)
            req = Request(url)
            req.get_method = lambda: 'DELETE'

            if ifMatchValue:
                req.add_header('If-Match', '"{0}"'.format(ifMatchValue))

            if originValue:
                req.add_header('Origin', originValue)

            resp = opener.open(req)
            content = resp.read()   

            if originValue:
                if resp.info()['access-control-allow-origin']:
                    return ("OK", resp.info()['access-control-allow-origin'] + '\n' + content.decode("utf-8"))
                else:
                    return ("ERROR", "no Access-Control-Allow-Origin in response")
            else:
                return ("OK", content.decode("utf-8"))  
                          
        except URLError as e :
            if hasattr(e, 'reason') and len(e.reason) != 0:
                # no connection to serevr
                return ("ERROR", e.reason)
            elif hasattr(e, 'code') :
                # server error
                return ("ERROR", e.code)
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e))
        except TypeError as e:
            # URL syntax error
            return ("ERROR", str(e))

# test
if __name__ == "__main__":
    req = DeleteRequest()

    if len(sys.argv) != 2 :
        print('{ "error": "expecting an arg!"}')
    elif sys.argv[1] == 'TEST' :
        errStatus, errResp = req.delete("http://localhost:8111/jobs/xxx")
        print(errResp)

        status, resp = req.delete("http://localhost:8111/jobs/{545f04a6-a0c5-40f6-9faf-48e17543643c}")
        print(resp)       
    else :
        # regular script invocation
        status, resp= req.delete(sys.argv[1])
        if status == "ERROR":
            print('{{ "error": "{0}" }}'.format(resp))
        else:
            print(resp)

