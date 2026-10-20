;=====================================================================
; L06SORT.ASM   第 6 课   冒泡排序: 双层循环实战
;---------------------------------------------------------------------
; 本课知识点:
;   1. 冒泡排序的思路: 反复比较"相邻两个", 前面的大就交换,
;      一遍下来最大的就"冒"到最后了, 重复 9 遍就全有序
;   2. 双层循环的计数分工: 外层轮数放 DX, 内层次数放 CX
;      (因为 loop 只认 CX, 内层必须独占它)
;   3. xchg 指令: 交换两个操作数, xchg ax,[bx+2] 可以和内存交换
;   4. ★[bx+2] 这种"基址+位移"写法: 访问相邻的下一个元素 (dw 每步 2 字节)
;   5. div 的除数也可以是内存单元: div ten (ten db 10)
;      —— 因为 BX 被借去当指针了, BL 不能再当除数!
;   6. 打印技巧: push ax / pop ax 保存除法结果,
;      因为 int 21h 会覆盖 AH (个位存在 AH 里)
;---------------------------------------------------------------------
; 运行结果:
;   before:49 38 65 97 76 13 27 49 55  4
;   after:  4 13 27 38 49 49 55 65 76 97
;   (个位数前面用空格补齐, 方便对齐)
;---------------------------------------------------------------------
; 练习:
;   (1) 改成从大到小排序 (提示: 把 jbe 换成 jae)
;   (2) 把数组换成你自己的学号数字和几位成绩, 重新排
;   (3) 优化挑战: 如果某一轮一次交换都没发生, 说明已经有序, 提前退出
;       (提示: 每轮开始前 mov si,0 当"交换过"的标记, 换过就 mov si,1;
;         轮末 cmp si,0, je 结束)
;   (4) 观察: 打印数组的代码写了两遍 (before 一次 after 一次)!
;       能不能只写一遍? 下一课 L07 教你用子程序消灭重复
;=====================================================================

data segment
     ; 经典的乱序数组 (数据结构和算法课都用它)
     arr  dw 49,38,65,97,76,13,27,49,55,4
     ten  db 10                         ; 除数放内存 (BX 要当指针, 借不出 BL)
     msg1 db 'before:$'
     msg2 db 0dh,0ah,'after: $'
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;=========================================================
     ; 打印排序前 (第一次)
     ;=========================================================
     mov dx, offset msg1
     mov ah, 9
     int 21h

     mov bx, offset arr
     mov cx, 10
pb_loop:
     mov al, [bx]                       ; 取当前元素 (值<100, 低字节够用)
     mov ah, 0
     div ten                            ; AL = 十位, AH = 个位
     push ax                            ; ★个位藏在 AH, 压栈保存
     cmp al, 0
     jne pb_tens
     mov dl, ' '                        ; 十位是 0 → 打空格占位, 对齐好看
     mov ah, 2
     int 21h
     jmp pb_ones
pb_tens:
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h
pb_ones:
     pop ax                             ; ★取回, AH = 个位
     mov dl, ah
     add dl, '0'
     mov ah, 2
     int 21h
     mov dl, ' '                        ; 元素之间空格
     mov ah, 2
     int 21h
     add bx, 2
     loop pb_loop

     ;=========================================================
     ; 冒泡排序
     ;=========================================================
     mov dx, 9                          ; 外层: 一共排 9 轮
outer:
     mov bx, offset arr                 ; 每轮都从头开始两两比较
     mov cx, 9                          ; 内层: 相邻比较 9 次
inner:
     mov ax, [bx]                       ; 前一个数
     cmp ax, [bx+2]                     ; 和"下一个"(偏移+2)比较
     jbe no_swap                        ; 前 <= 后 → 顺序对, 不用换 (升序)
     xchg ax, [bx+2]                    ; ★交换: 现在 ax=后一个数
     mov [bx], ax                       ;   把小的写回前一个位置
no_swap:
     add bx, 2
     loop inner                         ; 一轮 9 次比较结束, 最大的冒到了最后
     dec dx
     jnz outer                          ; 9 轮全部结束

     ;=========================================================
     ; 打印排序后 (第二次, 代码和上面几乎一样 —— 想消灭它吗?)
     ;=========================================================
     mov dx, offset msg2
     mov ah, 9
     int 21h

     mov bx, offset arr
     mov cx, 10
pa_loop:
     mov al, [bx]
     mov ah, 0
     div ten
     push ax
     cmp al, 0
     jne pa_tens
     mov dl, ' '
     mov ah, 2
     int 21h
     jmp pa_ones
pa_tens:
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h
pa_ones:
     pop ax
     mov dl, ah
     add dl, '0'
     mov ah, 2
     int 21h
     mov dl, ' '
     mov ah, 2
     int 21h
     add bx, 2
     loop pa_loop

     mov dx, offset crlf
     mov ah, 9
     int 21h

     mov ah, 4ch
     int 21h
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: 内层循环如果用 CX 计数, 外层也用 CX, 会出什么问题? (必考!)
;   Q: xchg ax,[bx+2] 交换后, ax 和 [bx+2] 分别装的是哪个数?
;   Q: 为什么除法前坚持 xor dx,dx? 试试删掉再运行 12345 那次打印?
;---------------------------------------------------------------------
