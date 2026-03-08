import requests

url = "https://handwritten-ai-server-9183885350.us-central1.run.app/process_exam"

files = {
    'file': ('test.jpg', open('test.jpg', 'rb'), 'image/jpeg')
}
data = {
    'mode': 'grade',
    'rubric': 'Grade based on general correctness.'
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
