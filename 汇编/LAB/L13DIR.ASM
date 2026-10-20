;=====================================================================
; L13DIR.ASM   第 13 课   伪指令与数据定义: 把"内存布局题"真跑一遍
;=====================================================================
; [为什么加这一课]
;   翻你们的历年试卷, 有一个题型几乎年年出现:
;     "BUFF DB '34',-6,$   ARRAY DW 1234H
;      用十六进制按字节标出以上数据在内存中的存放"        (2012A 三.3)
;     "ORG $+20H ... 变量 DA1 分配了几个字节? BUF 偏移多少?" (2022-2023 一.6)
;   这类题光背结论很容易记混 —— 本课把数据段的每个字节"打印出来给你看",
;   眼见为实, 以后考场上脑子里能放录像。
;
; [本课知识点]
;   1. DB/DW/DD: 一个数据单位分别占 1/2/4 字节; 字和双字都是"小端序"存放
;      (低字节放低地址) —— 所以 dw 1234H 在内存里是 34 12
;   2. '$' : 汇编时的"当前偏移地址" (不是钱的符号!) 
;      db $ 存进去的就是这一格自己的偏移 (低字节)
;   3. ORG $+20H: 把定位计数器("当前位置")往后挪 20H 个字节,
;      制造一段空隙 —— 所以它会把后面所有变量的偏移都推后
;   4. 四个"取值运算符" (考点! 考试爱考它们的返回值):
;        OFFSET 变量  → 变量的偏移地址
;        SEG    变量  → 变量的段地址
;        TYPE   变量  → 每个数据单位占的字节数 (DB=1, DW=2, DD=4)
;        LENGTH 变量  → 第一个 DUP 的重复次数 (没有 DUP 时是 1! ★大坑)
;        SIZE   变量  → TYPE × LENGTH (★这也是个坑)
;   5. EQU: 数字等价伪指令, 可以用 $ 和表达式计算 (如 KEQU d2-d1)
;
; [运行结果] (跑一下, 和你自己算的对照!)
;   1) t1 的 3 个字节: 33 34 FA     ← '3' '4' 和 -6 的补码
;   2) t2 的 2 个字节: 34 12        ← 小端序!
;   3) t3 的 4 个字节: 44 33 22 11
;   4) wnd 的 2 个字节: 09 00       ← ★$ 存的就是它自己的偏移 0009H!
;      (考卷里 `DB '34',-6,$` 那个 $ 同理, 想存的是"那个字节自己的偏移")
;   5) ORG 演练: gap 的偏移 = 2BH,  buf 的偏移 = 3CH
;   6) TYPE/SIZE/LENGTH 的真实值 (尤其注意 d1 的 LENGTH 是 1 不是 4!)
;
; [★关于 $ 的一个大实话 (实测, 不是书上抄的)]
;   * MASM 5.0 不接受 `DB '34',-6,$` 这种写法 —— 会报 error A2042:
;     Constant expected! (老师说考卷上可以写, 但你们的实验环境编不过, 别慌)
;   * 但 `DW $` 可以, 而且实测存的就是"本条数据自己的偏移"
;     (本程序会把它打印出来, 眼见为实)
;   * 你们 2012A 标准答案里这道题的 $ 字节写的是 04H, 而按汇编器实测
;     应是 03H —— 差 1 的原因是"口径": 老师按"本条语句结束后的位置"算,
;     汇编器按"数据项自己的偏移"算。考试按老师口径填 (04H);
;     做实验按实测为准。两边都记住, 这题就永远错不了。
;
; [练习 —— 就是你们的真题]
;   (1) 2022-2023 一.6: ORG $+20H / DA1 DB 10H DUP(2,3) / DA2 DW 10H DUP(2,3)
;       手算: DA1 几个字节? DA2 几个字节? 最后 ORG $+20H 后 BUF 偏移多少?
;       用本课的思路验证: 复制数据定义到 T.ASM, 用 OFFSET 打印验证
;   (2) 2012A 四.1: A0 DW A1 / A1 DB 3 DUP(9) / A2 DW 4,5
;       LEN1 = A2-A1 和 LEN2 = $-A2 分别是多少? 写程序打印验证
;   (3) 09级: BUF DB 2,3,4; 执行 MOV AL,SIZE BUF 后 AL=?
;       (把 SIZE 理解成"总字节数"就上当了 —— 看看本课 d1 的实测值)
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     ;===== 实验区 1: 复刻 2012A 的内存布局题 =====
     ;  考卷原文是:  BUFF DB '34',-6,$
     ;  但 MASM 5.0 实测不接受 db 里直接写 $ (error A2042)!
     ;  所以这里拆成两半演示: '34',-6 照旧; $ 用 dw 版本实测 (见 wnd)
     t1   db '34', -6                   ; 3 字节: 字符'3' '4', -6的补码 FA
     t2   dw 1234h                      ; 2 字节: 小端 34 12
     t3   dd 11223344h                  ; 4 字节: 小端 44 33 22 11
     wnd  dw $                          ; 2 字节: ★$ = 本数据项自己的偏移 (实测!)

     ;===== 实验区 2: ORG 演练 (2022 真题题型) =====
     org  $+20h                         ; 当前位置往后空 20H 字节
     gap  db 'A'                        ; 它的偏移 = 0BH+20H = 2BH
     org  $+10h                         ; 再空 10H 字节
     buf  dw 1234h                      ; 它的偏移 = 2CH+10H = 3CH

     ;===== 实验区 3: TYPE/SIZE/LENGTH 的真面目 =====
     d1   db 1,2,3,4                    ; 无 DUP → LENGTH=1, SIZE=1 (★反直觉!)
     d2   dw 4 dup(1)                   ; 有 DUP → LENGTH=4, SIZE=8
     d3   db 10 dup('x')                ; LENGTH=10, SIZE=10
     DIFF equ d2 - d1                   ; EQU 伪指令做减法: 两个偏移之差

     ;===== 打印用的字符串 =====
     s1   db 0dh,0ah,'1) t1: $'
     s2   db 0dh,0ah,'   t2: $'
     s3   db 0dh,0ah,'   t3: $'
     s18  db 0dh,0ah,'   wnd: $'
     s4   db 0dh,0ah,'2) OFFSET gap = $'
     s5   db 'H, OFFSET buf = $'
     s6   db 0dh,0ah,'3) TYPE d1 = $'
     s7   db 'h, SIZE d1 = $'
     s8   db 'h, LENGTH d1 = $'
     s9   db 'h$'
     s10  db 0dh,0ah,'   TYPE d2 = $'
     s11  db 'h, SIZE d2 = $'
     s12  db 'h, LENGTH d2 = $'
     s13  db 0dh,0ah,'   TYPE d3 = $'
     s14  db 'h, SIZE d3 = $'
     s15  db 'h, LENGTH d3 = $'
     s16  db 0dh,0ah,'   DIFF(d2-d1) = $'
     s17  db 'h$'
     crlf db 0dh,0ah,'$'
     hextab db '0123456789ABCDEF'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;==================== 1. 逐个字节打印 t1 ====================
     mov dx, offset s1
     call printstr
     mov al, t1                         ; '3' = 33H
     call printbyte
     mov al, t1+1                       ; '4' = 34H ('+1' 就是下一个字节!)
     call printbyte
     mov al, t1+2                       ; -6 的补码 = FAH
     call printbyte

     ;==================== 2. t2 的 2 个字节 (小端序!) ====================
     ;   ★dw/dd 的数据想按"字节"取, 要写 byte ptr 强转 —— 
     ;     不写会报 "Operand types must match"(类型不匹配警告),
     ;     这正是考卷"找错题"最爱考的类型问题
     mov dx, offset s2
     call printstr
     mov al, byte ptr t2                ; 低字节在前: 34H
     call printbyte
     mov al, byte ptr t2+1              ; 高字节在后: 12H
     call printbyte

     ;==================== 3. t3 的 4 个字节 ====================
     mov dx, offset s3
     call printstr
     mov al, byte ptr t3
     call printbyte
     mov al, byte ptr t3+1
     call printbyte
     mov al, byte ptr t3+2
     call printbyte
     mov al, byte ptr t3+3
     call printbyte

     ;==================== 3.5 wnd: 看 $ 存进去的真实值 ====================
     mov dx, offset s18
     call printstr
     mov al, byte ptr wnd                ; 低字节
     call printbyte
     mov al, byte ptr wnd+1              ; 高字节
     call printbyte
     ; (小端序读出来是 0900H → 也就是 0009H, 正好是 wnd 自己的偏移!)

     ;==================== 4. ORG 之后两个变量的真实偏移 ====================
     mov dx, offset s4
     call printstr
     mov ax, offset gap                 ; 一个 word 的偏移, 用两个字节打印
     push ax
     mov al, ah
     call printbyte
     pop ax
     call printbyte
     mov dx, offset s5
     call printstr
     mov ax, offset buf
     push ax
     mov al, ah
     call printbyte
     pop ax
     call printbyte

     ;==================== 5. TYPE/SIZE/LENGTH 实测 ====================
     mov dx, offset s6
     call printstr
     mov al, type d1
     call printbyte
     mov dx, offset s7
     call printstr
     mov al, size d1
     call printbyte
     mov dx, offset s8
     call printstr
     mov al, length d1                  ; ★惊喜: 不是 4, 是 1!
     call printbyte
     mov dx, offset s9
     call printstr

     mov dx, offset s10
     call printstr
     mov al, type d2
     call printbyte
     mov dx, offset s11
     call printstr
     mov al, size d2
     call printbyte
     mov dx, offset s12
     call printstr
     mov al, length d2
     call printbyte
     mov dx, offset s9
     call printstr

     mov dx, offset s13
     call printstr
     mov al, type d3
     call printbyte
     mov dx, offset s14
     call printstr
     mov al, size d3
     call printbyte
     mov dx, offset s15
     call printstr
     mov al, length d3
     call printbyte
     mov dx, offset s9
     call printstr

     mov dx, offset s16
     call printstr
     mov al, DIFF
     call printbyte

     mov dx, offset crlf
     call printstr

     mov ah, 4ch
     int 21h

;=====================================================================
; printbyte -- 打印 AL 的两位十六进制 (查表法, L08 的老朋友)
;=====================================================================
printbyte:
     push ax
     push bx
     push cx
     push dx
     mov cl, al
     mov bx, offset hextab
     mov al, cl
     shr al, 1
     shr al, 1
     shr al, 1
     shr al, 1
     xlat
     mov dl, al
     mov ah, 2
     int 21h
     mov al, cl
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

;=====================================================================
; printstr -- 打印 DX 指向的 '$' 结尾字符串
;=====================================================================
printstr:
     push ax
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start
