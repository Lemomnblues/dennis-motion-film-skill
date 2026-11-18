#!/usr/bin/env python3
"""Copy the editable Canvas / three.js film into a new project directory."""
import argparse
from pathlib import Path
import shutil
import tempfile

SKILL = Path(__file__).resolve().parents[1]
TEMPLATE = SKILL / 'assets/lhh-film'
PROJECT_FILES = ('brand.json', 'package.json', 'package-lock.json', 'THIRD-PARTY.md')
PROJECT_DIRS = ('src', 'scripts', 'assets', 'analysis')
GENERATED = ('__pycache__', '.DS_Store', '*.pyc', '*.wav', 'mix-review.json',
             'kinetic-cues.json', 'employment-cues.json')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    target = parser.parse_args().destination.expanduser().resolve()
    if target.exists() or SKILL == target or SKILL in target.parents:
        parser.error('Choose a new directory outside the installed skill.')
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent) as staging:
        project = Path(staging) / 'film'
        project.mkdir()
        for name in PROJECT_FILES:
            shutil.copy2(TEMPLATE/name, project/name)
        for name in PROJECT_DIRS:
            shutil.copytree(TEMPLATE/name, project/name, ignore=shutil.ignore_patterns(*GENERATED))
        project.rename(target)
    print(target)
    print('Edit brand.json, then run npm ci and npm run render inside the project.')


if __name__ == '__main__':
    main()
