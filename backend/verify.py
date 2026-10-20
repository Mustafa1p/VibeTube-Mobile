"""Read-only live gateway checks. Does not retrieve or print signed media URLs."""
import json
import urllib.request
import urllib.error

ROOT = "https://vibetubemobile.ipxer.online/api.php"

def call(query, origin="https://mustafa1p.github.io"):
    try:
        r = urllib.request.urlopen(urllib.request.Request(ROOT + query, headers={"Origin": origin}), timeout=45)
    except urllib.error.HTTPError as e:
        r = e
    payload = r.read()
    return r.status, r.headers, json.loads(payload) if payload else {}

assert call("?action=health")[0] == 200
assert call("?action=health", "https://untrusted.example")[0] == 403
assert call("?action=video&id=invalid")[0] == 410
assert call("?action=media&token=invalid")[0] == 410
assert call("?action=media&token=" + "0" * 48)[0] == 410
status, headers, data = call("?action=search&q=Blender%20open%20movie")
assert status == 200 and len(data["items"]) > 0
assert headers.get("Access-Control-Allow-Origin") == "https://mustafa1p.github.io"
print(json.dumps({"validation": "passed", "searchStatus": status, "searchResults": len(data["items"])}))
assert call("?action=avatar&channel=invalid")[0] == 400
status, _, data = call("?action=avatar&channel=UCLvosihu-bZYaSkQ8zxcaeA")
assert status == 200 and (data.get("url") or "").startswith("https://yt3."), "Channel avatar did not resolve"
print(json.dumps({"avatarStatus": status, "resolvedChannelPhoto": bool(data.get("url")), "customPlayback": "retired"}))
