import tempfile
import subprocess
import os

def run_in_sandbox(job_id: str, files: dict[str, str], test_command: str):
    """
    In production, this should spin up a Docker container and mount the files inside.
    For local development since Docker daemon might not be running, 
    we simulate it using a temporary directory and subprocess.
    """
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Write files
        for filepath, content in files.items():
            full_path = os.path.join(temp_dir, filepath)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w") as f:
                f.write(content)
        
        # Execute command
        try:
            result = subprocess.run(
                test_command, 
                shell=True, 
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=10
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "error": result.returncode != 0
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Execution timed out.",
                "error": True
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "error": True
            }
