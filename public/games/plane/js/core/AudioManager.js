/**
 * 音频管理器 - 管理游戏音效和背景音乐
 * 采用单例模式，提供音频播放、音量控制等功能
 */
class AudioManager {
    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        
        // 音频资源
        this.sounds = new Map();
        this.music = new Map();
        
        // 音量设置
        this.masterVolume = 1.0;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.5;
        
        // 当前播放的音乐
        this.currentMusic = null;
        this.musicFadeInterval = null;
        
        // 音频上下文（用于高级音频处理）
        this.audioContext = null;
        this.gainNode = null;
        
        // 音频池，用于同时播放多个相同音效
        this.soundPools = new Map();
        this.maxPoolSize = 10;
        
                this.initialized = false;
        this.audioGenerator = null;
        this.generatedSounds = new Map();
        this.isMuted = false;

        // 添加音频初始化状态跟踪
        this.initializationProgress = 0;
        this.initializationStatus = '准备初始化...';
        this.initializationCallbacks = [];
        
        // 快速初始化音频系统
        setTimeout(() => {
            console.log('AudioManager快速初始化开始');
            this.initAudioContextWithProgress();
        }, 100); // 从500ms减少到100ms

        AudioManager.instance = this;
    }

    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!AudioManager.instance) {
            new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * 初始化音频上下文
     */
    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateMasterVolume();
            
            // 初始化音频生成器
            this.audioGenerator = new AudioGenerator(this.audioContext);
            this.generateAllSounds();
            
            this.initialized = true;
            console.log('音频上下文初始化成功');
        } catch (error) {
            console.warn('无法初始化Web Audio API，回退到传统音频:', error);
            this.initialized = false;
        }
    }

    /**
     * 带进度反馈的音频初始化（快速版本）
     */
    async initAudioContextWithProgress() {
        try {
            this.updateInitProgress(10, '正在启动音频系统...');
            await new Promise(resolve => setTimeout(resolve, 200)); // 从600ms减少到200ms
            
            this.updateInitProgress(30, '正在初始化音频上下文...');
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateMasterVolume();
            
            this.updateInitProgress(50, '音频上下文创建成功');
            await new Promise(resolve => setTimeout(resolve, 100)); // 从300ms减少到100ms
            
            this.updateInitProgress(65, '正在初始化音频生成器...');
            this.audioGenerator = new AudioGenerator(this.audioContext);
            
            this.updateInitProgress(80, '正在生成音效库...');
            await new Promise(resolve => setTimeout(resolve, 150)); // 从300ms减少到150ms
            
            // 快速生成音效，避免阻塞
            await this.generateAllSoundsWithProgress();
            
            this.updateInitProgress(100, '音频系统初始化完成！');
            this.initialized = true;
            
            console.log('音频上下文初始化成功');
            
            // 通知所有等待的回调
            this.initializationCallbacks.forEach(callback => callback(true));
            this.initializationCallbacks = [];
            
            // 快速切换到主菜单
            setTimeout(() => {
                console.log('音频初始化完成，发送切换主菜单事件');
                window.dispatchEvent(new CustomEvent('audioInitComplete'));
            }, 300); // 从1500ms减少到300ms
            
        } catch (error) {
            console.warn('无法初始化Web Audio API，回退到传统音频:', error);
            this.initialized = false;
            this.updateInitProgress(100, '音频初始化失败，游戏将静音运行');
            
            // 通知所有等待的回调（失败）
            this.initializationCallbacks.forEach(callback => callback(false));
            this.initializationCallbacks = [];
            
            // 即使失败也要快速通知游戏切换到主菜单
            setTimeout(() => {
                console.log('音频初始化失败，但仍发送切换主菜单事件');
                window.dispatchEvent(new CustomEvent('audioInitComplete'));
            }, 800); // 从3000ms减少到800ms
        }
    }

    /**
     * 更新初始化进度
     */
    updateInitProgress(progress, status) {
        this.initializationProgress = progress;
        this.initializationStatus = status;
        
        // 触发自定义事件，让UI可以监听进度变化
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('audioInitProgress', {
                detail: { progress, status }
            }));
        }
    }

    /**
     * 快速生成音效，避免阻塞UI
     */
    async generateAllSoundsWithProgress() {
        if (!this.audioGenerator) return;
        
        try {
            this.updateInitProgress(85, '正在生成基础音效...');
            await new Promise(resolve => setTimeout(resolve, 100)); // 从400ms减少到100ms
            
            // 快速生成所有音效缓冲区
            console.log('开始生成音效缓冲区...');
            this.generatedSounds = this.audioGenerator.generateAllSounds();
            console.log('音效缓冲区生成完成');
            
            this.updateInitProgress(92, '正在注册音效...');
            
            // 为每个音效创建播放函数
            for (const [name, buffer] of Object.entries(this.generatedSounds)) {
                this.sounds.set(name, buffer);
            }
            
            this.updateInitProgress(96, '正在生成背景音乐...');
            await new Promise(resolve => setTimeout(resolve, 100)); // 从400ms减少到100ms
            
            // 创建简单的背景音乐（使用较长的音调序列）
            this.generateBackgroundMusic();
            
            this.updateInitProgress(100, '🎮 游戏准备完成！');
            await new Promise(resolve => setTimeout(resolve, 100)); // 从300ms减少到100ms
            
            console.log('音频生成完成，共', this.sounds.size, '个音效');
            
        } catch (error) {
            console.warn('生成音频时出错:', error);
            this.updateInitProgress(95, '音效生成部分失败');
        }
    }

    /**
     * 监听音频初始化完成
     */
    onInitializationComplete(callback) {
        if (this.initialized) {
            callback(true);
        } else {
            this.initializationCallbacks.push(callback);
        }
    }

    /**
     * 获取音频初始化进度
     */
    getInitializationProgress() {
        return {
            progress: this.initializationProgress,
            status: this.initializationStatus,
            completed: this.initialized
        };
    }

    /**
     * 恢复音频上下文（用户交互后）
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('音频上下文已恢复');
            } catch (error) {
                console.warn('无法恢复音频上下文:', error);
            }
        }
    }

    /**
     * 生成所有音频
     */
    generateAllSounds() {
        if (!this.audioGenerator) return;
        
        try {
            // 生成所有音效缓冲区
            this.generatedSounds = this.audioGenerator.generateAllSounds();
            
            // 为每个音效创建播放函数
            for (const [name, buffer] of Object.entries(this.generatedSounds)) {
                this.sounds.set(name, buffer);
            }
            
            // 创建简单的背景音乐（使用较长的音调序列）
            this.generateBackgroundMusic();
            
            console.log('音频生成完成，共', this.sounds.size, '个音效');
        } catch (error) {
            console.warn('生成音频时出错:', error);
        }
    }
    
    /**
     * 生成背景音乐
     */
    generateBackgroundMusic() {
        // 创建至少1分钟的循环音乐缓冲区
        const musicTracks = {
            'menu_theme': this.createComplexMusic('menu', 75.0),     // 1分15秒
            'gameplay_theme': this.createComplexMusic('battle', 90.0), // 1分30秒
            'boss_theme': this.createComplexMusic('boss', 80.0),     // 1分20秒
            'victory_theme': this.createComplexMusic('victory', 60.0), // 1分钟
            'game_over_theme': this.createComplexMusic('sad', 70.0)  // 1分10秒
        };
        
        for (const [name, buffer] of Object.entries(musicTracks)) {
            this.music.set(name, {
                buffer: buffer,
                isPlaying: false,
                source: null,
                volume: this.musicVolume * this.masterVolume,
                loop: true
            });
        }
    }
    
    /**
     * 创建复杂的音乐缓冲区
     */
    createComplexMusic(style, duration) {
        const buffer = this.audioContext.createBuffer(2, duration * this.audioContext.sampleRate, this.audioContext.sampleRate);
        const leftData = buffer.getChannelData(0);
        const rightData = buffer.getChannelData(1);
        
        // 根据风格定义音乐参数
        const musicParams = this.getMusicParams(style);
        
        for (let i = 0; i < leftData.length; i++) {
            const time = i / this.audioContext.sampleRate;
            
            // 主旋律
            const melody = this.generateMelody(time, musicParams, duration);
            
            // 低音线
            const bass = this.generateBass(time, musicParams, duration);
            
            // 和声
            const harmony = this.generateHarmony(time, musicParams, duration);
            
            // 节拍
            const drums = this.generateDrums(time, musicParams);
            
            // 混合所有音轨
            const leftMix = melody * 0.4 + bass * 0.3 + harmony * 0.2 + drums * 0.1;
            const rightMix = melody * 0.4 + bass * 0.2 + harmony * 0.3 + drums * 0.1;
            
            leftData[i] = Math.max(-1, Math.min(1, leftMix * 0.3));
            rightData[i] = Math.max(-1, Math.min(1, rightMix * 0.3));
        }
        
        return buffer;
    }
    
    /**
     * 获取音乐风格参数
     */
    getMusicParams(style) {
        const params = {
            menu: {
                tempo: 120,
                scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // C大调
                bassRoot: 130.81,
                moodFactor: 1.0
            },
            battle: {
                tempo: 140,
                scale: [220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30], // A小调
                bassRoot: 110.00,
                moodFactor: 1.2
            },
            boss: {
                tempo: 160,
                scale: [207.65, 233.08, 261.63, 277.18, 311.13, 349.23, 392.00], // G#小调
                bassRoot: 103.83,
                moodFactor: 1.5
            },
            victory: {
                tempo: 130,
                scale: [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37], // D大调
                bassRoot: 146.83,
                moodFactor: 0.8
            },
            sad: {
                tempo: 80,
                scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], // A小调
                bassRoot: 110.00,
                moodFactor: 0.6
            }
        };
        
        return params[style] || params.menu;
    }
    
    /**
     * 生成主旋律
     */
    generateMelody(time, params, duration) {
        const beatDuration = 60 / params.tempo;
        const noteIndex = Math.floor(time / beatDuration) % params.scale.length;
        const noteTime = (time % beatDuration) / beatDuration;
        
        // 选择音符频率，添加一些变化
        const baseFreq = params.scale[noteIndex];
        const variation = Math.sin(time * 0.5) * 0.02; // 轻微的音调变化
        const frequency = baseFreq * (1 + variation);
        
        // 生成音符
        const tone = Math.sin(frequency * 2 * Math.PI * time);
        const envelope = Math.sin(noteTime * Math.PI) * Math.exp(-noteTime * 2);
        
        return tone * envelope * params.moodFactor;
    }
    
    /**
     * 生成低音线
     */
    generateBass(time, params, duration) {
        const beatDuration = (60 / params.tempo) * 2; // 低音节拍较慢
        const noteTime = (time % beatDuration) / beatDuration;
        
        // 基础低音频率
        const bassFreq = params.bassRoot * (1 + Math.sin(time * 0.1) * 0.1);
        
        const tone = Math.sin(bassFreq * 2 * Math.PI * time);
        const envelope = Math.sin(noteTime * Math.PI * 0.5) * 0.8;
        
        return tone * envelope;
    }
    
    /**
     * 生成和声
     */
    generateHarmony(time, params, duration) {
        const beatDuration = 60 / params.tempo;
        const chordIndex = Math.floor(time / (beatDuration * 4)) % 4; // 4拍一个和弦
        
        // 简单的和弦进行
        const chords = [
            [params.scale[0], params.scale[2], params.scale[4]], // I
            [params.scale[3], params.scale[5], params.scale[0]], // IV
            [params.scale[4], params.scale[6], params.scale[1]], // V
            [params.scale[2], params.scale[4], params.scale[6]]  // vi
        ];
        
        const currentChord = chords[chordIndex];
        let harmonySignal = 0;
        
        currentChord.forEach(freq => {
            harmonySignal += Math.sin(freq * 2 * Math.PI * time) * 0.3;
        });
        
        const noteTime = (time % (beatDuration * 4)) / (beatDuration * 4);
        const envelope = Math.sin(noteTime * Math.PI) * 0.6;
        
        return harmonySignal * envelope;
    }
    
    /**
     * 生成鼓点
     */
    generateDrums(time, params) {
        const beatDuration = 60 / params.tempo;
        const beatTime = time % beatDuration;
        
        // 简单的鼓点模式
        let drumSignal = 0;
        
        // 底鼓 (每拍)
        if (beatTime < 0.05) {
            const kickFreq = 60;
            drumSignal += Math.sin(kickFreq * 2 * Math.PI * time) * Math.exp(-beatTime * 20) * 0.8;
        }
        
        // 军鼓 (每隔一拍)
        const snareTime = (time % (beatDuration * 2)) - beatDuration;
        if (snareTime > 0 && snareTime < 0.03) {
            const noise = (Math.random() * 2 - 1) * 0.5;
            drumSignal += noise * Math.exp(-snareTime * 30) * 0.6;
        }
        
        return drumSignal;
    }



    /**
     * 播放音效
     */
    async playSound(name, volume = 1.0, playbackRate = 1.0) {
        // 如果音频未初始化，静默跳过（不报错，不阻塞游戏）
        if (this.isMuted || !this.initialized || !this.audioContext) return;
        
        try {
            await this.resumeAudioContext();
            
            const buffer = this.sounds.get(name);
            if (!buffer) {
                // 仅在debug模式下显示警告，避免控制台噪音
                if (window.game && window.game.config && window.game.config.debug) {
                    console.warn(`音效 ${name} 不存在`);
                }
                return;
            }
            
            // 使用音频生成器播放缓冲区
            if (this.audioGenerator) {
                this.audioGenerator.playBuffer(
                    buffer, 
                    volume * this.sfxVolume * this.masterVolume,
                    playbackRate
                );
            }
        } catch (error) {
            // 仅在debug模式下显示错误，避免控制台噪音
            if (window.game && window.game.config && window.game.config.debug) {
                console.warn(`播放音效 ${name} 失败:`, error);
            }
        }
    }

    /**
     * 播放背景音乐
     */
    async playMusic(name, fadeIn = true) {
        // 如果音频未初始化，静默跳过（不报错，不阻塞游戏）
        if (this.isMuted || !this.initialized || !this.audioContext) return;
        
        try {
            await this.resumeAudioContext();
            
            const musicData = this.music.get(name);
            if (!musicData) {
                console.warn(`背景音乐 ${name} 不存在`);
                return;
            }
            
            // 如果正在播放相同的音乐，不重复播放
            if (this.currentMusic === name && musicData.isPlaying) {
                console.log(`背景音乐 ${name} 已在播放，跳过`);
                return;
            }
            
            // 停止当前音乐
            if (this.currentMusic && this.currentMusic !== name) {
                await this.stopMusic(true);
            }
            
            // 创建音频源
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = musicData.buffer;
            source.loop = true;
            
            // 设置音量
            const targetVolume = this.musicVolume * this.masterVolume;
            gainNode.gain.value = fadeIn ? 0 : targetVolume;
            
            // 连接音频图
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 开始播放
            source.start();
            
            // 保存当前音乐信息
            this.currentMusic = name;
            musicData.source = source;
            musicData.gainNode = gainNode;
            musicData.isPlaying = true;
            
            // 淡入效果
            if (fadeIn) {
                this.fadeInMusicGain(gainNode, targetVolume);
            }
            
            console.log(`开始播放背景音乐: ${name}`);
        } catch (error) {
            console.warn(`播放背景音乐 ${name} 失败:`, error);
        }
    }

    /**
     * 停止背景音乐
     */
    async stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;
        
        const musicData = this.music.get(this.currentMusic);
        if (musicData && musicData.source && musicData.isPlaying) {
            try {
                if (fadeOut && musicData.gainNode) {
                    await this.fadeOutMusicGain(musicData.gainNode, musicData.source);
                } else {
                    musicData.source.stop();
                }
            } catch (error) {
                console.warn('停止音乐时出错:', error);
            }
            
            musicData.isPlaying = false;
            musicData.source = null;
            musicData.gainNode = null;
        }
        
        console.log(`停止背景音乐: ${this.currentMusic}`);
        this.currentMusic = null;
    }

    /**
     * 暂停音乐播放
     */
    pauseMusic() {
        if (!this.currentMusic) return;
        
        const musicData = this.music.get(this.currentMusic);
        if (musicData && musicData.source && musicData.isPlaying) {
            musicData.source.stop();
            musicData.isPlaying = false;
            musicData.source = null;
            musicData.gainNode = null;
        }
        
        console.log('音乐已暂停');
    }

        /**
     * 淡入音乐增益
     */
    fadeInMusicGain(gainNode, targetVolume, duration = 1000) {
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            const newVolume = Math.min(targetVolume, volumeStep * currentStep);
            gainNode.gain.setValueAtTime(newVolume, this.audioContext.currentTime);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
            }
        }, stepTime);
    }
    
    /**
     * 淡出音乐增益
     */
    fadeOutMusicGain(gainNode, source, duration = 1000) {
        return new Promise((resolve) => {
            const initialVolume = gainNode.gain.value;
            const steps = 50;
            const stepTime = duration / steps;
            const volumeStep = initialVolume / steps;
            
            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = Math.max(0, initialVolume - volumeStep * currentStep);
                gainNode.gain.setValueAtTime(newVolume, this.audioContext.currentTime);
                
                if (currentStep >= steps || newVolume <= 0) {
                    clearInterval(fadeInterval);
                    source.stop();
                    resolve();
                }
            }, stepTime);
        });
    }

    /**
     * 设置主音量
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.updateMasterVolume();
    }

    /**
     * 设置音效音量
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * 设置音乐音量
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * 更新Web Audio API主音量
     */
    updateMasterVolume() {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(
                this.isMuted ? 0 : this.masterVolume,
                this.audioContext.currentTime
            );
        }
    }

    /**
     * 更新所有音频的音量
     */
    updateAllVolumes() {
        // 更新当前播放的音乐音量
        if (this.currentMusic) {
            const musicData = this.music.get(this.currentMusic);
            if (musicData && musicData.gainNode) {
                const targetVolume = this.musicVolume * this.masterVolume;
                musicData.gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
            }
        }
        
        // 音效音量在播放时会自动应用新的音量设置
        console.log('音量设置已更新');
    }

    /**
     * 静音/取消静音
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateMasterVolume();
        
        // 更新当前音乐的音量
        if (this.currentMusic) {
            const musicData = this.music.get(this.currentMusic);
            if (musicData && musicData.gainNode) {
                const targetVolume = this.isMuted ? 0 : this.musicVolume * this.masterVolume;
                musicData.gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
            }
        }
        
        console.log(`音频${this.isMuted ? '已静音' : '已取消静音'}`);
        return this.isMuted;
    }

    /**
     * 获取音量设置
     */
    getVolumeSettings() {
        return {
            master: this.masterVolume,
            sfx: this.sfxVolume,
            music: this.musicVolume,
            isMuted: this.isMuted
        };
    }

    /**
     * 停止所有音效
     */
    stopAllSounds() {
        // 由于使用Web Audio API的音频缓冲区，音效会自动停止
        // 这里主要是为了保持接口一致性
        console.log('停止所有音效');
    }

    /**
     * 销毁音频管理器
     */
    destroy() {
        this.stopAllSounds();
        this.stopMusic(false);
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.sounds.clear();
        this.music.clear();
        this.generatedSounds.clear();
        this.currentMusic = null;
        this.audioGenerator = null;
        
        console.log('音频管理器已销毁');
    }

    /**
     * 预热音频系统（在用户首次交互时调用）
     */
    async warmUp() {
        try {
            await this.resumeAudioContext();
            
            // 播放一个极短的静默音频来激活音频系统
            if (this.audioContext) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.01);
            }
            
            console.log('音频系统预热完成');
        } catch (error) {
            console.warn('音频系统预热失败:', error);
        }
    }
}

// 导出AudioManager类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
} else {
    window.AudioManager = AudioManager;
} 