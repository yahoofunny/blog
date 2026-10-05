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


CJK = re.compile(r"[㐀-䶿一-鿿豈-﫿]")


def _translate(core: str) -> str:
    if not CJK.search(core):
        # 没有汉字就没什么可翻的。argos 对纯英文输入只会瞎改
        # （代码行、英文术语、雅思范文都走这条路）
        return core
    return argostranslate.translate.translate(core, "zh", "en")


def translate_fragment(s: str) -> str:
    """翻译一小段，首尾空白原样保留（绝不 strip 掉换行/缩进）"""
    core = s.strip()
    if not core:
        return s
    lead = s[: len(s) - len(s.lstrip())]
    trail = s[len(s.rstrip()) :]
    if not CJK.search(core):
        # 没有汉字 = 不会翻译，必须一个字符都不动地还回去。
        # 这里如果顺手做 MDX 转义，跨行标签的 `<iframe ` 会变成 `&lt;iframe `，
        # JSX 开标签消失，后面那行的 </iframe> 就成了「意外的闭合标签」。
        return s
    return lead + _translate(core).translate(MDX_UNSAFE) + trail


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
            out.append(translate_fragment(line[pos : m.start()]))
        out.append(m.group(0))
        pos = m.end()
    if pos < len(line):
        out.append(translate_fragment(line[pos:]))
    return "".join(out)


FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
# 表格分隔行 |---|---| 不翻
TABLE_SEP = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
# 行首的 Markdown 结构标记，翻完要原样接回去
STRUCT_PREFIX = re.compile(r"^(\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+|\|\s*)?)(.*)$")
# 标签开头。`</` 和 `<!` 没有歧义；`<字母` 则要求前面不是字母数字，
# 否则正文里的比较式 a<b ⇔ SF≠OF 会被当成标签开头。那一行又没有 `>`，
# in_tag 就会一直卡在 True，后面整段正文被跳过不翻。
# 注意 `</` 必须无条件算标签：文字</span> 里的 `<` 前面照样是字母。
TAG_START = re.compile(r"</|<!|(?<![A-Za-z0-9])<[A-Za-z]")


def scan_tag_state(line: str, in_tag: bool) -> bool:
    """扫完这一行后，是否还停在一个没闭合的 HTML/JSX 标签里。

    随笔.mdx 里的 <iframe> 属性是跨行写的：
        <iframe
          src="..."
          title="YouTube Video">
        </iframe>
    行内保护正则 <[^>\\n]+> 跨不过换行，这些属性行会被当成正文送去翻译，
    标签被改烂 → MDX 报 "Unexpected closing tag </iframe>"。
    """
    i = 0
    while True:
        if in_tag:
            j = line.find(">", i)
            if j == -1:
                return True
            in_tag = False
            i = j + 1
        else:
            m = TAG_START.search(line, i)
            if not m:
                return False
            in_tag = True  # 找到 < 就进入标签内状态，下一轮去找配对的 >
            i = m.start() + 1


def translate_body(body: str) -> str:
    out, in_fence, in_tag = [], False, False
    for line in body.split("\n"):
        if FENCE.match(line):
            in_fence = not in_fence
            in_tag = False
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue

        started_in_tag = in_tag
        in_tag = scan_tag_state(line, in_tag)

        if (
            started_in_tag
            or in_tag
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
    # 有几篇是 CRLF 存的（数据结构那几篇 + 电路模电），不归一化的话
    # 下面这个 ^---\n 匹配不上，整篇会被静默跳过、永远没有英文版
    raw = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        # 读不出来必须炸，不能 return 溜走
        raise SystemExit(f"解析不出 frontmatter：{path}")
    fm, body = m.groups()

    def sub_field(mm: re.Match) -> str:
        src = mm.group(2)
        if not CJK.search(src):
            return mm.group(0)  # 没汉字就没翻译，引号也别动
        value = _translate(src).replace('"', "'")
        if mm.group(1) == "title":
            value = shorten(value, MAX_TITLE)
        return f'{mm.group(1)}: "{value}"'

    fm = FRONT_FIELD.sub(sub_field, fm)
    new_body = translate_body(body)

    # 结构不变式：行数、围栏数、属性数都必须和原文一致
    src_lines = body.count("\n")
    dst_lines = new_body.count("\n")
    if src_lines != dst_lines:
        raise SystemExit(f"结构被破坏（行数 {src_lines} -> {dst_lines}）：{path}")
    if body.count("```") != new_body.count("```"):
        raise SystemExit(f"代码围栏数量对不上：{path}")
    # 裸属性 =" 只可能出现在标签里，翻没了就是标签被改烂了
    src_attrs = body.count('="')
    dst_attrs = new_body.count('="')
    if src_attrs != dst_attrs:
        raise SystemExit(f"标签属性数量对不上（{src_attrs} -> {dst_attrs}）：{path}")

    os.makedirs(DST, exist_ok=True)
    out_path = os.path.join(DST, os.path.basename(path))
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"---\n{fm}\n---\n{new_body}")
    print("translated:", out_path, flush=True)


names = sorted(n for n in os.listdir(SRC) if n.endswith((".md", ".mdx")))
for name in names:
    process_file(os.path.join(SRC, name))

print(f"done: {len(names)} 篇", file=sys.stderr)
