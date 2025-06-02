# convert.py
import bpy
import sys
import os

# Get arguments after '--'
argv = sys.argv[sys.argv.index("--") + 1:]
input_path, output_path = argv

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import based on file extension
ext = os.path.splitext(input_path)[-1].lower()
if ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=input_path)
elif ext == ".obj":
    bpy.ops.import_scene.obj(filepath=input_path)
elif ext in [".glb", ".gltf"]:
    bpy.ops.import_scene.gltf(filepath=input_path)
else:
    raise Exception(f"Unsupported format: {ext}")

# Export to binary glTF (.glb)
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_apply=True
)
