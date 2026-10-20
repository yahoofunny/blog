#!/usr/bin/env bash
# =====================================================================
# check.sh -- 汇编作业自动批改: 一键 编译 + 运行 + 对答案
#
# 用法:
#   bash ~/asm/check.sh L03LOOP       # 检查一个程序
#   bash ~/asm/check.sh LAB/L03LOOP   # 写路径也行 (斜杠/反斜杠都认)
#   bash ~/asm/check.sh all           # 把所有带 .EXP 的作业全跑一遍
#
# 规则:
#   * 编译+运行都在 DOSBox 无窗口模式里自动完成, 输出重定向到文件比对
#   * 同名 .EXP 文件   → 自动对答案, 打印 PASS / FAIL 和差异
#   * 同名 .IN  文件   → 当作键盘输入喂给程序 (0Ah / 1号功能都吃)
#   * 同名 .MANUAL 文件 → 需要真实键盘的程序, 只帮你编译, 运行请用 run.sh
# =====================================================================
set -u
ROOT="$HOME/asm"

find_dir() {   # $1 = 程序名(不带扩展名) → 打印所在目录; 找不到返回 1
    local base="$1" f
    f=$(find "$ROOT" -maxdepth 2 -iname "$base.asm" \
          -not -path "*/MASM/*" -not -path "*/MASM615/*" \
          -not -path "*/DOCS/*" -not -path "*/TMP/*" \
          -not -path "*/.vscode/*" 2>/dev/null | head -1)
    [ -n "$f" ] || return 1
    dirname "$f"
}

norm() {   # 标准化输出: 去 \r / 去行尾空白 / 去末尾空行
    tr -d '\r' < "$1" | sed -e 's/[[:space:]]*$//' | tac | awk 'NF{found=1} found' | tac
}

run_one() {
    local base="$1" dir rel conf
    dir=$(find_dir "$base") || { echo "== $base == [跳过] 找不到 $base.asm"; return 1; }
    rel="${dir#"$ROOT"}"; rel="${rel#/}"

    # 清掉旧产物, 保证结果是这次编译出来的
    rm -f "$dir/$base.OBJ" "$dir/$base.EXE" "$dir/CHECK.LOG" "$dir/CHECK.OUT"

    conf="$ROOT/.check-$$.conf"
    {
        echo '[autoexec]'
        echo "mount C $ROOT"
        echo 'C:'
        echo 'SET PATH=C:\MASM;C:\MASM615\BIN'
        [ -n "$rel" ] && echo "cd $rel"
        echo "masm $base; > CHECK.LOG"
        echo "if exist $base.OBJ link $base; >> CHECK.LOG"
        if [ ! -f "$dir/$base.MANUAL" ]; then
            if [ -f "$dir/$base.IN" ]; then
                echo "if exist $base.EXE $base < $base.IN > CHECK.OUT"
            else
                echo "if exist $base.EXE $base > CHECK.OUT"
            fi
        fi
        echo 'exit'
    } > "$conf"
    timeout --kill-after=5 120 flatpak run \
        --env=SDL_VIDEODRIVER=dummy --env=SDL_AUDIODRIVER=dummy \
        io.github.dosbox-staging -conf "$conf" >/dev/null 2>&1
    rm -f "$conf"

    echo "== $base =="
    if [ ! -f "$dir/$base.EXE" ]; then
        echo "  ✘ 编译/链接失败, MASM 原话:"
        tr -d '\r' < "$dir/CHECK.LOG" 2>/dev/null | grep -vE "^(Microsoft|Copyright|$)" | head -15
        return 1
    fi
    echo "  ✔ 编译链接通过"

    if [ -f "$dir/$base.MANUAL" ]; then
        echo "  ▸ 此程序需要真实键盘 (已标记 .MANUAL), 想看动画请运行:"
        echo "      bash ~/asm/run.sh $base"
        return 0
    fi
    [ -f "$dir/CHECK.OUT" ] || { echo "  ✘ 程序没有产生任何输出"; return 1; }

    if [ -f "$dir/$base.EXP" ]; then
        norm "$dir/CHECK.OUT" > "$dir/.out.n"
        norm "$dir/$base.EXP"  > "$dir/.exp.n"
        if diff -q "$dir/.exp.n" "$dir/.out.n" >/dev/null; then
            echo "  ✔✔ 输出比对: PASS (和标准答案一字不差)"
            rm -f "$dir/.out.n" "$dir/.exp.n"
            return 0
        else
            echo "  ✘ 输出比对: FAIL  差异 (< 期望 / > 实际):"
            diff "$dir/.exp.n" "$dir/.out.n" | head -25
            rm -f "$dir/.out.n" "$dir/.exp.n"
            return 1
        fi
    else
        echo "  (没有 .EXP 标准答案, 实际输出如下:)"
        norm "$dir/CHECK.OUT" | head -30
        return 0
    fi
}

case "${1:-}" in
    all)
        pass=0; fail=0; fails=""
        for exp in "$ROOT"/LAB/*.EXP "$ROOT"/PROJ/*.EXP "$ROOT"/EXAM/*.EXP; do
            [ -f "$exp" ] || continue
            b=$(basename "$exp" .EXP)
            if run_one "$b"; then pass=$((pass+1)); else fail=$((fail+1)); fails="$fails $b"; fi
            echo
        done
        echo "======== 汇总: $pass 个通过, $fail 个失败 ========"
        [ -n "$fails" ] && echo "失败名单:$fails"
        ;;
    ""|"-h"|"--help")
        echo "用法: bash ~/asm/check.sh 名字     (如 L03LOOP / P1CALC)"
        echo "      bash ~/asm/check.sh all      (全部带 .EXP 的跑一遍)"
        ;;
    *)
        n="${1//\\//}"; n="${n##*/}"       # 兼容 LAB\L03LOOP / LAB/L03LOOP 写法
        run_one "$n"
        ;;
esac
