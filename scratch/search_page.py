import os
import sys

target = r"d:\Nexera\mobile\src\app\page.tsx"
query = "powershell"

with open(target, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if query.lower() in line.lower():
        # encode to utf-8 safe printing or ignore characters
        sys.stdout.buffer.write(f"{i+1}: {line.strip()}\n".encode('utf-8'))
