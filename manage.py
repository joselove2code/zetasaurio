import sys

from generation.commands import generate_items, import_from_psd, update_base_cid

COMMANDS = {
    "generate-items": generate_items.execute,
    "import-from-psd": import_from_psd.execute,
    "update-base-cid": update_base_cid.execute,
}

def run(command: str):
    if command in COMMANDS.keys():
        COMMANDS[command]()
    else:
        raise ValueError(f'Command not found: {command}')

if __name__ == '__main__':
    command = sys.argv[1]
    run(command)