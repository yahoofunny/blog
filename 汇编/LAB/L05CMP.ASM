;=====================================================================
; L05CMP.ASM   第 5 课   cmp 比较与条件跳转: 写"会做判断"的程序
;---------------------------------------------------------------------
; 本课知识点:
;   1. cmp a,b 的本质: 做一次减法 a-b, 但"结果不保存", 只改标志位!
;   2. 条件跳转靠标志位吃饭, 常用组合:
;        je / jne   (相等 / 不等)
;        jb / jbe / ja / jae   ← 无符号数用这组 (below/above)
;        jl / jle / jg / jge   ← 有符号数用这组 (less/greater)
;   3. 判断字符类别的经典顺序: 先查 '0'~'9', 再查 'A'~'Z', 再查 'a'~'z'
;   4. 找最大值的经典写法: 假定第一个是最大, 逐个比武, 谁大谁当擂主
;---------------------------------------------------------------------
; 运行结果:
;   a - LOWERCASE
;   Z - UPPERCASE
;   5 - DIGIT
;   ? - OTHER
;   m - LOWERCASE
;   max = 92
;---------------------------------------------------------------------
; 练习:
;   (1) 加一个字符 'q' 进数组, 看分类结果对不对
;   (2) 改成找最小值 (把 jae 换成 jbe, "谁小谁当擂主")
;   (3) 同时输出最大值和最小值
;   (4) 思考题: 数组里放 0FFh 和 01h (当作有符号数 1 和 -1), 
;       找最大用 jae (无符号) 结果对吗? 该用哪个跳转?
;=====================================================================

data segment
     tests db 'a','Z','5','?','m'       ; 待分类的 5 个字符
     arr   dw 17,92,33,88,45            ; 待找最大值的数组
     s1    db ' - $'                    ; 字符和分类之间的分隔
     w1    db 'LOWERCASE$'
     w2    db 'UPPERCASE$'
     w3    db 'DIGIT$'
     w4    db 'OTHER$'
     msg   db 'max = $'
     crlf  db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;=========================================================
     ; 任务 1: 给 5 个字符分类
     ;=========================================================
     mov bx, offset tests
     mov cx, 5
cls_loop:
     ;---- 先打印字符本身 --------------------------------------
     mov dl, [bx]
     mov ah, 2
     int 21h

     mov dx, offset s1                  ; 打印 " - "
     mov ah, 9
     int 21h

     ;---- 判断是不是数字 '0'..'9' -----------------------------
     mov al, [bx]
     cmp al, '0'
     jb  chk_upper                      ; 比 '0' 小, 肯定不是数字
     cmp al, '9'
     jbe is_digit                       ; 落在 '0'..'9' → 是数字
                                        ; jbe = jump if below or equal (无符号 ≤)

chk_upper:
     ;---- 判断是不是大写 'A'..'Z' -----------------------------
     cmp al, 'A'
     jb  chk_lower
     cmp al, 'Z'
     jbe is_upper

chk_lower:
     ;---- 判断是不是小写 'a'..'z' -----------------------------
     cmp al, 'a'
     jb  is_other
     cmp al, 'z'
     jbe is_lower
     jmp is_other                       ; 比 'z' 还大 → 其他

is_digit:
     mov dx, offset w3
     jmp show
is_upper:
     mov dx, offset w2
     jmp show
is_lower:
     mov dx, offset w1
     jmp show
is_other:
     mov dx, offset w4

show:
     mov ah, 9
     int 21h
     mov dx, offset crlf
     mov ah, 9
     int 21h

     inc bx                             ; db 数组, 指针每次 +1
     loop cls_loop

     ;=========================================================
     ; 任务 2: 找数组最大值 (打擂台法)
     ;=========================================================
     mov bx, offset arr
     mov ax, [bx]                       ; ★假定第一个元素是"擂主"
     mov cx, 4                          ; 还剩 4 个要挑战

max_loop:
     add bx, 2
     cmp ax, [bx]                       ; 擂主 vs 挑战者
     jae keep_champ                     ; 擂主 >= 挑战者 → 擂主不动
     mov ax, [bx]                       ; 挑战者更大 → 换擂主
keep_champ:
     loop max_loop

     ; 循环结束, AX = 最大值 92

     mov si, ax                         ; ★★先救走最大值再打印!
                                        ;   int 21h 会破坏 AX, 顺序反了值就没了

     mov dx, offset msg
     mov ah, 9
     int 21h

     mov ax, si                         ; 从 SI 取回最大值
     ; 打印两位十进制: 商给十位, 余数给个位 (先藏余数再打印!)
     mov bl, 10
     div bl                             ; 92 ÷ 10 → AL=9, AH=2
     mov cl, ah                         ; 藏个位
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h
     mov dl, cl
     add dl, '0'
     mov ah, 2
     int 21h

     mov dx, offset crlf
     mov ah, 9
     int 21h

     mov ah, 4ch
     int 21h
code ends
end start

;---------------------------------------------------------------------
; 追问自己 (考试常考):
;   Q: cmp 之后哪些标志位会变? 为什么说 cmp 是"只做减法不存结果"?
;   Q: jb 和 jl 什么时候结果不一样? 举个具体例子!
;   Q: "打擂法" 找最大, 如果数组是空的会怎样? 考不考虑边界?
;---------------------------------------------------------------------
