;=====================================================================
; L07FUNC.ASM   第 7 课   子程序 call/ret + 栈的逆序妙用
;---------------------------------------------------------------------
; 本课知识点 (本课是分水岭, 慢慢看):
;   1. call 标号 = 把"下一条指令的地址"压栈, 然后跳到标号;
;      ret        = 从栈里弹出那个地址, 跳回去 → 这就是子程序的原理
;   2. ★本课开始必须定义栈段! 没有栈段时 push/call 是在"危险的野栈"上工作,
;      link 时那句 "warning L4021: no stack segment" 就是在提醒你。
;      定义 stack 段后, link 会自动帮你设置 SS:SP。(警告也消失了)
;   3. 子程序的"约定":
;        - 参数怎么传:  本课用 DX 传 (和 9 号功能保持一致)
;        - 谁保护寄存器: 子程序开头 push 用到的, 返回前 pop 恢复,
;          这样调用者不用操心 (← 这是好习惯, 考试也爱考)
;   4. ★打印任意十进制数的通用套路 (务必背下来):
;        div 10 只能从"个位→十位→百位"拆, 但我们要反过来打印!
;        解法: 每拆出一位就 push 压栈, 拆完再 pop —— 栈是后进先出,
;        于是最高位最先出来 → 顺序正好
;   5. xor dx,dx 清零的重要性: 16 位除法 div bx 是 DX:AX ÷ BX,
;      若 DX 不清零, 数值大时商装不下 → "除法溢出"直接崩溃
;---------------------------------------------------------------------
; 运行结果:
;   0 7 42 12345 65535 300 43981
;   (最后那个 43981 是 0ABCDh 的十进制 —— 它证明穿过两个子程序后
;    AX 的值毫发无损, 这就是"保护好寄存器"的价值)
;---------------------------------------------------------------------
; 练习:
;   (1) 加一句 call printnum 打印 100 和 999 试试边界
;   (2) 写一个子程序 printhex, 用查表法打印 4 位十六进制 (L08 有答案)
;   (3) 挑战: 写子程序 printspaced, 打印 DX 中的数并自动在后面补一个空格,
;       然后把 main 里的空格串全部省掉
;=====================================================================

;---- 栈段: 名字随意, 但 combine 类型必须是 stack, link 才知道这是栈 ----
stack segment stack
     db 200h dup(0)                     ; 分配 512 字节栈空间
stack ends

data segment
     sep  db ' $'                       ; 数字之间的分隔 (空格)
     crlf db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;---- 依次调用 printnum 打印 5 个数, 顺便看子程序好不好用 ----
     mov dx, 0
     call printnum                      ; 打印 0 (边界: 别打出空字符串!)
     mov dx, offset sep
     call printstr
     mov dx, 7
     call printnum
     mov dx, offset sep
     call printstr
     mov dx, 42
     call printnum
     mov dx, offset sep
     call printstr
     mov dx, 12345
     call printnum
     mov dx, offset sep
     call printstr
     mov dx, 65535                      ; 16 位无符号数的最大值
     call printnum
     mov dx, offset sep
     call printstr

     ;---- 验证"寄存器保护": AX 里放个值, 穿过 printnum 后还在不在? ----
     mov ax, 0abcdh
     mov dx, 300
     call printnum                      ; printnum 内部保护了 AX
     mov dx, offset sep
     call printstr
     mov dx, ax                         ; ★AX 还是 ABCDh → 打印 43981
     call printnum                      ; (如果子程序没保护 AX, 这里就错了)

     mov dx, offset crlf
     call printstr

     mov ah, 4ch
     int 21h

;=====================================================================
; printnum -- 打印 DX 里的无符号数 (0 ~ 65535), 十进制
;   入口: DX = 要打印的数
;   破坏: 无 (用到的寄存器全部自己保护)
;   原理: 反复除以 10, 余数(从个位开始)逐个压栈, 最后弹栈打印
;=====================================================================
printnum:
     push ax                            ; ---- 保护现场 (顺序随便) ----
     push bx
     push cx
     push dx

     mov ax, dx                         ; 参数从 DX 取进来
     mov cx, 0                          ; CX 记录一共拆出几位
     mov bx, 10                         ; 除数

pn_div:
     xor dx, dx                         ; ★★ 必须清零! 否则大数时除法溢出崩溃
     div bx                             ; AX ÷ BX: AX = 商, DX = 余数(0~9)
     push dx                            ; 余数是一位数字, 压栈寄存
     inc cx                             ; 位数 +1
     test ax, ax                        ; 商是 0 了吗?
     jnz pn_div                         ; 不是就接着拆

pn_out:
     pop dx                             ; ★栈后进先出: 先弹出的是最高位
     add dl, '0'                        ; 数字 0~9 → 字符 '0'~'9'
     mov ah, 2
     int 21h                            ; 打印这一位
     loop pn_out                        ; 共 CX 位, 一位一位打完

     pop dx                             ; ---- 恢复现场 (顺序必须和保存相反!) ----
     pop cx
     pop bx
     pop ax
     ret                                ; 弹出返回地址, 回到 call 的下一条指令

;=====================================================================
; printstr -- 打印 DX 指向的 '$' 结尾字符串
;   入口: DX = 字符串偏移地址 (和 9 号功能一样)
;   破坏: 无 (9 号功能会改 AX, 所以也要保护 AX!)
;   ※ 好子程序的纪律: 调用者不用看你的代码, 就知道你不会弄脏寄存器
;=====================================================================
printstr:
     push ax                            ; 9 号功能会占用 AH, 所以 AX 也要保
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: call 执行时栈里多了什么? ret 时少了什么? 画一下 SP 的变化图
;   Q: 为什么恢复现场的顺序必须和保存相反? 试试故意写反会怎样
;   Q: 这个 printnum 打印 65535 时, 一共 push 了几次数字? 为什么不会溢出?
;   Q: 如果我把 push dx 换成 pop dx 会怎样? (调试器里单步看栈!)
;---------------------------------------------------------------------
