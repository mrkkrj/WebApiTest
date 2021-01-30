import http.client
import urllib.parse
import json
import sys

from urllib.parse import urlparse


class PatchRequest(object):
    """A class for issuing HTTP PATCH requests"""

    def patch(self, url, attrName, attrValue) :
        """Patches an attribute of a resource"""
        contentTag = "?contentType=" 
        contentValue = ""
        ifMatchTag = "?ifMatch="
        ifMatchValue = ""
        originTag = "?origin="
        originValue = ""

        try :
            # contentType?
            pos = url.find(contentTag) 
            if pos != -1:
                contentValue = url[pos + len(contentTag) :]
                url = url[:pos]

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

            o = urlparse(url)

            host = o.netloc
            path = o.path

            conn = http.client.HTTPConnection(host)

            headers = {}
            if contentValue:
                headers = {'Content-type': contentValue }
            else:
                headers = {'Content-type': 'application/json'} # default!

            if ifMatchValue:
                headers['If-Match'] = '"{0}"'.format(ifMatchValue);

            if originValue:
                headers['Origin'] = originValue;
                        
            # simple string or JSON object?
            data = {}
            attrValue.lstrip()

            if attrValue.startswith('{') or attrValue.startswith('[') :
                data[attrName] = json.loads(attrValue)
            else:
                data[attrName] = attrValue

            # send it!
            jsonData = json.dumps(data)
            conn.request('PATCH', path, jsonData, headers)

            resp = conn.getresponse()
            respData = resp.read().decode("utf-8")

            if resp.code != 200:
                return ("ERROR", resp.reason) 
            
            if ifMatchValue:
                return ("OK", resp.info()['etag'] + '\n' + respData)
            elif originValue:
                if resp.info()['access-control-allow-origin']:
                    return ("OK", resp.info()['access-control-allow-origin'] + '\n' + respData)
                else:
                    return ("ERROR", "no Access-Control-Allow-Origin in response")
            else:
                return ("OK", respData) 

        except http.client.HTTPException as e:
            # client error
            return ("ERROR", str(e))
        except ValueError as e:
            # URL syntax error
            return ("ERROR", str(e))
        except TypeError as e:
            # URL syntax error
            return ("ERROR", str(e))

# test
if __name__ == "__main__":
    req = PatchRequest()

    if len(sys.argv) != 4 :
        print('{ "error": "expecting 3 arguments' + ", got {0}!".format(len(sys.argv) - 1) + '"}')
    elif sys.argv[1] == 'TEST' :
        # OK string attr.
        okStatus, okResp = req.patch("http://localhost:8111/resources/templates/{c2dda196-400f-4320-9dca-a6ed49ccde4f}", \
            "description", "new DESCR...")
        print(okResp)

        # OK string attr.
        okStatus, okResp = req.patch("http://localhost:8111/resources/templates/{c2dda196-400f-4320-9dca-a6ed49ccde4f}?ifMatch=aaaabbbbcccc", \
            "description", "new DESCR...")
        print(okResp)

        # OK JSON attr.
        okStatus, okResp = req.patch("http://localhost:8111/resources/templates/{c2dda196-400f-4320-9dca-a6ed49ccde4f}", \
            "parameters", "[]")
        print(okResp)

        # ERR: content type
        okStatus, okResp = req.patch("http://localhost:8111/resources/templates/{c2dda196-400f-4320-9dca-a6ed49ccde4f}?contentType=application/xml", \
            "description", "new DESCR...")
       
        # ERR
        errStatus, errResp = req.patch("http://localhost:8111/resources/templates/{c2dda196-400f-4320-9dca-a6ed49ccde4f}", \
            "text", "froogle is cool!")
        print(errResp)
    else :
        # regular script invocation
        status, resp= req.patch(sys.argv[1], sys.argv[2], sys.argv[3])
        if status == "ERROR":
            print('{{ "error": "{0}" }}'.format(resp))
        else:
            print(resp)

