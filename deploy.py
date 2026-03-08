import subprocess

with open('deploy_log.txt', 'w') as f:
    process = subprocess.Popen(
        ['firebase', 'deploy', '--only', 'hosting', '--non-interactive'],
        stdout=f,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True
    )
    process.wait()
