"""
Script to fix faab_remaining for eliminated teams in 2025 data.
Sets faab_remaining = 1000 - faab_spent instead of 0.
"""

import json
from pathlib import Path

STARTING_FAAB = 1000

def main():
    data_dir = Path(__file__).parent.parent / "frontend" / "data"
    json_file = data_dir / "2025.json"

    print(f"Processing 2025...")

    with open(json_file, "r") as f:
        data = json.load(f)

    # Fix faab_remaining for all managers
    for manager in data["managers"]:
        faab_spent = manager.get("faab_spent", 0)
        old_remaining = manager.get("faab_remaining", 0)
        new_remaining = STARTING_FAAB - faab_spent

        if old_remaining != new_remaining:
            print(f"  {manager['user_name']}: ${old_remaining} -> ${new_remaining} (spent: ${faab_spent})")
            manager["faab_remaining"] = new_remaining

    # Write back
    with open(json_file, "w") as f:
        json.dump(data, f, indent=2)

    print("Done!")

if __name__ == "__main__":
    main()
