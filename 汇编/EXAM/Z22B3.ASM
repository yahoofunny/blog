;=====================================================================
; Z22B3.ASM   2022-2023 期末真题(B卷) 三.3 —— 参考答案
;---------------------------------------------------------------------
; 题目 (12分, 本卷编程题最高分):
;   编制程序完成 1-50 之间的自然数中的偶数累加和, 结果送 RESULT 单元中。
;
; 思路拆解 (两种都行, 推荐第一种):
;   写法A: 让 BX 直接"走偶数": 2, 4, 6, ... 50, 边加边走
;          循环终止条件: BX 走到 52 (超过 50) 就停
;   写法B: 数 1..50 全走一遍, 用 TEST 判断奇偶 (test al,1 → 奇数为1)
;
; 结果 = 2+4+...+50 = 650 (028AH)
;
; 评分要点:
;   * 能产生偶数序列 (从 2 起步长 2) 或能筛出偶数   (5分)
;   * 累加                            (3分)
;   * 终止条件正确 (含 50, 不含 52)     (2分)
;   * 结果存 RESULT (字变量, 650 超 255!  ← 细节分)  (2分)
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     RESULT dw 0                        ; ★650 > 255, 必须用 DW! (细节考点)
     m1     db 'sum(2+4+...+50) = $'
     crlf   db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;===== ★考卷要的程序段 =====
     xor ax, ax                         ; AX = 累加器, 清 0
     mov bx, 2                          ; BX = 偶数序列: 2,4,6...
r1:
     add ax, bx                         ; 累加
     add bx, 2                          ; 下一个偶数
     cmp bx, 50
     jbe r1                             ; BX <= 50 就继续 (要含 50!)
                                        ; 走到 52 时退出
     mov RESULT, ax                     ; 结果 = 650 存入 RESULT
     ;===== 题目到此结束, 下面是额外的打印验证 =====

     mov dx, offset m1
     call printstr

     mov dx, RESULT
     call printnum                      ; 应该打印 650

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
; 写法B (筛奇偶) 供对照:
;     xor ax, ax
;     mov bx, 1
;     mov cx, 50
; r1: test bx, 1          ; 最低位是 1 → 奇数
;     jnz r2
;     add ax, bx          ; 是偶数才加
; r2: inc bx
;     loop r1
;     mov RESULT, ax
;   对比体会: 写法A 循环 25 次, 写法B 循环 50 次;
;   写法B 考的其实是 TEST 指令 (真题同款考点)
;---------------------------------------------------------------------
