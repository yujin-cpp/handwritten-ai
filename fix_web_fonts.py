import os
import shutil

dist_dir = 'dist'
assets_dir = os.path.join(dist_dir, 'assets')
old_node_modules = os.path.join(assets_dir, 'node_modules')
new_modules = os.path.join(assets_dir, 'fonts')

if os.path.exists(old_node_modules):
    # Rename node_modules to fonts
    if os.path.exists(new_modules):
        shutil.rmtree(new_modules)
    shutil.move(old_node_modules, new_modules)
    print("Renamed assets/node_modules to assets/fonts")

    # Replace references in all JS, HTML, CSS files
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.html') or file.endswith('.css'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    new_content = content.replace('/assets/node_modules/', '/assets/fonts/')

                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated references in {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
else:
    print("assets/node_modules not found, no need to replace.")
