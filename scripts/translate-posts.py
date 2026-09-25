#!/usr/bin/env python3
# 构建时翻译：把 src/content/post 的文章用 argos-translate 翻译成英文，输出到 src/content/post-en
# 保护：代码围栏、行内代码、数学公式、HTML 标签、图片/链接语法不被翻译
import os
import re

import argostranslate.package
import argostranslate.translate

SRC = "src/content/post"
DST = "src/content/post-en"

argostranslate.package.update_package_index()
available = argostranslate.package.get_available_packages()
pkg = next(p for p in available if p.from_code == "zh" and p.to_code == "en")
argostranslate.package.install_from_path(pkg.download())


def translate(text: str) -> str:
    text = text.strip()
    if not text:
        return text
    return argostranslate.translate.translate(text, "zh", "en")


PROTECTED = re.compile(
    r"```.*?```|`[^`\n]+`|\$\$.*?\$\$|\$[^$\n]+\$|<[^>]+>|!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)",
    re.S,
)


def translate_md(text: str) -> str:
    out = []
    pos = 0
    for m in PROTECTED.finditer(text):
        if m.start() > pos:
            out.append(translate(text[pos : m.start()]))
        out.append(m.group(0))
        pos = m.end()
    out.append(translate(text[pos:]))
    return "".join(out)


FRONT_FIELD = re.compile(r'^(title|description):\s*"([^"]*)"', re.M)


def process_file(path: str) -> None:
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        return
    fm, body = m.groups()
    fm = FRONT_FIELD.sub(lambda mm: f'{mm.group(1)}: "{translate(mm.group(2))}"', fm)
    body = translate_md(body)
    os.makedirs(DST, exist_ok=True)
    out_path = os.path.join(DST, os.path.basename(path))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"---\n{fm}\n---\n{body}")
    print("translated:", out_path)


for name in sorted(os.listdir(SRC)):
    if name.endswith((".md", ".mdx")):
        process_file(os.path.join(SRC, name))
