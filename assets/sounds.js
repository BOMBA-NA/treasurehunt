// Sound Manager for Web Audio
class SoundManager {
    constructor() {
        this.sounds = {
            click: 'https://cdn.freesound.org/previews/316/316506_4939433-lq.mp3',
            treasure: 'https://cdn.freesound.org/previews/341/341695_5123451-lq.mp3',
            bomb: 'https://cdn.freesound.org/previews/352/352455_3932281-lq.mp3',
            win: 'https://cdn.freesound.org/previews/270/270402_5123451-lq.mp3',
            lose: 'https://cdn.freesound.org/previews/131/131657_2398403-lq.mp3',
            coin: 'https://cdn.freesound.org/previews/316/316847_5123451-lq.mp3',
            button: 'https://cdn.freesound.org/previews/323/323757_5123451-lq.mp3'
        };
        
        this.audioContext = null;
        this.audioBuffers = {};
        this.isEnabled = true;
        this.volume = 0.5;
        
        this.initializeAudio();
    }

    async initializeAudio() {
        try {
            // Create AudioContext on first user interaction
            document.addEventListener('click', this.createAudioContext.bind(this), { once: true });
            document.addEventListener('touchstart', this.createAudioContext.bind(this), { once: true });
        } catch (error) {
            console.warn('Audio initialization failed:', error);
            this.fallbackToHTMLAudio();
        }
    }

    createAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    fallbackToHTMLAudio() {
        // Fallback to HTML5 Audio if Web Audio API fails
        this.useHTMLAudio = true;
        this.audioElements = {};
        
        Object.keys(this.sounds).forEach(key => {
            this.audioElements[key] = new Audio();
            this.audioElements[key].preload = 'auto';
            this.audioElements[key].volume = this.volume;
        });
    }

    async loadSound(key, url) {
        if (this.useHTMLAudio) {
            return new Promise((resolve) => {
                if (this.audioElements[key]) {
                    this.audioElements[key].src = url;
                    this.audioElements[key].addEventListener('canplaythrough', resolve, { once: true });
                    this.audioElements[key].addEventListener('error', () => {
                        console.warn(`Failed to load sound: ${key}`);
                        resolve();
                    }, { once: true });
                } else {
                    resolve();
                }
            });
        }

        if (!this.audioContext) {
            this.createAudioContext();
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers[key] = audioBuffer;
        } catch (error) {
            console.warn(`Failed to load sound: ${key}`, error);
            // Create a silent buffer as fallback
            this.createSilentBuffer(key);
        }
    }

    createSilentBuffer(key) {
        if (!this.audioContext) return;
        
        const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
        this.audioBuffers[key] = buffer;
    }

    play(soundKey, options = {}) {
        if (!this.isEnabled) return;

        const { volume = this.volume, loop = false, rate = 1 } = options;

        if (this.useHTMLAudio) {
            this.playHTMLAudio(soundKey, volume, loop, rate);
            return;
        }

        if (!this.audioContext || !this.audioBuffers[soundKey]) {
            // Try to create a simple beep sound
            this.createBeepSound(soundKey);
            return;
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.audioBuffers[soundKey];
            source.loop = loop;
            source.playbackRate.value = rate;
            
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
        } catch (error) {
            console.warn(`Failed to play sound: ${soundKey}`, error);
        }
    }

    playHTMLAudio(soundKey, volume, loop, rate) {
        if (!this.audioElements[soundKey]) return;
        
        try {
            const audio = this.audioElements[soundKey].cloneNode();
            audio.volume = volume;
            audio.loop = loop;
            audio.playbackRate = rate;
            
            audio.play().catch(error => {
                console.warn(`Failed to play HTML audio: ${soundKey}`, error);
            });
        } catch (error) {
            console.warn(`Failed to play HTML audio: ${soundKey}`, error);
        }
    }

    createBeepSound(soundKey) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Different frequencies for different sound types
            const frequencies = {
                click: 800,
                treasure: 1200,
                bomb: 200,
                win: 1000,
                lose: 300,
                coin: 1500,
                button: 600
            };
            
            oscillator.frequency.value = frequencies[soundKey] || 440;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Failed to create beep sound:', error);
        }
    }

    // Specific sound methods
    playClick() {
        this.play('click', { volume: 0.3 });
    }

    playTreasure() {
        this.play('treasure', { volume: 0.6 });
    }

    playBomb() {
        this.play('bomb', { volume: 0.8 });
    }

    playWin() {
        this.play('win', { volume: 0.7 });
    }

    playLose() {
        this.play('lose', { volume: 0.5 });
    }

    playCoin() {
        this.play('coin', { volume: 0.4 });
    }

    playButton() {
        this.play('button', { volume: 0.2 });
    }

    // Settings
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.useHTMLAudio) {
            Object.values(this.audioElements).forEach(audio => {
                audio.volume = this.volume;
            });
        }
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }

    mute() {
        this.isEnabled = false;
    }

    unmute() {
        this.isEnabled = true;
    }

    // Preload all sounds
    async preloadAll() {
        const loadPromises = Object.entries(this.sounds).map(([key, url]) => 
            this.loadSound(key, url)
        );
        
        try {
            await Promise.all(loadPromises);
            console.log('All sounds preloaded successfully');
        } catch (error) {
            console.warn('Some sounds failed to preload:', error);
        }
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();

// Preload sounds when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Delay preloading to avoid blocking the UI
    setTimeout(() => {
        window.soundManager.preloadAll();
    }, 1000);
});

