import json
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://handwritten-ai-system-default-rtdb.firebaseio.com/professors/rWdtn7SqluUsuEoBRbUOhfWcKOj1/classes/-OmYxYnZ9PLsNnQsZnik.json"

req = urllib.request.Request(url)
response = urllib.request.urlopen(req, context=ctx)
data = json.loads(response.read().decode())
print("DATA:")
print(json.dumps(data, indent=2))
