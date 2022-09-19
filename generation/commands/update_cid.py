import argparse
import sys

from generation.services import base_cid_updater


class UpdateCidArgs(argparse.Namespace):
    cid: str


def validate_args(args: UpdateCidArgs):
    if args.cid is None or args.cid == '':
        raise ValueError('The cid cannot be blank')


def parse_args() -> UpdateCidArgs:
    parser = argparse.ArgumentParser('Update base cid of the items metadata.')
    parser.add_argument('cid', type=str, help='The cid to be set.')

    return parser.parse_args(sys.argv[2:])


def process_args() -> UpdateCidArgs:
    args = parse_args()
    validate_args(args)

    return args


def execute():
    args = process_args()
    base_cid_updater.update_base_cid(args.cid)


if __name__ == '__main__':
    execute()
