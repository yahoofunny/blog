;=====================================================================
; E01P1.ASM   期末模拟卷(一) 编程题 1 —— 参考答案
;---------------------------------------------------------------------
; 题目:
;   从键盘输入一个字符, 判断它是什么类型, 并在下一行输出对应英文:
;     数字 '0'~'9'   → 输出 DIGIT
;     大写 'A'~'Z'   → 输出 UPPER
;     小写 'a'~'z'   → 输出 LOWER
;     其他           → 输出 OTHER
;
; 评分要点 (考试就这么给分):
;   1. 1 号功能读字符                         (2分)
;   2. 区间判断顺序任意但要正确, 用 cmp+jcc   (4分)
;   3. 四路分支各自打印对应字符串             (2分)
;   4. 9 号功能字符串以 '$' 结尾 + 4Ch 退出   (2分)
;
; 自己先写, 写完再对照 —— 完全一样才说明你真会了
;=====================================================================

data segment
     r_digit db 0dh,0ah,'DIGIT$'
     r_upper db 0dh,0ah,'UPPER$'
     r_lower db 0dh,0ah,'LOWER$'
     r_other db 0dh,0ah,'OTHER$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;---- 读一个字符 ----
     mov ah, 1
     int 21h                            ; AL = 输入的字符 (会回显)

     ;---- 判断 '0'..'9' ----
     cmp al, '0'
     jb  chk_upper                      ; 比 '0' 小 → 查下一类
     cmp al, '9'
     jbe is_digit                       ; 在 '0'..'9' → 数字

chk_upper:
     ;---- 判断 'A'..'Z' ----
     cmp al, 'A'
     jb  chk_lower
     cmp al, 'Z'
     jbe is_upper

chk_lower:
     ;---- 判断 'a'..'z' ----
     cmp al, 'a'
     jb  is_other
     cmp al, 'z'
     jbe is_lower
     jmp is_other                       ; 比 'z' 大 → 其他

is_digit:
     mov dx, offset r_digit
     jmp show
is_upper:
     mov dx, offset r_upper
     jmp show
is_lower:
     mov dx, offset r_lower
     jmp show
is_other:
     mov dx, offset r_other

show:
     mov ah, 9
     int 21h                            ; 打印分类结果

     mov ah, 4ch
     int 21h
code ends
end start
