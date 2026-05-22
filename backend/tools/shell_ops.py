import subprocess

def run_command(cmd, cwd='.', timeout=None):
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout
    )
    return {
        'stdout': result.stdout,
        'stderr': result.stderr,
        'exit_code': result.returncode
    }