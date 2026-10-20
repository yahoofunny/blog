;=====================================================================
; L12INT.ASM   第 12 课   BIOS 键盘中断 int 16h: 做按键侦测器
;---------------------------------------------------------------------
; 本课知识点:
;   1. int 16h 是 BIOS 的键盘中断 (比 DOS 的 int 21h 更底层):
;        AH=01h: 只"查询"有没有按键 —— ZF=1 没有, ZF=0 有
;                 (★关键: 查完按键还在缓冲区里, 不会丢!)
;        AH=00h: 真正"读取"一个按键 —— AH=扫描码, AL=ASCII码
;                 (读走就从缓冲区删掉了; 没有按键时会一直等你按)
;   2. 扫描码: 键盘上每个物理按键的编号 (和大小写/输入法无关)
;        例: ESC=01h, 字母 A=1Eh, 方向键属于"扩展键" AL=00h
;   3. ★"查询 + 读取"两段式: 是游戏/菜单这类"要一边干活一边收键盘"
;      的程序的标准姿势 (L03 的 loop 干活, 每圈查一下键盘)
;   4. int 16h vs int 21h 的 1 号功能: 21h 的输入会回显、能被输入
;      重定向接管; 16h 直接摸硬件键盘, 回显都不给你 —— 游戏都用它
;---------------------------------------------------------------------
; 运行结果 (动手按键盘, 例):
;   ascii=61h scan=1Eh      (按了 a)
;   ascii=41h scan=1Eh      (按了 A, 扫描码一样但 ASCII 不同)
;   ascii=-- scan=48h       (按了 ↑, 扩展键没有 ASCII 码)
;   ascii=1Bh scan=01h      (ESC) → Bye!
;---------------------------------------------------------------------
; 练习:
;   (1) 按方向键看看扫描码分别是多少, 把四个方向列出来
;   (2) 改成"只对 ESC 反应": 其他键不打印 (提示: 不打印直接 jmp 回去)
;   (3) 挑战: 做个小游戏前提 —— 检测到 w/a/s/d 时打印 UP/LEFT/DOWN/RIGHT
;   (4) 思考: 为什么这个程序用输入重定向 (< IN.TXT) 喂数据没用?
;       (提示: int 16h 在什么层面取键? DOS 重定向管的是谁?)
;=====================================================================

data segment
     m_a   db 'ascii=$'
     m_s   db ' scan=$'
     dash  db '--$'
     bye   db 0dh,0ah,'Bye!$'
     crlf  db 0dh,0ah,'$'
     hextab db '0123456789ABCDEF'
     asc_b db 0                         ; 存 ASCII
     scn_b db 0                         ; 存扫描码
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

loop_top:
     ;---- 1. 查询: 有按键吗? (非阻塞, 没有就回去继续查) ----
     mov ah, 1
     int 16h                            ; ★ZF=1: 无按键; ZF=0: 有按键待取
     jz  loop_top                       ; 没键就再等 —— 也可以在这里干别的活

     ;---- 2. 读取: 把按键从缓冲区取走 ----
     mov ah, 0
     int 16h                            ; AH = 扫描码, AL = ASCII 码
     mov asc_b, al                      ; 存起来 (下面要多次用 AX)
     mov scn_b, ah

     cmp asc_b, 1bh                     ; 是 ESC 吗?
     je  quit

     ;---- 3. 打印 "ascii=XXh scan=YYh" ----------------------
     mov dx, offset m_a
     mov ah, 9
     int 21h

     mov al, asc_b
     cmp al, 0
     jne pr_ascii
     ; AL=0 是"扩展键" (方向键之类), 没有 ASCII 码
     mov dx, offset dash
     mov ah, 9
     int 21h
     jmp pr_scan
pr_ascii:
     call printhex2                     ; 打印 AL 的两副十六进制

pr_scan:
     mov dx, offset m_s
     mov ah, 9
     int 21h
     mov al, scn_b
     call printhex2

     mov dx, offset crlf
     mov ah, 9
     int 21h
     jmp loop_top

quit:
     mov dx, offset bye
     mov ah, 9
     int 21h
     mov ah, 4ch
     int 21h

;=====================================================================
; printhex2 -- 把 AL 打印成两位十六进制 (查表法, L08 的简化版)
;   入口: AL = 一个字节
;=====================================================================
printhex2:
     push ax
     push bx
     push cx
     push dx

     mov cl, al                         ; 原值存 CL (后面 int 21h 会毁掉 AX)
     mov bx, offset hextab

     mov al, cl                         ; 高 4 位 → 字符
     shr al, 1
     shr al, 1
     shr al, 1
     shr al, 1
     xlat
     mov dl, al
     mov ah, 2
     int 21h

     mov al, cl                         ; 低 4 位 → 字符
     and al, 0fh
     xlat
     mov dl, al
     mov ah, 2
     int 21h

     pop dx
     pop cx
     pop bx
     pop ax
     ret
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: AH=01h 和 AH=00h 都能拿到按键吗? 谁会把按键"吃掉"? 
;      为什么游戏循环必须用 01h 先查?
;   Q: 扫描码和 ASCII 码有什么区别? 按 a 和按 A, 哪个码变了哪个没变?
;   Q: int 16h 和 int 21h 的 1 号功能, 在"能否被重定向"上有什么差别?
;---------------------------------------------------------------------
