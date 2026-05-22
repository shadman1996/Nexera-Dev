import os
import subprocess
import shlex
import shutil

class DockerSandbox:
    def __init__(self, workspace_dir: str):
        self.workspace_dir = os.path.abspath(workspace_dir)
        self.container_name = "nexera-sandbox"
        self.image_name = "nikolaik/python-nodejs:python3.11-nodejs20"
        self._is_active = None
        self._checked = False

    @property
    def is_active(self) -> bool:
        """Returns True if the Docker daemon is available and we can use the sandbox."""
        if not self._checked:
            self.check_docker_status()
        return self._is_active

    def check_docker_status(self) -> bool:
        """Executes a quick, non-blocking check to verify if the Docker CLI is available and functional."""
        self._checked = True
        # First, check if docker executable is in PATH
        if not shutil.which("docker"):
            self._is_active = False
            return False
        
        # Next, check if we can contact the Docker daemon
        try:
            # Run 'docker info' with a short timeout to prevent hanging
            res = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._is_active = (res.returncode == 0)
        except Exception:
            self._is_active = False
            
        return self._is_active

    def ensure_container_running(self) -> bool:
        """
        Ensures the 'nexera-sandbox' container is created and running.
        If Docker is active, starts/resumes it. If missing, returns False gracefully.
        """
        if not self.is_active:
            return False

        try:
            # Check if container exists (running or stopped)
            res = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name={self.container_name}", "--format", "{{.Status}}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            status_output = res.stdout.strip()

            if not status_output:
                # Container does not exist. Create and run it in background
                # Bind-mount workspace_dir to /workspace inside the container
                # Note: Windows absolute paths (like D:\Nexera\workspace) are formatted for Docker mount
                docker_volume = f"{self.workspace_dir}:/workspace"
                subprocess.run(
                    [
                        "docker", "run", "-d",
                        "--name", self.container_name,
                        "-v", docker_volume,
                        "-w", "/workspace",
                        self.image_name,
                        "tail", "-f", "/dev/null"
                    ],
                    capture_output=True,
                    text=True,
                    timeout=15,
                    check=True
                )
            elif "Up" not in status_output:
                # Container exists but is stopped. Start it.
                subprocess.run(
                    ["docker", "start", self.container_name],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=True
                )
            return True
        except Exception as e:
            # If starting Docker fails for some unexpected permission/port error, fallback
            print(f"[DockerSandbox] Failed to ensure container is running: {e}. Falling back to host mode.")
            self._is_active = False
            return False

    def wrap_command(self, cmd, cwd: str = "/workspace"):
        """
        Wraps a command (either string or list) to run inside the Docker sandbox.
        If Docker sandbox is inactive, returns the raw command untouched.
        """
        if not self.is_active:
            return cmd

        # Ensure container is actively running
        self.ensure_container_running()

        if isinstance(cmd, list):
            # For a list, wrap it directly
            return ["docker", "exec", "-w", cwd, self.container_name] + cmd
        elif isinstance(cmd, str):
            # For a string command (designed to run in shell=True), execute it through sh inside the container
            return f"docker exec -w {cwd} {self.container_name} sh -c {shlex.quote(cmd)}"
        
        return cmd

    def get_terminal_spawner(self) -> list:
        """
        Returns the command/executable list to spawn terminal session.
        If Docker sandbox is active, runs interactive bash inside the container.
        Otherwise, falls back to native powershell.
        """
        if self.is_active and self.ensure_container_running():
            # Run bash (or sh as backup) inside container interactively
            # Using exec -it
            return ["docker", "exec", "-it", self.container_name, "bash"]
        else:
            # Native PowerShell host fallback
            return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass"]
