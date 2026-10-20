;=====================================================================
; P2GRADE.ASM   项目 2: 成绩管理系统 (菜单 + 数组 + 排序 + 统计)
;=====================================================================
; [项目说明 —— 这是"课程设计"级别的综合程序]
;
; 功能菜单:
;     1 - 录入成绩    (一行一个 1~100, 直接回车结束录入)
;     2 - 显示全部
;     3 - 降序排序并显示
;     4 - 统计: 最高/最低/平均分 (平均有一位的空小数)
;     5 - 退出
;
; 运行效果:
;     ===== GRADE MANAGER =====
;       1 - input scores  (empty line = finish)
;       ...
;     choice> 1
;     score (1-100): 88
;     score (1-100): 73
;     score (1-100): 95
;     score (1-100):
;       OK, total = 3
;     ...
;     choice> 4
;       --- stats ---
;       max = 95   min = 73   avg = 85.3
;
; ---- 拆解思路 ----
;   * 数据存储: scores dw 50 dup(0) 数组 + cnt 记个数 (最多存 50 个)
;     数组下标 i 的元素地址 = scores + i*2
;   * 菜单: 01h 读一个字符 → 还记得要把该行剩下的 CR 读掉吗?
;     这就是 flush_line 子程序的作用 (不读会串行!)
;   * 录入: 0Ah 读一行 → 空行结束; 解析数字后校验 1~100
;   * 排序: 冒泡降序, 和 L06 一样, 比较用 jae, 命中就 xchg 交换
;   * 统计: 打擂法求 max/min (L05), 求和 (L04), 平均用"先乘10再除"
;     技巧保留一位小数: avg = (sum*10/cnt), 然后拆成 整数.一位小数
;   * 每个子程序开头 push、结尾 pop —— 保持"不弄脏寄存器"的好纪律
;
; ---- 本题易错点 (考完试你会回来感谢这些注释) ----
;   1. 菜单用 1 号功能读键后, 缓冲区里还剩一个回车! 不处理会直接被
;      下一行的 0Ah "吃掉"当成空行 —— flush_line 就是干这个的
;   2. 数组下标换算: dw 数组第 i 个元素的偏移 = i×2 (shl di,1)
;   3. 平均分的除法: 两次 div 之间必须 xor dx,dx, 否则除法溢出
;   4. 除数/被除数是内存里的 dw 变量时: div cnt (操作数写在指令里就行)
;=====================================================================

stack segment stack
     db 300h dup(0)
stack ends

data segment
     scores dw 50 dup(0)                ; 成绩表 (最多 50 个)
     cnt    dw 0                        ; 已录入的个数
     sumw   dw 0                        ; 求和结果 (统计子程序里用)
     maxw   dw 0
     minw   dw 0
     buf    db 8, 0, 8 dup(0)           ; 输入缓冲区 (够放 "100"+回车)
     menu   db 0dh,0ah,'===== GRADE MANAGER =====',0dh,0ah
            db '  1 - input scores  (empty line = finish)',0dh,0ah
            db '  2 - show all',0dh,0ah
            db '  3 - sort desc and show',0dh,0ah
            db '  4 - statistics (max/min/avg)',0dh,0ah
            db '  5 - quit',0dh,0ah
            db 'choice> $'
     m_prompt db 0dh,0ah,'score (1-100): $'
     m_bad  db 0dh,0ah,'  invalid! only 1-100$'
     m_full db 0dh,0ah,'  (table is full, 50 max)$'
     m_got  db 0dh,0ah,'  OK, total = $'
     m_empty db 0dh,0ah,'  (no scores yet)$'
     m_hdr  db 0dh,0ah,'  --- all scores ---$'
     m_srt  db 0dh,0ah,'  --- sorted desc ---$'
     m_sta  db 0dh,0ah,'  --- stats ---$'
     m_max  db 0dh,0ah,'  max = $'
     m_min  db '   min = $'
     m_avg  db '   avg = $'
     m_no   db '  #$'
     m_colon db ': $'
     m_bye  db 0dh,0ah,'Bye!$'
     crlf   db 0dh,0ah,'$'
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

;=============================================================
; 主循环: 显示菜单 → 读选择 → 调对应子程序
;=============================================================
top:
     mov dx, offset menu
     call printstr

     ;---- 读一个字符当选择 (1 号功能会回显, 屏幕上能看到你按的键) ----
     mov ah, 1
     int 21h
     mov bl, al                         ; 选择存 BL
     call flush_line                    ; ★把这一行剩下的回车读掉!

     cmp bl, 0
     je  quit                           ; 读到文件尾(NULL) → 退出保护
     cmp bl, '1'
     je  c1
     cmp bl, '2'
     je  c2
     cmp bl, '3'
     je  c3
     cmp bl, '4'
     je  c4
     cmp bl, '5'
     je  quit
     jmp top                            ; 无效按键 → 重新显示菜单

c1:
     call input_scores
     jmp top
c2:
     mov dx, offset m_hdr               ; 表头由调用方打, show_all 只管列表
     call printstr
     mov dx, offset crlf
     call printstr
     call show_all
     jmp top
c3:
     call sort_desc
     jmp top
c4:
     call stats
     jmp top

;=============================================================
quit:
     mov dx, offset m_bye
     call printstr
     mov ah, 4ch
     int 21h

;=============================================================
; flush_line -- 把输入缓冲区里剩下的字符读到回车为止
;   (菜单只读了 1 个字符, 后面还躺着一个 CR; 不读掉的话,
;    下一次 0Ah 会立刻读到它, 当成"空行" —— 非常经典的串行 bug)
;=============================================================
flush_line:
     push ax
fl_read:
     mov ah, 1
     int 21h                            ; 阻塞读一个字符 (会回显)
     cmp al, 0dh                        ; 是回车吗?
     je  fl_done
     cmp al, 0                          ; 输入文件用完了? (保护)
     je  fl_done
     jmp fl_read                        ; 不是回车就继续吃
fl_done:
     pop ax
     ret

;=============================================================
; input_scores -- 反复录入, 空行结束
;=============================================================
input_scores:
     push ax
     push bx
     push cx
     push dx
     push si
     push di

is_loop:
     ;---- 先检查表满没满 ----
     mov ax, cnt
     cmp ax, 50
     jb  is_room
     mov dx, offset m_full
     call printstr
     jmp is_done

is_room:
     mov dx, offset m_prompt
     call printstr

     ;---- 0Ah 读一行 ----
     mov dx, offset buf
     mov ah, 0ah
     int 21h

     ;---- 空行? (buf+1 = 实际长度) ----
     mov al, buf+1
     cmp al, 0
     je  is_done

     ;---- 解析数字 → BX, 允许前面有空格 ----
     mov si, offset buf+2
     xor bx, bx
is_sp:                                  ; 跳过前导空格
     cmp byte ptr [si], ' '
     jne is_p
     inc si
     jmp is_sp
is_p:                                   ; 值 = 值×10 + 数字
     mov al, [si]
     cmp al, '0'
     jb  is_pe
     cmp al, '9'
     ja  is_pe
     sub al, '0'
     mov ah, 0
     push ax
     mov ax, bx
     mov dx, 10
     mul dx
     mov bx, ax
     pop ax
     add bx, ax
     inc si
     jmp is_p
is_pe:                                  ; BX = 数值
     ;---- 校验 1~100 ----
     cmp bx, 1
     jb  is_bad
     cmp bx, 100
     ja  is_bad

     ;---- 存进数组: scores[cnt] = BX, cnt++ ----
     mov di, cnt
     shl di, 1                          ; ★dw 数组: 偏移 = 下标×2
     mov scores[di], bx
     inc cnt
     jmp is_loop

is_bad:
     mov dx, offset m_bad
     call printstr
     jmp is_loop

is_done:
     mov dx, offset m_got
     call printstr
     mov dx, cnt
     call printnum                      ; 报告总数
     pop di
     pop si
     pop dx
     pop cx
     pop bx
     pop ax
     ret

;=============================================================
; show_all -- 按录入顺序显示全部
;=============================================================
show_all:
     push ax
     push bx
     push cx
     push dx
     push si
     push di

     mov cx, cnt
     cmp cx, 0
     jne sa_go
     mov dx, offset m_empty
     call printstr
     jmp sa_done

sa_go:
     mov si, 0                          ; SI = 数组字节偏移
     mov di, 1                          ; DI = 显示序号 1,2,3...
sa_loop:
     mov dx, offset m_no
     call printstr                      ; "  #"
     mov dx, di
     call printnum
     mov dx, offset m_colon
     call printstr                      ; ": "
     mov dx, scores[si]                 ; ★取第 si 字节偏移处的元素
     call printnum
     mov dx, offset crlf
     call printstr
     add si, 2                          ; 下一个元素
     inc di
     loop sa_loop

sa_done:
     pop di
     pop si
     pop dx
     pop cx
     pop bx
     pop ax
     ret

;=============================================================
; sort_desc -- 冒泡降序 (大的在前), 排完直接调 show_all 显示
;=============================================================
sort_desc:
     push ax
     push bx
     push cx
     push dx

     mov ax, cnt
     cmp ax, 2
     jb  sd_show                        ; 少于 2 个, 没什么好排的

     dec ax
     mov dx, ax                         ; ★外层轮数放 DX (内层要独占 CX)
sd_outer:
     mov bx, offset scores
     mov cx, cnt
     dec cx                             ; 内层比较 cnt-1 次
sd_inner:
     mov ax, [bx]
     cmp ax, [bx+2]
     jae sd_skip                        ; 降序: 前 >= 后 就对, 不换
     xchg ax, [bx+2]                    ; 前 < 后 → 交换
     mov [bx], ax
sd_skip:
     add bx, 2
     loop sd_inner
     dec dx
     jnz sd_outer

sd_show:
     mov dx, offset m_srt
     call printstr
     mov dx, offset crlf
     call printstr
     call show_all

     pop dx
     pop cx
     pop bx
     pop ax
     ret

;=============================================================
; stats -- 最高分 / 最低分 / 平均分(一位小数)
;=============================================================
stats:
     push ax
     push bx
     push cx
     push dx
     push si
     push di

     mov cx, cnt
     cmp cx, 0
     jne st_go
     mov dx, offset m_empty
     call printstr
     jmp st_done

st_go:
     ;---- 打擂 + 求和 (一趟循环同时干三件事) ----
     mov bx, offset scores
     mov ax, [bx]                       ; AX = 最大值擂主
     mov si, [bx]                       ; SI = 最小值擂主
     xor di, di                         ; DI = 求和累加器
     mov cx, cnt
st_loop:
     add di, [bx]                       ; 累加
     cmp ax, [bx]                       ; 挑战最大值
     jae st_nomax
     mov ax, [bx]
st_nomax:
     cmp si, [bx]                       ; 挑战最小值
     jbe st_nomin
     mov si, [bx]
st_nomin:
     add bx, 2
     loop st_loop

     mov sumw, di                       ; 结果落袋为安 (内存变量)
     mov maxw, ax
     mov minw, si

     ;---- 显示 ----
     mov dx, offset m_sta
     call printstr
     mov dx, offset m_max
     call printstr
     mov dx, maxw
     call printnum
     mov dx, offset m_min
     call printstr
     mov dx, minw
     call printnum

     ;---- 平均分: 先算 (sum*10/cnt), 再拆成 整数.小数位 ----
     mov dx, offset m_avg
     call printstr

     mov ax, sumw
     mov bx, 10
     mul bx                             ; DX:AX = sum×10 (sum ≤ 5000 → DX=0)
     div cnt                            ; AX = 十倍平均值的整数 (截断), DX=余
     xor dx, dx                         ; ★★ 第二次除前必须清零 DX!
     mov bx, 10
     div bx                             ; AX = 整数部分, DX = 小数第一位
     mov si, dx                         ; 藏小数位
     mov dx, ax
     call printnum                      ; 打印整数部分
     mov dl, '.'
     mov ah, 2
     int 21h
     mov dx, si
     call printnum                      ; 打印小数位

st_done:
     pop di
     pop si
     pop dx
     pop cx
     pop bx
     pop ax
     ret

;=============================================================
; printnum -- 打印 DX 里的无符号数 0~65535
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
; 挑战清单 (由易到难):
;   1. 加"删除最后一个"功能 (提示: dec cnt 就行, 数据不用抹)
;   2. 菜单加 "6 - 输入时直接排序"? → 其实就是录入完自动调 sort_desc
;   3. 统计里再加"及格率" (统计 ≥60 的个数, 再算百分比 —— 又是除法)
;   4. 把数组改成 dw 100 dup(0) 支持 100 个成绩 (别忘了改满表判断)
;   5. 大挑战: 支持小数成绩 (定点数: 存 "855" 代表 85.5, 显示时插小数点)
;=====================================================================
