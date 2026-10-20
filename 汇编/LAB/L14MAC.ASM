;=====================================================================
; L14MAC.ASM   第 14 课   宏: 你们真题里的"文本替换大法"
;=====================================================================
; [为什么加这一课]
;   你们 2022-2023 真题二.5 考了宏展开:
;       MSG MACRO P1, P2, P3
;           IN&P1 P2 P3
;       ENDM
;       K=1
;       MSG %K, DB, 'MY NAME'    ; 展开后是什么?
;       MSG C, AX                ; 展开后是什么?
;   2012A 六.2 还直接让你"写一个宏"。
;   宏是你们课程的重点, 本课把真题这个宏原样搬来跑, 并且告诉你
;   怎么看"宏到底展开成了什么" —— 用列表文件 (.LST) 眼见为实。
;
; [本课知识点]
;   1. MACRO/ENDM: 定义宏; 调用就是"把宏体复制过来, 实参替换形参"
;      —— 所以宏是编译期(汇编期)的文本替换, 不是运行期的调用!
;   2. & (拼接运算符): IN&P1 → 把 "IN" 和 P1 的值缝在一起
;        P1=1 → IN1 (当数据名)      P1=C → INC (当指令助记符!)
;   3. % (展开运算符): 把等值符号(如 K=1)算出数值再传参
;        不写 % → 传过去的字面是 "K", 缝合出来是 INK (名字对不上, 报错)
;   4. LOCAL: 宏体里如果定义标号, 必须用 LOCAL 声明!
;      因为宏被调用两次 = 标号出现两次 → "Symbol already defined"
;   5. 宏 vs 子程序 (必考简答):
;        宏:     汇编时展开, 占代码空间, 不处理调用开销 → 快, 但变胖
;        子程序: 运行时 call/ret, 只存一份 → 省空间, 但每次有压栈开销
;        选择:   短小且频繁的用宏; 长功能用子程序
;
; [怎么看宏展开]
;   自己生成一份列表文件, 搜索 IN1 和 INC, 就能看到宏展开后的真实代码!
;   在 DOSBox 里敲:  masm L14MAC, L14MAC.OBJ, L14MAC.LST;
;
;   ★注意: 列表文件里夹着本文件注释的中文, 用 VS Code 打开会是一堆乱码。
;     别管乱码, 直接 Ctrl+F 搜 inc ax 和 IN1 —— 汇编出来的指令和符号都是
;     纯 ASCII, 一定找得到。用记事本以 ANSI 编码打开也可以, 中文就正常了。
;
; [运行结果]
;   4661  OK 300 65535 5 3
;   (4661=宏展出的 INC AX 真的执行了; OK 是宏展出的数据 IN1;
;    5 和 3 是 LOCAL 宏对两个寄存器求的绝对值)
;
; [练习]
;   (1) 先自己写答案再跑程序验证: MSG %K, DB, 'MY NAME' 展开是什么?
;       MSG C, AX 展开是什么? (真题原题!)
;   (2) 写一个宏 maxc a, b: 把 a 和 b 中较大的那个放进 AX (带符号比较用 jge)
;   (3) 把 prnum 宏改写成子程序版本, 分别编译, 用 ls -l 比较两个 .EXE
;       哪个大? 为什么? (宏每次调用都复制一份代码)
;   (4) 思考: 宏体里的 local pos 如果删掉, 调用两次 absb 会发生什么?
;       动手试试, 把 MASM 的报错抄下来 ("Symbol already defined" ...)
;=====================================================================

;---- 宏定义放最前面 (习惯上) ----

;===== 真题复刻: 2022-2023 二.5 的那个宏 =====
msg macro p1, p2, p3
    in&p1 p2 p3
endm

;===== 自定义宏 1: 打印一个数, 后面跟一个空格 =====
prnum macro v
    mov dx, v
    call printnum
    mov dl, ' '
    mov ah, 2
    int 21h
endm

;===== 自定义宏 2: 求一个字节寄存器的绝对值 (演示 LOCAL) =====
absb macro reg
    local pos                          ; ★没有这句, 调用两次会报标号重复!
    cmp reg, 0
    jge pos
    neg reg
pos:
endm

;===== 自定义宏 3: 无参宏 (程序结尾不用再手写 4Ch 了) =====
bye macro
    mov ah, 4ch
    int 21h
endm

stack segment stack
     db 200h dup(0)
stack ends

data segment
     k = 1                             ; 等值符号 (给 % 展开用)
     msg %k, db, 'OK'                  ; ★展开成: IN1 DB 'OK' (真题同款!)
                                       ;    不信 → 自己生成 .LST 看一眼
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;---- 1. 宏展开出来的 INC AX, 是真的在干活 ----
     mov ax, 1234h
     msg c, ax                         ; ★展开成: INC AX  (1234H → 1235H)
     prnum ax                          ; 打印 4661 (1235H 的十进制)

     ;---- 2. 宏展出的数据 IN1 也真实存在 ('O','K' 两个字节) ----
     mov dl, IN1
     mov ah, 2
     int 21h                           ; 'O'
     mov dl, IN1+1
     mov ah, 2
     int 21h                           ; 'K'
     mov dl, ' '
     mov ah, 2
     int 21h

     ;---- 3. prnum 宏的多次调用 (每次都是一整段代码复制过来) ----
     prnum 300
     prnum 65535

     ;---- 4. LOCAL 宏调用两次, 标号互不打架 ----
     mov bl, -5
     absb bl                           ; BL: -5 → 5
     mov al, bl
     mov ah, 0
     prnum ax

     mov cl, -3
     absb cl                           ; CL: -3 → 3
     mov al, cl
     mov ah, 0
     prnum ax

     mov dx, offset crlf
     call printstr
     bye                               ; 无参宏: 展开成 4Ch 退出那两句

;=====================================================================
; printnum -- 打印 DX 里的无符号数 (L07 标准版)
;   ※注意: 它是"子程序", 用 call 调 —— 跟宏对比体会一下区别
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

;===== printstr -- 打印 DX 指向的 '$' 结尾字符串 =====
printstr:
     push ax
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start
