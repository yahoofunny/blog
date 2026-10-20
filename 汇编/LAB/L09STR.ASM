;=====================================================================
; L09STR.ASM   第 9 课   字符串处理四连: 求长/统计/大写/反转
;---------------------------------------------------------------------
; 本课知识点:
;   1. 两种字符串结尾约定:
;        '$' 结尾 → 给 9 号功能打印用 (前面的课都这么干)
;        0 结尾   → 通用约定, 处理数据时更灵活 (本课用这个)
;   2. 求长度: 从头数到遇见 0 为止
;   3. 统计字符: 指针遍历 + inc 计数器 (对比某个字节)
;   4. ★批量转大写的陷阱: 不能无脑 and al,11011111b!
;      空格 20h AND 0DFh = 00h, 空格会被"消灭"掉变成不可见字符。
;      正确做法: 先判断是不是小写字母, 是才改 (本课演示)
;   5. 反向遍历: 算好长度后, 指针从"最后一个字符"往低地址倒着走
;      (si 递减 + loop) —— 反转字符串的基本功
;---------------------------------------------------------------------
; 运行结果:
;   len = 43
;   count o = 4
;   upper = THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG
;   rev   = god yzal eht revo spmuj xof nworb kciuq ehT
;---------------------------------------------------------------------
; 练习:
;   (1) 统计里面空格有几个 (提示: cmp al,' ')
;   (2) 编写 printstat 把 4 个结果都套个标签输出得漂亮些
;   (3) 挑战: 把整句里的 'o' 全部替换成 '0' 再打印 (指针遍历+覆写)
;   (4) 思考: 如果字符串忘了写结尾 0, 求长度循环会跑去哪? 会发生什么?
;=====================================================================

data segment
     text  db 'The quick brown fox jumps over the lazy dog',0   ; 0 结尾!
     m_len db 'len = $'
     m_cnt db 0dh,0ah,'count o = $'
     m_up  db 0dh,0ah,'upper = $'
     m_rev db 0dh,0ah,'rev   = $'
     ten   db 10
     crlf  db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;=========================================================
     ; 任务 1: 求字符串长度 (遇到 0 结束, CX 就是长度)
     ;=========================================================
     mov si, offset text
     mov cx, 0
len_loop:
     cmp byte ptr [si], 0               ; ★比较内存字节必须用 byte ptr 说清大小
     je  len_done
     inc si
     inc cx
     jmp len_loop
len_done:                               ; 结束时 CX = 43, SI 指向结尾的 0

     ;---- 打印 "len = 43" (两位十进制的套路: 除法拆位) ----
     mov dx, offset m_len
     mov ah, 9
     int 21h
     mov ax, cx                         ; 长度从 CX 挪到 AX 准备除法
     div ten                            ; AL=4(十位), AH=3(个位)
     push ax                            ; 个位在 AH, 压栈保存
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h
     pop ax
     mov dl, ah
     add dl, '0'
     mov ah, 2
     int 21h

     ;=========================================================
     ; 任务 2: 统计字母 'o' 出现了几次
     ;=========================================================
     mov dx, offset m_cnt
     mov ah, 9
     int 21h

     mov bx, offset text
     mov cx, 43                         ; 长度上面已经算出来了
     mov di, 0                          ; DI 当计数器
cnt_loop:
     cmp byte ptr [bx], 'o'
     jne cnt_next
     inc di                             ; 命中一次
cnt_next:
     inc bx
     loop cnt_loop

     mov ax, di                         ; 结果 4, 单个数字直接打
                                        ;   ★8086 里没有 DIL 这种写法 (那是 x86-64 的),
                                        ;   要从 DI 里取低字节, 先 mov 到 AX
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h

     ;=========================================================
     ; 任务 3: 整句转大写打印 (注意别误伤空格!)
     ;=========================================================
     mov dx, offset m_up
     mov ah, 9
     int 21h

     mov bx, offset text
     mov cx, 43
up_loop:
     mov al, [bx]
     ;---- 只有 'a'..'z' 才需要转, 其他字符原样打印 ----
     cmp al, 'a'
     jb  up_print                       ; 比 'a' 小 → 不是小写, 不动
     cmp al, 'z'
     ja  up_print                       ; 比 'z' 大 → 不是小写, 不动
     and al, 11011111b                  ; 是真正的小写字母, 才清 bit5
up_print:
     mov dl, al
     mov ah, 2
     int 21h
     inc bx
     loop up_loop

     ;=========================================================
     ; 任务 4: 反转打印 (从最后一个字符倒着走)
     ;=========================================================
     mov dx, offset m_rev
     mov ah, 9
     int 21h

     mov si, offset text
     mov cx, 43
     add si, cx
     dec si                             ; ★SI 指向最后一个字符 'g'
rev_loop:
     mov dl, [si]
     mov ah, 2
     int 21h
     dec si                             ; ★指针倒着走
     loop rev_loop

     mov dx, offset crlf
     mov ah, 9
     int 21h

     mov ah, 4ch
     int 21h
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: cmp byte ptr [si],0 里的 byte ptr 为什么不能省? 
;      试试写 cmp [si],0 看 MASM 报什么错 (记录下报错原文)
;   Q: 为什么不能对整串无脑 and al,11011111b? 哪些字符会被误伤?
;   Q: 反转打印如果用 si 递增能做到吗? 需要额外什么条件?
;---------------------------------------------------------------------
