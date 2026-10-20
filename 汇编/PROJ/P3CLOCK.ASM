;=====================================================================
; P3CLOCK.ASM   项目 3: 电子钟 (会走的表 + 显存彩色提示)
;=====================================================================
; [项目说明]
;
; 运行效果:
;   * 屏幕被清空
;   * 屏幕中央每秒刷新一次:  19:31:07
;   * 最后一行中间有黄色提示: Press ESC to quit
;   * 按 ESC → 清屏, 显示 "Clock stopped." 后退出
;
; ---- 拆解思路 (游戏主循环的雏形!) ----
;   1. 初始化: 清屏 (int 10h 6号功能), 用显存直写把提示固定在最后一行
;   2. 主循环每个"心跳"干三件事:
;        a. 查键盘 (0Bh 非阻塞查询) → ESC 就掀桌子走人
;        b. 取时间 (2Ch), 分钟级的值都存下来
;        c. 如果"秒"和上次显示的不一样 → 定位光标 → 重画时间
;   3. 秒没变的时候循环空转 (忙等) —— 教学版够用
;      (思考题: 真正的电子钟应该怎么"省电"? 见挑战 4)
;
; ---- 复习到的旧知识 ----
;   * L10 显存直写 (行24的黄色提示: B800 段 + 属性 0Eh)
;   * L11 取时间 2Ch + print2 补零打印
;   * L12 非阻塞按键 (这里是 DOS 的 0Bh/08h 版)
;   * int 10h 2号功能: 定位光标到 (行12, 列36) 再打印, 就不会到处刷屏
;
; ---- 为什么每秒只重画一次而不是狂刷? ----
;   2Ch 的百分秒也在变, 如果每次都重画, 屏幕会闪、也浪费;
;   用"上次显示的秒"当闸门 (last_s), 变了才动笔 —— 这叫"脏检查",
;   以后写任何菜单/游戏都会用到这个模式
;=====================================================================

stack segment stack
     db 200h dup(0)
stack ends

data segment
     hint   db 'Press ESC to quit'      ; 17 个字符, 写到最后一行中间
     m_stop db 0dh,0ah,'Clock stopped.$'
     hour   db 0                        ; 当前时
     minu   db 0                        ; 当前分
     secn   db 0                        ; 当前秒
     last_s db 0ffh                     ; 上次"已显示"的秒 (初值不可能出现, 保证首帧就画)
data ends

code segment
     assume cs:code, ds:data
start:
     mov ax, data
     mov ds, ax

     ;---- 1. 清屏 (int 10h 6号功能, al=0 就是全屏刷空) ----
     mov ah, 6
     mov al, 0
     mov bh, 7                          ; 刷成黑底白字
     mov cx, 0                          ; 左上 0 行 0 列
     mov dx, 184fh                      ; 右下 24 行 79 列
     int 10h

     ;---- 2. 最后一行写黄色提示 (显存直写, L10 复习) ----
     ;   行24: 24×160 = 3840; 居中: (80-17)÷2 = 31 列 → 31×2 = 62
     ;   目标偏移 = 3840 + 62 = 3902
     mov ax, 0b800h
     mov es, ax
     mov di, 3902
     mov si, offset hint
     mov cx, 17
     mov ah, 0eh                        ; 属性 0Eh = 黑底黄字
hw_loop:
     mov al, [si]
     mov es:[di], ax                    ; 低字节=字符, 高字节=属性
     add di, 2
     inc si
     loop hw_loop

;=============================================================
; 主循环 (游戏心跳雏形): 查键 → 取时间 → 变了才重画
;=============================================================
loop_top:
     ;---- a. 非阻塞查键盘 (0Bh: AL=FFh 表示有键等着) ----
     mov ah, 0bh
     int 21h
     cmp al, 0ffh
     jne no_key                         ; 没键 → 干正事去
     ; 有键: 读走 (08h 读取且不回显)
     mov ah, 08h
     int 21h
     cmp al, 1bh                        ; 是 ESC (1Bh) 吗?
     je  fin
     ; 其他按键: 白按了, 丢掉继续

no_key:
     ;---- b. 取时间 (2Ch): CH=时 CL=分 DH=秒 DL=百分秒 ----
     mov ah, 2ch
     int 21h
     cmp dh, last_s
     je  loop_top                       ; 秒没变 → 回去接着查键 (忙等)
     ; 秒变了! 记下新的一帧
     mov last_s, dh
     mov hour, ch
     mov minu, cl
     mov secn, dh

     ;---- c. 定位光标到屏幕中央 (12 行 36 列) 再打印 ----
     ;   "HH:MM:SS" 共 8 字符, 居中: (80-8)÷2 = 36
     mov ah, 2
     mov bh, 0
     mov dh, 12
     mov dl, 36
     int 10h

     mov al, hour
     call print2                        ; 时 (两位, 补零)
     mov dl, ':'
     mov ah, 2
     int 21h
     mov al, minu
     call print2                        ; 分
     mov dl, ':'
     mov ah, 2
     int 21h
     mov al, secn
     call print2                        ; 秒
     jmp loop_top                       ; 回去继续守夜

;=============================================================
fin:
     ;---- ESC 按下: 清屏 + 告别 ----
     mov ah, 6
     mov al, 0
     mov bh, 7
     mov cx, 0
     mov dx, 184fh
     int 10h
     mov ah, 2                          ; 光标放到屏幕中间报幕
     mov bh, 0
     mov dx, 0c00h                      ; 12 行 0 列
     int 10h
     mov dx, offset m_stop
     mov ah, 9
     int 21h
     mov ah, 4ch
     int 21h

;=============================================================
; print2 -- AL 里的 0~99 打印成两位十进制 (补零), 同 L11
;=============================================================
print2:
     push ax
     push bx
     push dx
     mov ah, 0
     mov bl, 10
     div bl                             ; AL=十位 AH=个位
     push ax
     mov dl, al
     add dl, '0'
     mov ah, 2
     int 21h
     pop ax
     mov dl, ah
     add dl, '0'
     mov ah, 2
     int 21h
     pop dx
     pop bx
     pop ax
     ret
code ends
end start

;=====================================================================
; 挑战清单 (由易到难):
;   1. 中央的时间也用显存写彩色 (提示: 参考 L10 的写显存循环,
;      这次得先把数字转成字符, 试试写个"写显存版的 print2")
;   2. 时间下面再加一行日期 (2Ah 功能: CX=年 DH=月 DL=日)
;   3. 加一个"计时器模式": 按空格开始/暂停, 右下角显示经过的秒数
;   4. 省电改造: 现在的"忙等"让 CPU 一秒空转几万圈, 试试每秒之间用
;      BIOS 等待服务 int 15h (AH=86h, CX:DX=微秒数) 让 CPU 睡 1 毫秒,
;      醒来再查键查时间 (提示: 睡太死按 ESC 会不灵敏, 所以睡一小口就行)
;   5. 终极: 支持调整时间 (改 2Dh 设置系统时间? 危险, 先查资料!)
;=====================================================================
