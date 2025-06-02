import os
import requests
import subprocess
import shutil

# Configuration
API_KEY = '55a4dffe65c9466d947ce2eb1d4d20a6'  # Replace with your actual API key
SEARCH_QUERY = 'sensor'
DOWNLOAD_DIR = 'downloads'
CONVERTED_DIR = 'static/assets/3d'
BLENDER_PATH = 'C:\blender-4.4.3-windows-x64'  # Replace with your Blender executable path
CONVERT_SCRIPT = 'convert.py'

# Ensure directories exist
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(CONVERTED_DIR, exist_ok=True)

# Step 1: Search for models on Poly Pizza
search_url = f'https://poly.pizza/api/v1.1/search?query={SEARCH_QUERY}&license=cc0'
headers = {'Authorization': f'Bearer {API_KEY}'}

response = requests.get(search_url, headers=headers)
if response.status_code != 200:
    print(f"Error fetching models: {response.status_code}")
    exit(1)

models = response.json().get('results', [])
print(f"Found {len(models)} models.")

# Step 2: Download and stage each model
for model in models:
    model_id = model['id']
    model_name = model['name'].replace(' ', '_')
    download_url = f'https://poly.pizza/api/v1.1/models/{model_id}/download'

    # Download the model
    print(f"Downloading {model_name}...")
    model_response = requests.get(download_url, headers=headers, stream=True)
    if model_response.status_code != 200:
        print(f"Failed to download {model_name}")
        continue

    zip_path = os.path.join(DOWNLOAD_DIR, f'{model_name}.zip')
    with open(zip_path, 'wb') as f:
        for chunk in model_response.iter_content(chunk_size=8192):
            f.write(chunk)

    # Extract the ZIP file
    extract_path = os.path.join(DOWNLOAD_DIR, model_name)
    shutil.unpack_archive(zip_path, extract_path)

    # Find model file
    model_file = None
    for root, _, files in os.walk(extract_path):
        for file in files:
            if file.endswith(('.obj', '.fbx', '.dae', '.blend')):
                model_file = os.path.join(root, file)
                break
        if model_file:
            break

    if not model_file:
        print(f"No supported 3D model found for {model_name}")
        continue

    # Convert via Blender
    print(f"Converting {model_name} using Blender...")
    output_path = os.path.abspath(os.path.join(CONVERTED_DIR, f'{model_name}.glb'))
    subprocess.run([
        BLENDER_PATH, "--background", "--python", CONVERT_SCRIPT,
        "--", os.path.abspath(model_file), output_path
    ])

    # Clean up
    shutil.rmtree(extract_path)
    os.remove(zip_path)

print("All models processed.")