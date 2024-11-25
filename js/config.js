const CONFIG = {
    DEEPSEEK_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    STEP_API_KEY: '',
    API_PROVIDER: 'deepseek',
    API_URLS: {
        DEEPSEEK: 'https://api.deepseek.com/v1',
        OPENAI: 'https://api.openai.com/v1',
        ANTHROPIC: 'https://api.anthropic.com/v1',
        STEP: 'https://api.stepfun.com/v1'
    },
    MODEL_VERSIONS: {
        DEEPSEEK: ['deepseek-chat', 'deepseek-coder'],
        OPENAI: [
            'gpt-4-0125-preview',      // 最新的GPT-4预览版
            'gpt-4-1106-preview',      // GPT-4 Turbo预览版
            'gpt-4-vision-preview',    // GPT-4 Vision预览版
            'gpt-4',                   // 标准GPT-4
            'gpt-3.5-turbo-0125',      // 最新的GPT-3.5
            'gpt-3.5-turbo-1106',      // GPT-3.5 Turbo
            'gpt-3.5-turbo'            // 标准GPT-3.5
        ],
        ANTHROPIC: [
            'claude-3-opus-20240229',   // 最强大的Claude-3模型
            'claude-3-sonnet-20240229', // 平衡性能和速度的Claude-3
            'claude-3-haiku-20240307',  // 最快的Claude-3
            'claude-2.1',               // Claude 2.1
            'claude-2.0',               // Claude 2.0
            'claude-instant-1.2'        // Claude Instant
        ],
        STEP: [
            {
                id: 'step-1-flash',
                name: '极速大模型',
                context: '8K',
                type: '极速'
            },
            {
                id: 'step-1-8k',
                name: '千亿短文',
                context: '8K',
                type: '标准'
            },
            {
                id: 'step-1-32k',
                name: '千亿短文',
                context: '32K',
                type: '标准'
            },
            {
                id: 'step-1-128k',
                name: '千亿长文',
                context: '128K',
                type: '标准'
            },
            {
                id: 'step-1-256k',
                name: '千亿长文',
                context: '256K',
                type: '标准'
            },
            {
                id: 'step-1v-8k',
                name: '千亿多模',
                context: '8K',
                type: '多模态'
            },
            {
                id: 'step-1v-32k',
                name: '千亿多模',
                context: '32K',
                type: '多模态'
            },
            {
                id: 'step-1.5v-mini',
                name: '百亿多模',
                context: '4K',
                type: '多模态'
            },
            {
                id: 'step-2-16k',
                name: '万亿短文',
                context: '16K',
                type: '高级'
            }
        ]
    },
    CITY_SETTINGS: {
        INITIAL_POPULATION: 1000,
        MAP_SIZE: 1000,
        MAX_BUILDING_HEIGHT: 100,
        POPULATION_LIMITS: {
            MIN: 1,
            MAX: 10000
        }
    }
}; 