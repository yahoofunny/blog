;=====================================================================
; Z22B2.ASM   2022-2023 期末真题(B卷) 三.2 —— 参考答案
;---------------------------------------------------------------------
; 题目 (10分):
;   已知在内存中有 1B 单元的 X, 存有带符号数据,
;   请设计程序计算出它的绝对值后, 放入 RESULT 单元中。
;
; 思路拆解:
;   1. "带符号" → 判断方法是看符号位: JS/JNS 直接按符号位跳
;      (也可以用 CMP AL,0 + JGE, 效果一样, 但 JNS 更点题)
;   2. 负数变正数 → NEG 指令 (求补, 即取相反数)
;   3. 正数不能动 → 所以要先判断再决定要不要 NEG (直接无脑 NEG 会把正数搞负)
;
; 本程序用 X = -58 验证: 绝对值应该是 58 (3AH)
;
; 评分要点:
;   * 会判符号 (JNS 或 JGE)            (4分)
;   * 用 NEG 求相反数                   (3分)
;   * 正数分支原样送 RESULT             (3分)
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     X      db -58                      ; 1B 单元的 X, 带符号数 (-58)
     RESULT db 0                        ; 存放绝对值的结果单元
     m1     db 'X = -58,  |X| = $'
     crlf   db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;===== ★考卷要的程序段 (就这么几行) =====
     mov al, X                          ; 取 X
     cmp al, 0                          ; ★★必须先"碰一下"标志位!
                                        ;   MOV 不影响标志位 —— 写完 mov 直接
                                        ;   JNS, 判断的是上一条指令留下的旧标志,
                                        ;   结果全看运气。这是本题最大的坑, 也是
                                        ;   找错题的常客, 记住: 跳转前必须有
                                        ;   产生标志的指令 (cmp/or/test/add...)
     jns save                           ; 符号位是 0 (非负) → 不用动, 直接存
     neg al                             ; 是负数 → NEG 变正
save:
     mov RESULT, al                     ; 存进 RESULT
     ;===== 题目到此结束, 下面是额外的打印验证 =====

     mov dx, offset m1
     call printstr

     mov al, RESULT
     mov ah, 0                          ; 结果 0~127, 扩成字给 printnum
     mov dx, ax
     call printnum                      ; 应该打印 58

     mov dx, offset crlf
     call printstr
     mov ah, 4ch
     int 21h

;=====================================================================
; printnum -- 打印 DX 里的无符号数
;=====================================================================
printnum:
     push ax
     push bx
     push cx
     push dx
     mov ax, dx
     mov cx, 0
     mov bx, 10
pn_div:
     xor dx, dx
     div bx
     push dx
     inc cx
     test ax, ax
     jnz pn_div
pn_out:
     pop dx
     add dl, '0'
     mov ah, 2
     int 21h
     loop pn_out
     pop dx
     pop cx
     pop bx
     pop ax
     ret

printstr:
     push ax
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start

;---------------------------------------------------------------------
; 追问 (考试理解题常常跟进):
;   Q: 如果 X = 80H (-128), NEG 之后还是 80H (溢出!), 为什么?
;      → -128 的相反数 +128 超出 8 位有符号数范围 [-128,127], 所以 OF=1,
;        结果"回绕"回 80H。这是这题的隐藏考点 (老师特别喜欢问)
;   Q: 用 JGE 替代 JNS 行不行? → 行, 带符号比较指令和符号位是配套的
;---------------------------------------------------------------------
