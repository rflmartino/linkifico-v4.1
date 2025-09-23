// node-nlp sentiment manager - Redis persisted, no filesystem
// @ts-ignore
const { NlpManager } = require('node-nlp');
import { createClient } from 'redis';
import { getSecret } from 'wix-secrets-backend';
import { sentimentTraining, SENTIMENT_LABELS, sentimentToGuidance } from './nlpTrainingData.js';
import { Logger } from '../logger.js';

class SentimentNLP {
    constructor() {
        this.redis = null;
        this.manager = null;
        this.modelKey = 'linkifico:nlp:sentiment:model';
        this.versionKey = 'linkifico:nlp:sentiment:version';
        this.currentVersion = 's1.0.0';
        this.trained = false;
        this.initialized = false;
    }

    async initRedis() {
        if (!this.redis) {
            const url = await getSecret('REDIS_CONNECTION_URL');
            this.redis = createClient({ url });
            await this.redis.connect();
            Logger.info('nlpManager', 'initRedis', 'connected');
        }
    }

    createManager() {
        this.manager = new NlpManager({
            languages: ['en'],
            forceNER: false,
            autoSave: false,
            autoLoad: false,
            modelFileName: false,
            nlu: { useNoneFeature: true, log: false },
            ner: { useDuckling: false, useBuiltins: false }
        });
    }

    async initialize() {
        if (this.initialized) return;
        await this.initRedis();
        this.createManager();
        const ok = await this.loadModel();
        if (!ok) {
            await this.train();
            await this.saveModel();
        }
        this.initialized = true;
        Logger.info('nlpManager', 'initialize', { trained: this.trained });
    }

    addTraining() {
        // Map compact dataset to intents (labels)
        for (const [key, samples] of Object.entries(sentimentTraining)) {
            const label = `sentiment.${key}`;
            samples.forEach(s => this.manager.addDocument('en', s, label));
        }
        // Minimal answers (not used, but required by nlp sometimes)
        SENTIMENT_LABELS.forEach(l => this.manager.addAnswer('en', l, l));
    }

    async train() {
        this.createManager();
        this.addTraining();
        const t0 = Date.now();
        await this.manager.train();
        this.trained = true;
        Logger.info('nlpManager', 'train', { ms: Date.now() - t0 });
    }

    async saveModel() {
        if (!this.trained) return false;
        await this.initRedis();
        const data = this.manager.export(true);
        await this.redis.set(this.modelKey, data);
        await this.redis.set(this.versionKey, this.currentVersion);
        return true;
    }

    async loadModel() {
        await this.initRedis();
        const saved = await this.redis.get(this.modelKey);
        const ver = await this.redis.get(this.versionKey);
        if (!saved || ver !== this.currentVersion) return false;
        this.createManager();
        this.manager.import(saved);
        this.trained = true;
        return true;
    }

    async process(text) {
        await this.initialize();
        const res = await this.manager.process('en', String(text || ''));
        const intent = res.intent || 'sentiment.neutral';
        const score = Number(res.score || 0);
        const guidance = sentimentToGuidance[intent] || { brevity: 'normal', tone: 'neutral' };
        return {
            label: intent,
            score,
            brevity: guidance.brevity,
            tone: guidance.tone
        };
    }
}

export default new SentimentNLP();


