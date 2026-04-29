
export class MarioAudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private timeouts: number[] = [];

  private readonly BEAT = 0.16;

  private readonly MELODY = [
    [659,1],[659,1],[0,1],[659,1],[0,1],[523,1],[659,1],[0,1],
    [784,1],[0,3],[392,1],[0,3],
    [523,1.5],[0,2],[392,1.5],[0,2],[330,1.5],[0,2],
    [440,1],[0,1],[494,1],[0,1],[466,1],[0,0.5],[440,1],[0,1],
    [392,1],[659,1],[784,1],[880,1],[698,1],[784,1],
    [0,0.5],[659,1],[0,0.5],[523,1],[0,0.5],[587,1],[494,1],[0,1],
    [523,1.5],[0,2],[392,1.5],[0,2],[330,1.5],[0,3.5],
    [494,1],[0,1],[784,1],[0,1],[740,1],[0,0.5],[698,1],[0,0.5],
    [659,2],[0,0.5],[523,1],[0,0.5],[587,1],[494,1.5],[0,1],
    [523,1],[392,1],[330,1],[440,1],[0,0.5],
    [330,1],[0,1],[262,1],[0,3],
  ];

  private readonly BASS = [
    [130,2],[0,2],[130,2],[0,2],
    [196,2],[0,2],[196,2],[0,2],
    [175,2],[0,2],[165,2],[0,2],
    [147,2],[0,2],[147,2],[0,2],
    [130,2],[0,2],[130,2],[0,2],
  ];

  private createReverb(ctx: AudioContext) {
    const length = ctx.sampleRate * 2;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  start() {
    if (this.isPlaying) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.isPlaying = true;

    // Master Graph
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.ctx.destination);

    const convolver = this.createReverb(this.ctx);
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.15;
    convolver.connect(reverbGain);
    reverbGain.connect(this.compressor);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    this.masterGain.connect(this.compressor);
    this.masterGain.connect(convolver);

    this.scheduleMelody(this.ctx.currentTime);
    this.scheduleBass(this.ctx.currentTime);
    this.scheduleSparkles();
    this.scheduleKicks(this.ctx.currentTime, 0);
  }

  private scheduleMelody(startTime: number) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    let time = startTime;
    this.MELODY.forEach(([freq, dur]) => {
      const actualDur = dur * this.BEAT + (Math.random() * 0.01 - 0.005);
      if (freq > 0) {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(this.masterGain!);
        
        g.gain.setValueAtTime(0.28, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + actualDur * 0.85);
        
        osc.start(time);
        osc.stop(time + actualDur);
      }
      time += actualDur;
    });

    const totalDur = this.MELODY.reduce((acc, curr) => acc + curr[1], 0) * this.BEAT;
    const timeout = window.setTimeout(() => this.scheduleMelody(time), (totalDur * 1000) - 50);
    this.timeouts.push(timeout);
  }

  private scheduleBass(startTime: number) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    let time = startTime;
    this.BASS.forEach(([freq, dur]) => {
      const actualDur = dur * this.BEAT;
      if (freq > 0) {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(this.masterGain!);
        
        g.gain.setValueAtTime(0.12, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + actualDur);
        
        osc.start(time);
        osc.stop(time + actualDur);
      }
      time += actualDur;
    });

    const totalDur = this.BASS.reduce((acc, curr) => acc + curr[1], 0) * this.BEAT;
    const timeout = window.setTimeout(() => this.scheduleBass(time), (totalDur * 1000) - 50);
    this.timeouts.push(timeout);
  }

  private playAmbientSparkle() {
    if (!this.ctx || !this.masterGain) return;
    const sparkleNotes = [1047, 1175, 1319, 1568, 1760];
    const freq = sparkleNotes[Math.floor(Math.random() * sparkleNotes.length)];
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.06, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  private scheduleSparkles() {
    if (!this.isPlaying) return;
    this.playAmbientSparkle();
    const next = 1500 + Math.random() * 2000;
    const timeout = window.setTimeout(() => this.scheduleSparkles(), next);
    this.timeouts.push(timeout);
  }

  private playKick(when: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(0.001, when + 0.3);
    g.gain.setValueAtTime(0.2, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    osc.start(when);
    osc.stop(when + 0.3);
  }

  private scheduleKicks(startTime: number, count: number) {
    if (!this.isPlaying) return;
    this.playKick(startTime + count * 0.64);
    if (count < 1000) { // Safety limit, though it's recursive
      const timeout = window.setTimeout(() => this.scheduleKicks(startTime, count + 1), 640);
      this.timeouts.push(timeout);
    }
  }

  setVolume(val: number) {
    this.volume = val / 100;
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx!.currentTime, 0.1);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx!.currentTime, 0.1);
    }
  }

  stop() {
    this.isPlaying = false;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioService = new MarioAudioService();
