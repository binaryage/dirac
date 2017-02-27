#!/usr/bin/env python

import sys
from compile_frontend import generate_namespace_externs_to_file

def main():
    path = sys.argv[1]
    generate_namespace_externs_to_file(path)

if __name__ == "__main__":
    main()
