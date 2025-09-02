#!/usr/bin/env python3
# codetree.py
import argparse
import os
import sys

CODE_EXTS = {
    ".c",".h",".cpp",".hpp",".cc",".hh",".m",".mm",
    ".py",".ipynb",
    ".js",".jsx",".ts",".tsx",
    ".java",".kt",".kts",
    ".go",".rs",".rb",".php",".swift",".cs",
    ".html",".htm",".css",".scss",".sass",
    ".sql",".yml",".yaml",".toml",".ini",".md",".json",".xml",
    ".sh",".bash",".zsh",".ps1",".bat",".make",".mk",".gradle",".dockerfile",".env"
}

def is_code_file(name, exts=None):
    if exts is None:
        exts = CODE_EXTS
    lower = name.lower()
    # special cases without dot (e.g., Dockerfile, Makefile)
    specials = {"makefile", "dockerfile"}
    if lower in specials:
        return True
    _, ext = os.path.splitext(lower)
    return ext in exts

def list_tree(root, max_depth=None, only_code=False, ignore=[], exts=None, show_hidden=False):
    root = os.path.abspath(root)
    lines = []
    if not os.path.exists(root):
        raise FileNotFoundError(root)

    def filtered(entries, current_depth):
        # hide dotfiles unless show_hidden
        items = []
        for e in entries:
            name = e.name
            if not show_hidden and name.startswith('.'):
                continue
            if any(part in ignore for part in e.path.split(os.sep)):
                continue
            if e.is_file():
                if only_code and not is_code_file(name, exts):
                    continue
            items.append(e)
        # sort: dirs first, then files, both case-insensitive
        items.sort(key=lambda x: (not x.is_dir(), x.name.lower()))
        return items

    def walk(dirpath, prefix="", depth=0):
        try:
            with os.scandir(dirpath) as it:
                entries = [e for e in it]
        except PermissionError:
            lines.append(f"{prefix}└── [denied] {os.path.basename(dirpath)}/")
            return

        # depth limit
        if max_depth is not None and depth >= max_depth:
            return

        entries = filtered(entries, depth)
        count = len(entries)

        for idx, e in enumerate(entries):
            connector = "└── " if idx == count - 1 else "├── "
            line = f"{prefix}{connector}{e.name}"
            if e.is_dir():
                line += "/"
            lines.append(line)
            if e.is_dir():
                if max_depth is None or depth + 1 < max_depth:
                    extension = "    " if idx == count - 1 else "│   "
                    walk(os.path.join(dirpath, e.name), prefix + extension, depth + 1)

    # print root
    lines.append(os.path.basename(root) + "/")
    walk(root, "", 0)
    return lines

def main():
    p = argparse.ArgumentParser(description="Pretty directory tree with box-drawing characters.")
    p.add_argument("path", nargs="?", default=".", help="Root folder (default: .)")
    p.add_argument("--max-depth", type=int, help="Limit traversal depth (0=list root only).")
    p.add_argument("--only-code", action="store_true", help="Show only code-ish files.")
    p.add_argument("--exts", help="Comma-separated extra file extensions to include (e.g. .tex,.r).")
    p.add_argument("--ignore", default="node_modules,.git,.venv,.idea,.vscode,__pycache__",
                   help="Comma-separated names to ignore (default common junk).")
    p.add_argument("--show-hidden", action="store_true", help="Include dotfiles and dotfolders.")
    p.add_argument("--markdown", action="store_true", help="Wrap output in ```text code block.")
    p.add_argument("--output", "-o", help="Write to a file instead of stdout.")
    args = p.parse_args()

    exts = set(CODE_EXTS)
    if args.exts:
        for e in args.exts.split(","):
            e = e.strip()
            if e and not e.startswith("."):
                e = "." + e
            exts.add(e.lower())

    ignore = [s.strip() for s in args.ignore.split(",") if s.strip()]

    try:
        lines = list_tree(
            args.path,
            max_depth=args.max_depth,
            only_code=args.only_code,
            ignore=ignore,
            exts=exts,
            show_hidden=args.show_hidden
        )
    except FileNotFoundError as e:
        print(f"Error: path not found: {e}", file=sys.stderr)
        sys.exit(1)

    text = "\n".join(lines)
    if args.markdown:
        text = "```text\n" + text + "\n```"

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        print(text)

if __name__ == "__main__":
    main()
