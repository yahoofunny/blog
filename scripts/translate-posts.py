#!/usr/bin/env python3
# 构建时翻译：把 src/content/post 的文章用 argos-translate 翻译成英文，输出到 src/content/post-en
#
# 保护不被翻译的内容：代码围栏、行内代码、数学公式、HTML/JSX 标签、MDX 表达式、
# 图片/链接语法、MDX 的 import/export 行
# 输出仍然要能通过 MDX 解析：翻译结果里残留的 < { } 一律转义成实体
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
    r"```.*?```"  # 围栏代码块
    r"|`[^`\n]+`"  # 行内代码
    r"|\$\$.*?\$\$"  # 块级公式
    r"|\$[^$\n]+\$"  # 行内公式
    r"|<[^>\n]+>"  # HTML / JSX 标签
    r"|\{[^{}\n]*\}"  # MDX 表达式 {expr}
    r"|!\[[^\]]*\]\([^)]*\)"  # 图片
    r"|\[[^\]]+\]\([^)]*\)"  # 链接
    r"|^import [^\n]*$"  # MDX import
    r"|^export [^\n]*$",  # MDX export
    re.S | re.M,
)

# 翻译结果里如果冒出这些字符，MDX 会把它当 JSX 解析 —— 转成实体
MDX_UNSAFE = str.maketrans({"<": "&lt;", "{": "&#123;", "}": "&#125;"})


def translate_md(text: str) -> str:
    out = []
    pos = 0
    for m in PROTECTED.finditer(text):
        if m.start() > pos:
            out.append(translate(text[pos : m.start()]).translate(MDX_UNSAFE))
        out.append(m.group(0))
        pos = m.end()
    out.append(translate(text[pos:]).translate(MDX_UNSAFE))
    return "".join(out)


FRONT_FIELD = re.compile(r'^(title|description):\s*"([^"]*)"', re.M)


def process_file(path: str) -> None:
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        return
    fm, body = m.groups()
    fm = FRONT_FIELD.sub(
        lambda mm: f'{mm.group(1)}: "{translate(mm.group(2)).replace(chr(34), "")}"', fm
    )
    body = translate_md(body)
    os.makedirs(DST, exist_ok=True)
    name = os.path.basename(path)
    out_path = os.path.join(DST, name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"---\n{fm}\n---\n{body}")
    print("translated:", out_path)


for name in sorted(os.listdir(SRC)):
    if name.endswith((".md", ".mdx")):
        process_file(os.path.join(SRC, name))
