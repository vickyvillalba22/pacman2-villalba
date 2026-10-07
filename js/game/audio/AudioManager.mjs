import { Howl, Howler } from 'howler';


export default class AudioManager {

    #soundMap = new Map();
    #currentMusic = null;
    #isMuted = false;


    constructor() {
        this.#registerSounds();
    }


    unlock() {
        const audioContext = Howler.ctx;

        if (!audioContext || audioContext.state === 'running') {
            return Promise.resolve();
        }

        return audioContext.resume();
    }


    playSound(name) {
        const sound = this.#getSound(name);
        return sound.play();
    }


    playMusic(name) {
        const music = this.#getSound(name);

        if (this.#currentMusic && this.#currentMusic !== music) {
            this.#currentMusic.stop();
        }

        this.#currentMusic = music;
        music.loop(true);

        if (!music.playing()) {
            music.play();
        }
    }


    stopMusic() {
        if (this.#currentMusic) {
            this.#currentMusic.stop();
            this.#currentMusic = null;
        }
    }


    setMuted(value) {
        if (typeof value !== 'boolean') {
            throw new TypeError('Muted value must be a boolean');
        }

        this.#isMuted = value;
        Howler.mute(value);
    }


    toggleMute() {
        this.setMuted(!this.#isMuted);
        return this.#isMuted;
    }


    setMasterVolume(value) {
        if (typeof value !== 'number' || value < 0 || value > 1) {
            throw new RangeError('Master volume must be a number between 0 and 1');
        }

        Howler.volume(value);
    }


    #registerSounds() {
        this.#registerSound('start', './assets/audio/sfx/start.wav', 0.8);
        this.#registerSound('powerUp', './assets/audio/sfx/power-up.wav', 0.7);
        this.#registerSound('ghostEaten', './assets/audio/sfx/ghost-eaten.wav', 0.8);
        this.#registerSound('death', './assets/audio/sfx/death.wav', 0.9);
        this.#registerSound('teleport', './assets/audio/sfx/teleport.wav', 0.7);
        this.#registerSound('levelMusic', './assets/audio/music/music1.wav', 0.25, true);
    }


    #registerSound(name, source, volume, loop = false) {
        const sound = new Howl({
            src: [source],
            volume,
            loop,
            preload: true
        });

        this.#soundMap.set(name, sound);
    }


    #getSound(name) {
        const sound = this.#soundMap.get(name);

        if (!sound) {
            throw new Error(`Unknown audio name: ${name}`);
        }

        return sound;
    }


}
