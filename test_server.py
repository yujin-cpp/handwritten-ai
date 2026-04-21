import requests

url = "https://handwritten-ai-server-1093390926434.us-central1.run.app/transcribe"
data = {
    'mode': 'grade'
}

# Create a dummy image
from PIL import Image
img = Image.new('RGB', (100, 100), color = 'red')
img.save('test.jpg')

files = {
    'file': ('test.jpg', open('test.jpg', 'rb'), 'image/jpeg')
}

response = requests.post(url, files=files, data=data)
print(response.status_code)
print(response.json())
