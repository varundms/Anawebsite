import os, shutil, glob

source_dir = r"C:\Users\Yash.Hulawale\.gemini\antigravity\brain\ae92506c-d39a-4cb0-8c13-7e07d22acd55\.tempmediaStorage"
dest_file = r"C:\Users\Yash.Hulawale\.gemini\antigravity\scratch\heyxia-ana\heyxia-ana\assets\screenshots\mis.png"

files = glob.glob(os.path.join(source_dir, "*.png"))
if files:
    newest = max(files, key=os.path.getmtime)
    print("Newest file:", newest)
    shutil.copy(newest, dest_file)
    print("Copied successfully to", dest_file)
else:
    print("No PNG files found in", source_dir)
