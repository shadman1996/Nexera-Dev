import os

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)
    return "File written successfully"

def delete_file(path):
    if os.path.exists(path):
        os.remove(path)
        return "File deleted successfully"
    else:
        return "File does not exist"

def list_files(directory):
    return [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]