;=====================================================================
; P1CALC.ASM   项目 1: 整数计算器 (输入 "12+34", 输出 46)
;=====================================================================
; [项目说明 —— 动手前先读一遍]
;
; 目标: 做一个能算 + - * / 的计算器, 反复计算, 直到输入 q 或直接回车退出。
;
; 运行效果:
;     CALC: 12+34
;      = 46
;     CALC: 7*6
;      = 42
;     CALC: 100/7
;      = 14 rem 2
;     CALC: 3-10
;      = -7
;     CALC: q
;     Bye!
;
; ---- 拆解思路 (对着这里看代码就不会迷路) ----
;   1. 打印提示, 用 0Ah 功能读一整行到缓冲区
;   2. 解析第一个数: 逐个读数字字符, "值 = 值×10 + 数字"
;   3. 碰到非数字 → 那就是运算符, 存到变量 op
;   4. 继续解析第二个数
;   5. 按 op 分四路: + - * /  (乘法查溢出, 除法查除 0)
;   6. 打印结果: 负数先打 '-' 再取反; 除法打印商, 有余数补 " rem 余数"
;   7. 跳回第 1 步, 继续下一轮
;
; ---- 本项目出现的"新招式" ----
;   * 0Ah 缓冲输入: 缓冲区格式 db 最大长度, 实际长度, 内容...  实际长度在 [buf+1]
;   * 16 位乘除: mul bp → DX:AX 里是积; div bp → AX=商 DX=余
;   * 负数显示: 判断符号 → 打 '-' → neg 取绝对值90
;   * 把 L07 的子程序 printnum / printstr 搬过来直接用
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     buf    db 40, 0, 40 dup(0)         ; 0Ah 输入缓冲区
     m_hi   db 0dh,0ah,'CALC -- e.g. 12+34   (q or empty = quit)$'
     m_calc db 0dh,0ah,'CALC: $'
     m_eq   db ' = $'
     m_rem  db ' rem $'
     m_badop db ' = (unknown operator!)$'
     m_ov   db ' = (OVERFLOW: result > 65535)$'
     m_dz   db ' = (DIV BY ZERO!)$'
     m_bye  db 0dh,0ah,'Bye!$'
     crlf   db 0dh,0ah,'$'
     op     db 0                        ; 存运算符
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     mov dx, offset m_hi
     call printstr

;=============================================================
; 主循环: 读一行 → 算 → 输出 → 再来
;=============================================================
top:
     mov dx, offset m_calc
     call printstr

     ;---- 读一整行 (0Ah): 最多 39 个字符, 到回车为止 ----
     mov dx, offset buf
     mov ah, 0ah
     int 21h
     ; 读完后: buf+1 = 实际输入长度(不含回车), 内容从 buf+2 开始            

     ;---- 退出检查: 空行 或 首字符是 q/Q ----
     ;   ★这里也踩了"条件跳转只能跳 ±127 字节"的坑:
     ;     quit 在几百字节之外, je quit 会报错!
     ;     套路还是: 条件跳转往近处跳, 远距离用 jmp 接力
     mov al, buf+1
     cmp al, 0
     je  want_quit                      ; 空行 → 去小跳板
     mov al, buf+2
     or  al, 00100000b                  ; 统一变小写再比, 大小写 Q 都能退
     cmp al, 'q'
     jne parse_go                       ; 不是 q → 正式开工
want_quit:
     jmp quit                           ; ★远跳交给 jmp (它不受范围限制)
parse_go:

     ;=========================================================
     ; 解析第一个数 → BX  (套路: 值 = 值×10 + 数字)
     ;   ★注意这里的跳转写法: 8086 的条件跳转(jb/ja...)只能跳 ±127 字节,
     ;     想跨过整个循环体跳出去会报 "Jump out of range"!
     ;     解法: 条件跳转只跳到紧邻的标签, 跨远距离交给 jmp (jmp 无距离限制)
     ;=========================================================
     mov si, offset buf+2               ; SI 指向输入内容
     xor bx, bx                         ; BX = 第一个数
p1_loop:
     mov al, [si]
     cmp al, '0'
     jae p1_isge                        ; 可能 >= '0', 过去细看
     jmp p1_done                        ; 比 '0' 小 → 不是数字, 结束
p1_isge:
     cmp al, '9'
     jbe p1_digit                       ; 落在 '0'..'9' 区间
     jmp p1_done                        ; 比 '9' 大 → 到头了
p1_digit:
     sub al, '0'                        ; 字符 → 数字
     mov ah, 0                          ; AX = 数字 (0~9)
     push ax                            ; 先存住这个数字
     mov ax, bx
     mov dx, 10
     mul dx                             ; DX:AX = BX×10 (小规模数忽略高位)
     mov bx, ax
     pop ax
     add bx, ax                         ; BX = BX×10 + 数字
     inc si
     jmp p1_loop
p1_done:                                ; SI 停在第一个非数字字符上

     ;=========================================================
     ; 取运算符 → op 变量
     ;=========================================================
     mov al, [si]
     mov op, al
     inc si

     ;=========================================================
     ; 解析第二个数 → BP  (和第一个数同一套路, 换成 BP 存)
     ;=========================================================
     xor bp, bp
p2_loop:
     mov al, [si]
     cmp al, '0'
     jae p2_isge
     jmp p2_done
p2_isge:
     cmp al, '9'
     jbe p2_digit
     jmp p2_done
p2_digit:
     sub al, '0'
     mov ah, 0
     push ax
     mov ax, bp
     mov dx, 10
     mul dx
     mov bp, ax
     pop ax
     add bp, ax
     inc si
     jmp p2_loop
p2_done:

     ;=========================================================
     ; 按运算符分四路
     ;=========================================================
     mov ax, bx                         ; AX = 第一个数
     cmp op, '+'
     je  do_add
     cmp op, '-'
     je  do_sub
     cmp op, '*'
     je  do_mul
     cmp op, '/'
     je  do_div
     ; 都不是 → 认不出的运算符
     mov dx, offset m_badop
     call printstr
     jmp next_round

do_add:
     add ax, bp                         ; 两数相加 (超过 65535 会静默回绕, 见挑战3)
     jmp show_signed

do_sub:
     sub ax, bp                         ; 结果可能为负 → 走有符号显示
     jmp show_signed

do_mul:
     mul bp                             ; ★16 位乘: DX:AX = AX × BP
     test dx, dx
     jnz mul_ovf                        ; 高位不为 0 → 结果超过 65535, 装不下
     jmp show_signed

do_div:
     cmp bp, 0
     je  div_zero                       ; ★除 0 检查 (不查会直接崩)
     xor dx, dx                         ; ★16 位除前必须清 DX
     div bp                             ; AX = 商, DX = 余数
     mov si, dx                         ; 余数藏进 SI
     mov dx, offset m_eq
     call printstr                      ; 打印 " = "
     mov dx, ax
     call printnum                      ; 再打印商
     cmp si, 0
     je  next_round                     ; 整除, 没有余数
     mov dx, offset m_rem
     call printstr
     mov dx, si
     call printnum                      ; 再打印 " rem 余数"
     jmp next_round

mul_ovf:
     mov dx, offset m_ov
     call printstr
     jmp next_round

div_zero:
     mov dx, offset m_dz
     call printstr
     jmp next_round

;=============================================================
; 有符号显示: AX 里的结果可能有负号
;   AX >= 0 → 直接打印; AX < 0 → 打 '-' 再 neg 取绝对值
;=============================================================
show_signed:
     mov dx, offset m_eq
     call printstr                      ; 打印 " = "

     cmp ax, 0
     jge ss_positive                    ; 非负, 直接打
     ; 负数: 先打负号, 再取相反数
     push ax                            ; ★int 21h 会毁 AX, 先存
     mov dl, '-'
     mov ah, 2
     int 21h
     pop ax
     neg ax                             ; AX = -AX (求相反数)

ss_positive:
     mov dx, ax
     call printnum
     jmp next_round

;=============================================================
next_round:
     mov dx, offset crlf
     call printstr
     jmp top                            ; 下一轮!

quit:
     mov dx, offset m_bye
     call printstr
     mov ah, 4ch
     int 21h

;=============================================================
; printnum -- 打印 DX 里的无符号数 0~65535 (从 L07 搬来)
;   保护全部用到的寄存器
;=============================================================
printnum:
     push ax
     push bx
     push cx
     push dx
     mov ax, dx
     mov cx, 0
     mov bx, 10
pn_div:
     xor dx, dx                         ; ★不清零大数时会"除法溢出"崩溃
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

;=============================================================
; printstr -- 打印 DX 指向的 '$' 结尾字符串
;=============================================================
printstr:
     push ax
     mov ah, 9
     int 21h
     pop ax
     ret
code ends
end start

;=====================================================================
; 做完了? 试试这些挑战 (练手顺序由易到难):
;   1. 支持多段表达式? 不, 先支持整数前后的空格: " 12 + 34 " 
;      (提示: 解析数字前先跳过空格 cmp al,' ')
;   2. 加一个 "repeat last result" —— 输入 "r+5" 时, r 代表上次的结果
;   3. 加法/减法溢出也检测: 加法的进位怎么看? (提示: jc / add 后的 CF)
;   4. 大改造: 直接用两个数的十六进制输入输出 (0Ah 读字符, 查表转换)
;   5. 终极: 括号和优先级? —— 程序会复杂很多, 但你已经会所有零件了
;=====================================================================
