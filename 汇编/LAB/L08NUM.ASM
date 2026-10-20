;=====================================================================
; L08NUM.ASM   第 8 课   二进制/十六进制打印: 移位指令与查表法
;---------------------------------------------------------------------
; 本课知识点:
;   1. shl bx,1: 左移一位, 移出去的那一位进 CF 标志!
;        → 循环 16 次 "移一位, 看 CF 打印 '0'/'1'" 就是二进制打印
;      十六进制版本: rol dx,1 连移 4 次, 把最高 4 位转到底 4 位
;   2. ★xlat 查表指令 (直接定址表):  AL = DS:[BX+AL]
;        把十六进制字符表 '0123456789ABCDEF' 的地址放 BX,
;        数字 0~15 放 AL, 一条 xlat 就换来对应字符 —— 比一堆 cmp 优雅得多
;   3. 4 位一组的格式化输出 (二进制每 4 位插一个空格, 好看)
;   4. 子程序可以带多个参数、多种输出格式 —— 调用者只管给数
;---------------------------------------------------------------------
; 运行结果:
;   0A21h = 0x0A21  0000 1010 0010 0001
;   0FFFFh = 0xFFFF  1111 1111 1111 1111
;   8000h = 0x8000  1000 0000 0000 0000
;---------------------------------------------------------------------
; 练习:
;   (1) 加一行打印 1234h
;   (2) 写子程序 printoct (八进制): 每 3 位移一位, 一个数打印 6 位八进制
;   (3) 思考: xlat 用 DS 做段, 如果字符表放在 ES 段里, 该怎么改?
;       (提示: 8086 的 xlat 不认 es:, 得手动 mov al,es:[bx+al]... 试试看?)
;=====================================================================

;---- 有 call, 就有栈: 定义栈段, 告别 L4021 警告 ----
stack segment stack
     db 200h dup(0)
stack ends

data segment
     hextab db '0123456789ABCDEF'       ; 查表用的字符表
     l1  db '0A21h = 0x$'
     l2  db '0FFFFh = 0x$'
     l3  db '8000h = 0x$'
     sp2 db '  $'                       ; 两个空格分隔十六进制和二进制
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     mov dx, offset l1
     call printstr
     mov dx, 0a21h
     call printhex
     mov dx, offset sp2
     call printstr
     mov dx, 0a21h
     call printbin
     mov dx, offset crlf
     call printstr

     mov dx, offset l2
     call printstr
     mov dx, 0ffffh
     call printhex
     mov dx, offset sp2
     call printstr
     mov dx, 0ffffh
     call printbin
     mov dx, offset crlf
     call printstr

     mov dx, offset l3
     call printstr
     mov dx, 8000h
     call printhex
     mov dx, offset sp2
     call printstr
     mov dx, 8000h
     call printbin
     mov dx, offset crlf
     call printstr

     mov ah, 4ch
     int 21h

;=====================================================================
; printhex -- 把 DX 打印成 4 位十六进制 (查表法)
;   入口: DX = 要打印的值
;   原理: 滚动左移 4 次把最高 4 位转到低 4 位, 用 xlat 查表换字符
;=====================================================================
printhex:
     push ax
     push bx
     push cx
     push dx

     mov bx, offset hextab              ; ★xlat 的表地址必须放 BX
     mov cx, 4                          ; 打印 4 个十六进制位
ph_loop:
     rol dx, 1
     rol dx, 1
     rol dx, 1
     rol dx, 1                          ; 4 次 rol: 最高 4 位搬到了最低 4 位
     mov al, dl
     and al, 0fh                        ; 只留低 4 位 (0~15)
     xlat                               ; ★AL = DS:[BX+AL] = hextab[AL]
     push dx                            ; 下面 int 21h 要用 DL, 先保住 DX
     mov dl, al
     mov ah, 2
     int 21h
     pop dx                             ; 取回, 继续处理下一组
     loop ph_loop

     pop dx
     pop cx
     pop bx
     pop ax
     ret

;=====================================================================
; printbin -- 把 DX 打印成 16 位二进制, 每 4 位空格分组
;   入口: DX = 要打印的值
;=====================================================================
printbin:
     push ax
     push bx
     push cx
     push dx
     push si

     mov bx, dx                         ; 拿一份可移位的副本
     mov si, 0                          ; SI = 已打印的位数
     mov cx, 16                         ; 共 16 位
pb_loop:
     mov dl, '0'
     shl bx, 1                          ; ★左移: 最高位移进 CF
     jnc pb_put
     mov dl, '1'
pb_put:
     mov ah, 2
     int 21h
     inc si

     ;---- 每打印 4 位补一个空格, 最后一位除外 ------------------
     mov ax, si
     test ax, 3                         ; SI 是 4 的倍数吗? (低 2 位为 0)
     jnz pb_next
     cmp si, 16
     je  pb_next                        ; 最后一位后面不补空格
     push dx
     mov dl, ' '
     mov ah, 2
     int 21h
     pop dx
pb_next:
     loop pb_loop

     pop si
     pop dx
     pop cx
     pop bx
     pop ax
     ret

;---- 通用打印字符串 (和 L07 一样) ----
printstr:
     push ax
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: shl 和 rol 的区别是什么? 为什么打印十六进制用 rol 不用 shl?
;      (提示: 要打印 4 组, shl 会把高位丢掉, 打印第二组时数据没了)
;   Q: xlat 这条指令的三要素: 表地址在哪? 表内下标在哪? 结果在哪?
;   Q: test ax,3 是在测试什么? 为什么它能判断"4 的倍数"?
;---------------------------------------------------------------------
