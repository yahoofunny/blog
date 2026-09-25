#!/usr/bin/env python3
# 把 src/content/post 的文章用 argos-translate 翻译成英文，输出到 src/content/post-en
#
# 关键约束：输出的 Markdown 结构必须和原文逐行对齐。
# 早期版本把保护区之间的整块文本丢给翻译再拼回去，strip() 吃掉了首尾换行，
# 结果代码围栏和后面的正文粘成一行（```c ... ```**算法实现** ），
# expressive-code 把 "**算法实现**" 当成语言名，整篇译文的段落也全糊了。
# 现在严格按行翻译，行数不变，围栏/标题/列表/表格结构原样保留。
import os
import re
import sys

import argostranslate.package
import argostranslate.translate

SRC = "src/content/post"
DST = "src/content/post-en"

MAX_TITLE = 120

argostranslate.package.update_package_index()
available = argostranslate.package.get_available_packages()
pkg = next(p for p in available if p.from_code == "zh" and p.to_code == "en")
argostranslate.package.install_from_path(pkg.download())


def _translate(core: str) -> str:
    return argostranslate.translate.translate(core, "zh", "en")


def translate_fragment(s: str) -> str:
    """翻译一小段，首尾空白原样保留（绝不 strip 掉换行/缩进）"""
    core = s.strip()
    if not core:
        return s
    lead = s[: len(s) - len(s.lstrip())]
    trail = s[len(s.rstrip()) :]
    return lead + _translate(core) + trail


# 行内不该被翻译的东西
INLINE = re.compile(
    r"`[^`\n]+`"  # 行内代码
    r"|\$\$[^$\n]*\$\$"  # 行内块级公式
    r"|\$[^$\n]+\$"  # 行内公式
    r"|<[^>\n]+>"  # HTML / JSX 标签
    r"|\{[^{}\n]*\}"  # MDX 表达式 {expr}
    r"|!\[[^\]]*\]\([^)]*\)"  # 图片
    r"|\[[^\]]+\]\([^)]*\)"  # 链接
)

# 翻译结果里冒出这些字符，MDX 会当 JSX 解析 —— 转成实体
MDX_UNSAFE = str.maketrans({"<": "&lt;", "{": "&#123;", "}": "&#125;"})


def translate_inline(line: str) -> str:
    """翻译一行，行内的代码/公式/标签/链接原样挖掉不翻"""
    out, pos = [], 0
    for m in INLINE.finditer(line):
        if m.start() > pos:
            out.append(translate_fragment(line[pos : m.start()]).translate(MDX_UNSAFE))
        out.append(m.group(0))
        pos = m.end()
    if pos < len(line):
        out.append(translate_fragment(line[pos:]).translate(MDX_UNSAFE))
    return "".join(out)


FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
# 表格分隔行 |---|---| 不翻
TABLE_SEP = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
# 行首的 Markdown 结构标记，翻完要原样接回去
STRUCT_PREFIX = re.compile(r"^(\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+|\|\s*)?)(.*)$")


def translate_body(body: str) -> str:
    out, in_fence = [], False
    for line in body.split("\n"):
        if FENCE.match(line):
            in_fence = not in_fence
            out.append(line)
            continue
        if (
            in_fence
            or not line.strip()
            or TABLE_SEP.match(line)
            or line.lstrip().startswith(("import ", "export "))
        ):
            out.append(line)
            continue
        prefix, rest = STRUCT_PREFIX.match(line).groups()
        out.append(prefix + translate_inline(rest) if rest.strip() else line)
    return "\n".join(out)


FRONT_FIELD = re.compile(r'^(title|description):\s*"([^"]*)"', re.M)


def shorten(text: str, limit: int) -> str:
    """标题别太长，超了就在词边界截断"""
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,;:-—")
    return cut + "…"


def process_file(path: str) -> None:
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        return
    fm, body = m.groups()

    def sub_field(mm: re.Match) -> str:
        value = _translate(mm.group(2)).replace('"', "'")
        if mm.group(1) == "title":
            value = shorten(value, MAX_TITLE)
        return f'{mm.group(1)}: "{value}"'

    fm = FRONT_FIELD.sub(sub_field, fm)
    new_body = translate_body(body)

    # 结构不变式：行数必须和原文一致，围栏数必须一致
    src_lines = body.count("\n")
    dst_lines = new_body.count("\n")
    if src_lines != dst_lines:
        raise SystemExit(f"结构被破坏（行数 {src_lines} -> {dst_lines}）：{path}")
    if body.count("```") != new_body.count("```"):
        raise SystemExit(f"代码围栏数量对不上：{path}")

    os.makedirs(DST, exist_ok=True)
    out_path = os.path.join(DST, os.path.basename(path))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"---\n{fm}\n---\n{new_body}")
    print("translated:", out_path, flush=True)


for name in sorted(os.listdir(SRC)):
    if name.endswith((".md", ".mdx")):
        process_file(os.path.join(SRC, name))

print("done", file=sys.stderr)
