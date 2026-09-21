class AudioGenerator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;
    }
    
    /**
     * 生成射击音效
     */
    generateShootSound(duration = 0.1, frequency = 800) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 高频脉冲音效
            const noise = (Math.random() * 2 - 1) * 0.3;
            const tone = Math.sin(frequency * 2 * Math.PI * time) * 0.7;
            const envelope = Math.exp(-time * 15); // 快速衰减
            data[i] = (tone + noise) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成散射武器音效
     */
    generateSpreadShootSound(duration = 0.15) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 多频率混合，模拟多发子弹同时发射
            let signal = 0;
            for (let j = 0; j < 5; j++) {
                const freq = 600 + j * 200;
                signal += Math.sin(freq * 2 * Math.PI * time) * 0.2;
            }
            const noise = (Math.random() * 2 - 1) * 0.4;
            const envelope = Math.exp(-time * 12);
            data[i] = (signal + noise) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成激光武器音效
     */
    generateLaserShootSound(duration = 0.3) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 高频持续音，模拟激光充能
            const freq = 1200 + Math.sin(time * 50) * 200;
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const envelope = Math.sin((time / duration) * Math.PI) * Math.exp(-time * 3);
            data[i] = tone * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成导弹发射音效
     */
    generateMissileShootSound(duration = 0.4) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 低频轰鸣声
            const lowFreq = 80 + time * 50;
            const midFreq = 400;
            const lowTone = Math.sin(lowFreq * 2 * Math.PI * time) * 0.6;
            const midTone = Math.sin(midFreq * 2 * Math.PI * time) * 0.4;
            const noise = (Math.random() * 2 - 1) * 0.3;
            const envelope = Math.exp(-time * 2);
            data[i] = (lowTone + midTone + noise) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成等离子武器音效
     */
    generatePlasmaShootSound(duration = 0.25) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 电子音效，模拟等离子充电
            const freq1 = 900 + Math.sin(time * 80) * 300;
            const freq2 = 1800 + Math.sin(time * 120) * 200;
            const tone1 = Math.sin(freq1 * 2 * Math.PI * time) * 0.4;
            const tone2 = Math.sin(freq2 * 2 * Math.PI * time) * 0.3;
            const crackle = (Math.random() * 2 - 1) * 0.2 * Math.sin(time * 200);
            const envelope = Math.exp(-time * 8);
            data[i] = (tone1 + tone2 + crackle) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成穿甲武器音效
     */
    generatePiercingShootSound(duration = 0.12) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 尖锐的高频音，模拟穿甲弹
            const freq = 1500 + time * 500;
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const harmonics = Math.sin(freq * 3 * 2 * Math.PI * time) * 0.3;
            const envelope = Math.exp(-time * 20);
            data[i] = (tone + harmonics) * envelope * 0.7;
        }
        
        return buffer;
    }
    
    /**
     * 生成能量束武器音效
     */
    generateEnergyBeamShootSound(duration = 0.35) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 能量充盈的低沉声音
            const freq = 200 + Math.sin(time * 30) * 100;
            const harmonic1 = Math.sin(freq * 2 * Math.PI * time) * 0.5;
            const harmonic2 = Math.sin(freq * 4 * 2 * Math.PI * time) * 0.3;
            const harmonic3 = Math.sin(freq * 8 * 2 * Math.PI * time) * 0.2;
            const envelope = Math.sin((time / duration) * Math.PI * 2) * Math.exp(-time * 2);
            data[i] = (harmonic1 + harmonic2 + harmonic3) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成爆炸音效
     */
    generateExplosionSound(duration = 0.5, intensity = 1.0) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 低频噪音模拟爆炸
            const noise = (Math.random() * 2 - 1) * intensity;
            const lowFreq = Math.sin(60 * 2 * Math.PI * time) * 0.5;
            const envelope = Math.exp(-time * 3) * (1 - time / duration);
            data[i] = (noise + lowFreq) * envelope * 0.8;
        }
        
        return buffer;
    }
    
    /**
     * 生成收集道具音效
     */
    generatePowerUpSound(duration = 0.3) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 上升音调
            const frequency = 400 + (time / duration) * 600;
            const tone = Math.sin(frequency * 2 * Math.PI * time);
            const envelope = Math.sin((time / duration) * Math.PI); // 钟形包络
            data[i] = tone * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成命中音效
     */
    generateHitSound(duration = 0.15, frequency = 300) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 混合音调和噪音
            const tone = Math.sin(frequency * 2 * Math.PI * time) * 0.5;
            const noise = (Math.random() * 2 - 1) * 0.3;
            const envelope = Math.exp(-time * 10);
            data[i] = (tone + noise) * envelope;
        }
        
        return buffer;
    }
    
    /**
     * 生成连击音效
     */
    generateComboSound(comboLevel = 1, duration = 0.2) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        const baseFreq = 600 + comboLevel * 100;
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 多音调和声
            let signal = 0;
            for (let harmonic = 1; harmonic <= 3; harmonic++) {
                signal += Math.sin(baseFreq * harmonic * 2 * Math.PI * time) / harmonic;
            }
            const envelope = Math.exp(-time * 8) * Math.sin((time / duration) * Math.PI);
            data[i] = signal * envelope * 0.4;
        }
        
        return buffer;
    }
    
    /**
     * 生成成就解锁音效
     */
    generateAchievementSound(duration = 0.8) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 胜利号角效果
            const freq1 = 440 * Math.pow(2, Math.floor(time * 4) / 12); // 上升音阶
            const freq2 = freq1 * 1.5; // 五度和声
            const tone1 = Math.sin(freq1 * 2 * Math.PI * time);
            const tone2 = Math.sin(freq2 * 2 * Math.PI * time) * 0.5;
            const envelope = Math.sin((time / duration) * Math.PI) * (1 - time / duration * 0.5);
            data[i] = (tone1 + tone2) * envelope * 0.5;
        }
        
        return buffer;
    }
    
    /**
     * 生成菜单点击音效
     */
    generateClickSound(duration = 0.1, frequency = 1000) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const tone = Math.sin(frequency * 2 * Math.PI * time);
            const envelope = Math.exp(-time * 20);
            data[i] = tone * envelope * 0.3;
        }
        
        return buffer;
    }
    
    /**
     * 生成游戏结束音效
     */
    generateGameOverSound(duration = 1.5) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 下降音调表示失败
            const frequency = 440 * Math.pow(2, -(time / duration) * 2);
            const tone = Math.sin(frequency * 2 * Math.PI * time);
            const envelope = Math.exp(-time * 2) * Math.sin((time / duration) * Math.PI);
            data[i] = tone * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成Boss攻击音效
     */
    generateBossAttackSound(duration = 0.3) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 深沉的低频攻击音
            const freq1 = 80 + Math.sin(time * 20) * 40;
            const freq2 = 160 + Math.sin(time * 30) * 20;
            const tone1 = Math.sin(freq1 * 2 * Math.PI * time);
            const tone2 = Math.sin(freq2 * 2 * Math.PI * time) * 0.6;
            const noise = (Math.random() * 2 - 1) * 0.3;
            const envelope = Math.exp(-time * 3) * Math.sin((time / duration) * Math.PI);
            data[i] = (tone1 + tone2 + noise) * envelope * 0.7;
        }
        
        return buffer;
    }
    
    /**
     * 生成Boss特殊攻击音效
     */
    generateBossSpecialAttackSound(duration = 0.5) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 复杂的特殊攻击音效
            const freq1 = 50 + (time / duration) * 200;
            const freq2 = 100 + Math.sin(time * 15) * 50;
            const freq3 = 300 + Math.cos(time * 10) * 100;
            
            const tone1 = Math.sin(freq1 * 2 * Math.PI * time);
            const tone2 = Math.sin(freq2 * 2 * Math.PI * time) * 0.7;
            const tone3 = Math.sin(freq3 * 2 * Math.PI * time) * 0.4;
            const noise = (Math.random() * 2 - 1) * 0.4;
            
            const envelope = Math.sin((time / duration) * Math.PI) * (1 - time / duration * 0.3);
            data[i] = (tone1 + tone2 + tone3 + noise) * envelope * 0.8;
        }
        
        return buffer;
    }
    
    /**
     * 生成Boss阶段转换音效
     */
    generateBossPhaseChangeSound(duration = 0.6) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            // 戏剧性的阶段转换音效
            const progress = time / duration;
            const freq1 = 200 * Math.pow(2, progress * 2); // 上升音调
            const freq2 = 100 + Math.sin(time * 25) * 50;
            
            let signal = 0;
            // 添加多个谐波
            for (let harmonic = 1; harmonic <= 4; harmonic++) {
                signal += Math.sin(freq1 * harmonic * 2 * Math.PI * time) / harmonic;
            }
            signal += Math.sin(freq2 * 2 * Math.PI * time) * 0.5;
            
            const envelope = Math.sin(progress * Math.PI) * (1 + Math.sin(time * 40) * 0.3);
            data[i] = signal * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成Boss死亡音效
     */
    generateBossDeathSound(duration = 1.2) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 多层爆炸音效
            const explosion1 = this.generateExplosionAt(time, 0.1, 0.8);
            const explosion2 = this.generateExplosionAt(time - 0.3, 0.15, 0.6);
            const explosion3 = this.generateExplosionAt(time - 0.6, 0.2, 0.4);
            
            // 下降音调表示死亡
            const deathTone = Math.sin(200 * Math.pow(0.1, progress) * 2 * Math.PI * time);
            const envelope = Math.exp(-progress * 2);
            
            data[i] = (explosion1 + explosion2 + explosion3 + deathTone * envelope) * 0.7;
        }
        
        return buffer;
    }
    
    /**
     * 生成胜利音效
     */
    generateVictorySound(duration = 1.0) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 胜利主题音调
            const melody = [440, 523, 659, 784]; // A, C, E, G
            const noteIndex = Math.floor(progress * melody.length);
            const freq = melody[Math.min(noteIndex, melody.length - 1)];
            
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const harmony = Math.sin(freq * 1.5 * 2 * Math.PI * time) * 0.5;
            const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.3);
            
            data[i] = (tone + harmony) * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 辅助方法：在特定时间生成爆炸音效
     */
    generateExplosionAt(time, delay, intensity) {
        if (time < delay || time > delay + 0.3) return 0;
        
        const localTime = time - delay;
        const noise = (Math.random() * 2 - 1);
        const lowFreq = Math.sin(60 * 2 * Math.PI * localTime);
        const envelope = Math.exp(-localTime * 8);
        
        return (noise * 0.7 + lowFreq * 0.3) * envelope * intensity;
    }
    
    /**
     * 生成治疗音效
     */
    generateHealSound(duration = 0.4) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 上升的治疗音调
            const freq = 400 + progress * 200;
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const harmony = Math.sin(freq * 1.5 * 2 * Math.PI * time) * 0.5;
            const sparkle = Math.sin(freq * 3 * 2 * Math.PI * time + Math.sin(time * 20)) * 0.3;
            
            const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.2);
            data[i] = (tone + harmony + sparkle) * envelope * 0.5;
        }
        
        return buffer;
    }
    
    /**
     * 生成护盾音效
     */
    generateShieldSound(duration = 0.4) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 坚固的护盾音效
            const freq = 300 - progress * 50;
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const harmonic1 = Math.sin(freq * 2 * 2 * Math.PI * time) * 0.3;
            const harmonic2 = Math.sin(freq * 4 * 2 * Math.PI * time) * 0.2;
            
            const envelope = Math.exp(-progress * 2) * (1 + Math.sin(time * 15) * 0.2);
            data[i] = (tone + harmonic1 + harmonic2) * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成炸弹拾取音效
     */
    generateBombPickupSound(duration = 0.3) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 危险的炸弹音效
            const freq = 100 + Math.sin(time * 20) * 50;
            const tone = Math.sin(freq * 2 * Math.PI * time);
            const click = Math.sin(800 * 2 * Math.PI * time) * Math.exp(-time * 10);
            const rumble = (Math.random() * 2 - 1) * 0.3;
            
            const envelope = Math.sin(progress * Math.PI);
            data[i] = (tone * 0.6 + click * 0.3 + rumble * 0.4) * envelope * 0.5;
        }
        
        return buffer;
    }
    
    /**
     * 生成分数奖励音效
     */
    generateScoreBonusSound(duration = 0.35) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 欢快的金币音效
            const freq = 500 + progress * 300;
            const tone1 = Math.sin(freq * 2 * Math.PI * time);
            const tone2 = Math.sin(freq * 1.5 * 2 * Math.PI * time) * 0.6;
            const chime = Math.sin(freq * 3 * 2 * Math.PI * time) * 0.4;
            
            const envelope = Math.sin(progress * Math.PI) * Math.exp(-progress);
            data[i] = (tone1 + tone2 + chime) * envelope * 0.6;
        }
        
        return buffer;
    }
    
    /**
     * 生成僚机音效
     */
    generateWingmanSound(duration = 0.5) {
        const buffer = this.audioContext.createBuffer(1, duration * this.sampleRate, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / this.sampleRate;
            const progress = time / duration;
            
            // 机械启动音效
            const freq = 200 + progress * 100;
            const engine = Math.sin(freq * 2 * Math.PI * time);
            const mechanical = Math.sin(freq * 4 * 2 * Math.PI * time) * 0.4;
            const boost = Math.sin(freq * 0.5 * 2 * Math.PI * time) * 0.3;
            
            const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.3);
            data[i] = (engine + mechanical + boost) * envelope * 0.7;
        }
        
        return buffer;
    }

    /**
     * 播放生成的音频缓冲区
     */
    playBuffer(buffer, volume = 1.0, playbackRate = 1.0) {
        if (!this.audioContext) return;
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start();
        
        return source;
    }
    
    /**
     * 创建所有音效缓冲区
     */
    generateAllSounds() {
        const sounds = {};
        
        try {
            // 基础射击音效
            sounds.player_shoot = this.generateShootSound(0.1, 800);
            
            // 各种武器射击音效
            sounds.spread_shoot = this.generateSpreadShootSound(0.15);
            sounds.laser_shoot = this.generateLaserShootSound(0.3);
            sounds.missile_shoot = this.generateMissileShootSound(0.4);
            sounds.plasma_shoot = this.generatePlasmaShootSound(0.25);
            sounds.piercing_shoot = this.generatePiercingShootSound(0.12);
            sounds.energy_beam_shoot = this.generateEnergyBeamShootSound(0.35);
            
            // 其他音效
            sounds.enemy_hit = this.generateHitSound(0.15, 300);
            sounds.enemy_destroyed = this.generateExplosionSound(0.4, 0.8);
            sounds.player_hit = this.generateHitSound(0.2, 200);
            sounds.player_death = this.generateGameOverSound(1.0);
            sounds.powerup_collect = this.generatePowerUpSound(0.3);
            sounds.weapon_upgrade = this.generatePowerUpSound(0.4);
            sounds.achievement_unlock = this.generateAchievementSound(0.8);
            sounds.combo_increase = this.generateComboSound(1, 0.2);
            sounds.combo_break = this.generateHitSound(0.3, 150);
            sounds.game_start = this.generatePowerUpSound(0.6);
            sounds.game_over = this.generateGameOverSound(1.5);
            sounds.menu_click = this.generateClickSound(0.1, 1000);
            sounds.menu_hover = this.generateClickSound(0.05, 1200);
            sounds.level_up = this.generateAchievementSound(0.6);
            sounds.boss_warning = this.generateHitSound(0.5, 100);
            sounds.boss_appear = this.generateExplosionSound(0.8, 1.2);
            sounds.boss_attack = this.generateBossAttackSound(0.3);
            sounds.boss_special_attack = this.generateBossSpecialAttackSound(0.5);
            sounds.boss_hit = this.generateHitSound(0.2, 150);
            sounds.boss_phase_change = this.generateBossPhaseChangeSound(0.6);
            sounds.boss_death = this.generateBossDeathSound(1.2);
            sounds.victory = this.generateVictorySound(1.0);
            sounds.explosion_small = this.generateExplosionSound(0.3, 0.6);
            sounds.explosion_large = this.generateExplosionSound(0.6, 1.0);
            sounds.shield_up = this.generatePowerUpSound(0.4);
            sounds.shield_down = this.generateHitSound(0.4, 250);
            
            // 道具收集音效
            sounds.powerup = this.generatePowerUpSound(0.3); // 默认道具音效
            sounds.health_restore = this.generateHealSound(0.4);
            sounds.shield_boost = this.generateShieldSound(0.4);
            sounds.bomb_pickup = this.generateBombPickupSound(0.3);
            sounds.score_bonus = this.generateScoreBonusSound(0.35);
            sounds.wingman_spawn = this.generateWingmanSound(0.5);
            
            console.log('所有音效生成完成');
        } catch (error) {
            console.warn('音效生成过程中出现错误:', error);
        }
        
        return sounds;
    }
}

// 导出AudioGenerator类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioGenerator;
} else {
    window.AudioGenerator = AudioGenerator;
} 