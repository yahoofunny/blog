;=====================================================================
; Z22B1.ASM   2022-2023 期末真题(B卷) 三.1 —— 参考答案
;---------------------------------------------------------------------
; 题目 (8分):
;   设 AX 寄存器中有一个 16 位二进制数, 编一程序段, 统计 AX 中"1"的个数,
;   统计结果送 CX 中。
;
; 思路拆解 (考场上就这么想):
;   1. 怎么知道某一位是不是 1? —— 用移位/循环移位把它挪到 CF 里看
;   2. 循环移哪位? —— ROL AX,1 每次把最高位转到最低位(同时进 CF),
;      转 16 次数据还回原样, 数据不丢 (SHL 会把数移没, 要备份)
;   3. 计数放哪? —— 结果要送 CX, 所以 CX 就是计数器;
;      但循环 16 次就不能再用 CX 计数了 → 用 BX 当循环计数 (★考点!)
;
; 评分要点:
;   * 想到"移出去看 CF"              (3分)
;   * 用 ROL 保护原数据 (或用副本)    (2分)
;   * 计数寄存器与循环计数不冲突      (2分)
;   * 结果最终在 CX                   (1分)
;
; 下面给出 完整可运行版: 用两个测试数验证 (1234H 里 5 个1; 0FFFFH 里 16 个1)
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     m1  db 'count(1234h)  = $'
     m2  db 0dh,0ah,'count(0FFFFh) = $'
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;===== 测试1: AX = 1234H =========================================
     mov dx, offset m1
     call printstr
     mov ax, 1234h
     call count1                        ; 子程序里就是那道"程序段"

     mov dx, cx                         ; 取统计结果
     call printnum                      ; 打印 (1234H 里有 5 个 1)

     ;===== 测试2: AX = 0FFFFH ========================================
     mov dx, offset m2
     call printstr
     mov ax, 0ffffh
     call count1

     mov dx, cx
     call printnum                      ; 16 个 1

     mov dx, offset crlf
     call printstr
     mov ah, 4ch
     int 21h

;=====================================================================
; count1 -- 统计 AX 中 "1" 的个数, 结果放 CX     ★这就是考卷要的程序段
;   保护: BX (循环计数用), AX (ROL 16次后原样还原); 结果放 CX (题目要求)
;=====================================================================
count1:
     push bx
     xor  cx, cx                        ; CX = 0, 开始计数
     mov  bx, 16                        ; ★循环 16 次 (不能用 CX!)
r1:
     rol  ax, 1                         ; 最高位 → CF; ROL 转圈不丢数据
     jnc  r2                            ; CF=0 → 这一位不是 1
     inc  cx                            ; CF=1 → 计数 +1
r2:
     dec  bx
     jnz  r1                            ; 没用 loop, 因为 CX 被占用!
     pop  bx
     ret

;=====================================================================
; printnum -- 打印 DX 里的无符号数 (标准版, 考卷外的东西不用背)
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
; 换个写法的思路 (也可以这么答, 考场上二选一):
;     把 AX 备份到 BX, 用 SHL 移位:
;         xor cx, cx
;         mov bx, ax
;     r1: test bx, 8000h        ; 测最高位是不是 1
;         jz  r2
;         inc cx
;     r2: shl bx, 1             ; 左移, 数据在副本里, 移没了也不怕
;         jnz r1                ; (这里用 BX 是否为 0 提前结束, 也可以固定16次)
;   两种都对; 阅卷老师看重的是"移位 + 看标志/CF"这个核心思想
;---------------------------------------------------------------------
