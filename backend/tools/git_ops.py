import subprocess
from backend.tools.shell_ops import run_command

def git_init(path):
    return run_command('git init', cwd=path)

def git_add(path, files):
    return run_command(f'git add {files}', cwd=path)

def git_commit(path, message):
    return run_command(f'git commit -m "{message}"', cwd=path)

def git_log(path, n=10):
    result = run_command(f'git log -n {n}', cwd=path)
    logs = result['stdout'].strip().split('\n')
    return [{'commit_hash': log.split()[0], 'author': log.split(' ')[4], 'message': ' '.join(log.split()[5:])} for log in logs]