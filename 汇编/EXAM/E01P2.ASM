;=====================================================================
; E01P2.ASM   期末模拟卷(一) 编程题 2 —— 参考答案
;---------------------------------------------------------------------
; 题目:
;   用循环计算 1+2+3+...+100 的和, 并把结果用十进制打印出来。
;   (答案应该是 5050 —— 4 位数, 所以不能用"除以10拆两位"的小技巧,
;    要用完整的"反复除以10, 余数压栈, 再弹栈打印"方法)
;
; 评分要点:
;   1. 循环累加 (loop 或 dec+jnz)                      (4分)
;   2. 看出结果超过 99, 选择通用打印法                  (3分)
;   3. printnum: div 前 xor dx,dx; 余数 push; 弹栈逆序  (3分)
;=====================================================================

stack segment stack
     db 100h dup(0)
stack ends

data segment
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;---- 累加 1..100 ----
     ;   让 CX 从 100 递减到 1, 每次都加到 AX 上:
     ;   100+99+98+...+1 和 1+2+...+100 是一个意思
     mov ax, 0                          ; AX = 累加器
     mov cx, 100
sum_loop:
     add ax, cx                         ; AX += CX
     loop sum_loop                      ; CX-1, 不为 0 继续
     ; 循环结束 AX = 5050

     ;---- 打印这个 16 位数 ----
     mov dx, ax                         ; 结果给 DX 当参数 (printnum 的约定)
     call printnum

     mov dx, offset crlf
     mov ah, 9
     int 21h

     mov ah, 4ch
     int 21h

;=====================================================================
; printnum -- 打印 DX 里的无符号数 (L07 的标准写法, 务必背熟)
;=====================================================================
printnum:
     push ax
     push bx
     push cx
     push dx
     mov ax, dx
     mov cx, 0                          ; 位数计数
     mov bx, 10
pn_div:
     xor dx, dx                         ; ★不清零会除法溢出
     div bx                             ; AX=商, DX=余数(一位数字)
     push dx                            ; 数字压栈 (个位先进, 最高位最后进)
     inc cx
     test ax, ax
     jnz pn_div
pn_out:
     pop dx                             ; ★后进先出 → 从最高位开始打
     add dl, '0'
     mov ah, 2
     int 21h
     loop pn_out
     pop dx
     pop cx
     pop bx
     pop ax
     ret
code ends
end start
