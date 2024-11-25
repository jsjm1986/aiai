class AIService {
    static API_PROVIDERS = {
        DEEPSEEK: 'deepseek',
        OPENAI: 'openai',
        ANTHROPIC: 'anthropic',
        STEP: 'step'
    };

    static currentProvider = AIService.API_PROVIDERS.DEEPSEEK;
    static failedAttempts = new Map();
    static MAX_RETRIES = 3;
    static TIMEOUT_MS = 60000;
    static RETRY_DELAYS = [2000, 5000, 10000];

    static RATE_LIMITS = {
        STEP: {
            requestsPerMinute: 20,
            requestsPerHour: 200,
            cooldownMs: 3000  // 每次请求后的冷却时间3秒
        },
        DEEPSEEK: {
            requestsPerMinute: 30,
            requestsPerHour: 300,
            cooldownMs: 2000  // 冷却时间2秒
        },
        OPENAI: {
            requestsPerMinute: 50,
            requestsPerHour: 500,
            cooldownMs: 1200  // 冷却时间1.2秒
        }
    };

    static requestTimestamps = {
        STEP: [],
        DEEPSEEK: [],
        OPENAI: [],
        ANTHROPIC: []
    };

    static decisionCache = new Map();
    static CACHE_DURATION = 30000; // 缓存30秒
    static lastRequestTime = Date.now();
    static MIN_REQUEST_INTERVAL = 2000; // 最小请求间隔2秒

    static async callAI(prompt, systemPrompt = '') {
        let lastError = null;
        
        for (let retryCount = 0; retryCount < this.MAX_RETRIES; retryCount++) {
            try {
                // 检查是否需要等待冷却时间
                await this.waitForRateLimit(CONFIG.API_PROVIDER);
                
                console.log(`尝试调用 AI API (尝试 ${retryCount + 1}/${this.MAX_RETRIES})...`);
                
                if (window.loadingManager) {
                    window.loadingManager.updateProgress(
                        1,
                        'API调用中',
                        `正在调用 ${CONFIG.API_PROVIDER} API (尝试 ${retryCount + 1}/${this.MAX_RETRIES})`
                    );
                }

                let response;
                switch (CONFIG.API_PROVIDER) {
                    case this.API_PROVIDERS.STEP:
                        response = await this.callWithTimeout(
                            () => this.callStep(prompt, systemPrompt),
                            this.TIMEOUT_MS
                        );
                        break;
                    case this.API_PROVIDERS.DEEPSEEK:
                        response = await this.callWithTimeout(
                            () => this.callDeepSeek(prompt, systemPrompt),
                            this.TIMEOUT_MS
                        );
                        break;
                    case this.API_PROVIDERS.OPENAI:
                        response = await this.callWithTimeout(
                            () => this.callOpenAI(prompt, systemPrompt),
                            this.TIMEOUT_MS
                        );
                        break;
                    case this.API_PROVIDERS.ANTHROPIC:
                        response = await this.callWithTimeout(
                            () => this.callAnthropic(prompt, systemPrompt),
                            this.TIMEOUT_MS
                        );
                        break;
                    default:
                        throw new Error(`未知的 API 提供商: ${CONFIG.API_PROVIDER}`);
                }

                return response;

            } catch (error) {
                lastError = error;
                console.error(`AI 调用失败 (尝试 ${retryCount + 1}/${this.MAX_RETRIES}):`, error);

                if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    throw new Error(`API 认证失败，请检查 ${CONFIG.API_PROVIDER} 的 API Key`);
                }

                if (error.message.includes('429')) {
                    // 如果是频率限制错误，等待更长时间
                    const provider = CONFIG.API_PROVIDER.toUpperCase();
                    const cooldownTime = this.RATE_LIMITS[provider]?.cooldownMs * 2 || 5000;
                    console.log(`触发频率限制，等待 ${cooldownTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, cooldownTime));
                    continue;
                }

                if (retryCount < this.MAX_RETRIES - 1) {
                    const delay = this.RETRY_DELAYS[retryCount];
                    console.log(`等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        if (this.shouldSwitchProvider()) {
            console.log('切换到备用 API 提供商...');
            this.switchToNextProvider();
            // 清除新提供商的请求历史
            this.requestTimestamps[CONFIG.API_PROVIDER.toUpperCase()] = [];
            return await this.callAI(prompt, systemPrompt);
        }

        throw lastError || new Error('API 调用失败，请检查网络连接');
    }

    static async callWithTimeout(asyncFn, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API请求超时，请检查网络连接')), timeout);
        });

        try {
            return await Promise.race([asyncFn(), timeoutPromise]);
        } catch (error) {
            if (error.message.includes('超时')) {
                console.warn('API请求超时，准备重试...');
            }
            throw error;
        }
    }

    static shouldSwitchProvider() {
        const currentFailures = this.failedAttempts.get(CONFIG.API_PROVIDER) || 0;
        return currentFailures >= this.MAX_RETRIES;
    }

    static async callDeepSeek(prompt, systemPrompt = '') {
        try {
            console.log('调用 DeepSeek API...');
            
            const response = await fetch(`${CONFIG.API_URLS.DEEPSEEK}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`DeepSeek API调用失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            console.error('DeepSeek API调用失败:', error);
            throw error;
        }
    }

    static switchToNextProvider() {
        const providers = Object.values(this.API_PROVIDERS);
        const currentIndex = providers.indexOf(this.currentProvider);
        let nextIndex = (currentIndex + 1) % providers.length;
        
        while (nextIndex !== currentIndex) {
            const nextProvider = providers[nextIndex];
            if ((this.failedAttempts.get(nextProvider) || 0) < this.MAX_RETRIES) {
                this.currentProvider = nextProvider;
                console.log(`切换到新的API提供商: ${nextProvider}`);
                return;
            }
            nextIndex = (nextIndex + 1) % providers.length;
        }
    }

    static resetFailedAttempts() {
        this.failedAttempts.clear();
        console.log('已重置所有API提供商的失败计数');
    }

    static async callOpenAI(prompt, systemPrompt = '') {
        try {
            console.log('尝试调用 OpenAI API...');
            
            const response = await fetch(`${CONFIG.API_URLS.OPENAI}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API调用失败: ${response.status}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            console.error('OpenAI API调用失败:', error);
            this.currentProvider = this.API_PROVIDERS.ANTHROPIC;
            return await this.callAI(prompt, systemPrompt);
        }
    }

    static async callAnthropic(prompt, systemPrompt = '') {
        // 实现Anthropic API调用
        // ... 类似的实现
    }

    static async callMoonshot(prompt, systemPrompt = '') {
        try {
            console.log('尝试调用 Moonshot API...');
            
            const response = await fetch(`${CONFIG.API_URLS.MOONSHOT}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'moonshot-v1-8k',  // 使用 Moonshot 的模型
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error(`Moonshot API调用失败: ${response.status}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            console.error('Moonshot API调用失败:', error);
            this.currentProvider = this.API_PROVIDERS.DEEPSEEK;
            return await this.callAI(prompt, systemPrompt);
        }
    }

    static recordTokenUsage(tokens) {
        const provider = CONFIG.API_PROVIDER.toLowerCase();
        const tokenKey = `${provider}_token_usage`;
        
        try {
            // 获取现有记录
            const storedUsage = localStorage.getItem(tokenKey);
            let usageData = storedUsage ? JSON.parse(storedUsage) : [];

            // 添加新的使用记录
            usageData.push({
                timestamp: Date.now(),
                tokens: tokens
            });

            // 只保留最近24小时的记录
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            usageData = usageData.filter(record => record.timestamp > oneDayAgo);

            // 保存更新后的记录
            localStorage.setItem(tokenKey, JSON.stringify(usageData));

            console.log(`记录Token使用: ${tokens} (${provider})`);
        } catch (error) {
            console.error('记录Token使用失败:', error);
        }
    }

    static parseResponse(data) {
        try {
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('API响应格式不正确');
            }

            // 记录Token使用量
            if (data.usage && data.usage.total_tokens) {
                this.recordTokenUsage(data.usage.total_tokens);
            }

            const responseContent = data.choices[0].message.content;
            return JSON.parse(this.cleanJsonString(responseContent));
        } catch (error) {
            console.error('响应解析错误:', error);
            throw error;
        }
    }

    static cleanJsonString(str) {
        str = str.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        str = str.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
        str = str.replace(/[\u0000-\u001F]+/g, '');
        return str;
    }

    static async callDeepSeekWithRetry(prompt, systemPrompt, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.callDeepSeek(prompt, systemPrompt);
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                console.log(`重试第 ${i + 1} 次...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    static async generatePopulation(basePopulationSize) {
        const BATCH_SIZE = 10;
        const batches = Math.ceil(basePopulationSize / BATCH_SIZE);
        
        const systemPrompt = `你是一个城市人口规划家。请生成一个${basePopulationSize}人口的城市人口统计数据。
        输出必须是规范的JSON格式：
        {
            "demographics": {
                "ageDistribution": {
                    "0-14": number,
                    "15-24": number,
                    "25-34": number,
                    "35-44": number,
                    "45-54": number,
                    "55-64": number,
                    "65+": number
                },
                "occupationDistribution": {
                    "职业1": number,
                    "职业2": number,
                    ...
                },
                "familyStructure": {
                    "singlePerson": number,
                    "couple": number,
                    "nuclear": number,
                    "extended": number
                }
            }
        }`;

        const demographicsPrompt = `请生成一个拥有${basePopulationSize}人的现代化城市的人口统计数据。
        要求：
        1. 年龄分布要合理，总和必须等于${basePopulationSize}
        2. 职业布要包含各类必要职业，总和必须等于${basePopulationSize}
        3. 家庭结构要符合现代城市特点`;

        const demographics = await this.callAI(demographicsPrompt, systemPrompt);
        console.log('生成的人口统计数据:', demographics);

        let people = [];
        let totalGenerated = 0;

        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
            const remainingPeople = basePopulationSize - totalGenerated;
            const currentBatchSize = Math.min(BATCH_SIZE, remainingPeople);
            
            if (currentBatchSize <= 0) break;

            const batchSystemPrompt = `基于给定的人口统计数据，生成${currentBatchSize}个居民的详细信息。
            输出必须是规范的JSON格式，必须包含恰好${currentBatchSize}个：
            {
                "people": [
                    {
                        "id": "唯一ID",
                        "name": "姓名",
                        "age": number,
                        "occupation": "职",
                        "income": "收入水平",
                        "education": "教育水平",
                        "familyId": "家庭ID",
                        "traits": ["性格征"],
                        "interests": ["兴趣爱好"],
                        "needs": ["基本需求"],
                        "schedule": ["日常动"]
                    }
                ]
            }`;

            const batchPrompt = `基于以下人口统计数据，生成第${batchIndex + 1}批居民的详细信息：
            ${JSON.stringify(demographics)}
            
            要：
            1. 必须生成恰好${currentBatchSize}个居民数据
            2. 生成的居民数据要符合统计分布
            3. 每个居民要有完整的个人信息
            4. 通过familyId关联家庭成`;

            const batchResult = await this.callAI(batchPrompt, batchSystemPrompt);
            console.log(`生成第${batchIndex + 1}批人口数据:`, batchResult);
            
            if (!batchResult.people || !Array.isArray(batchResult.people) || 
                batchResult.people.length !== currentBatchSize) {
                throw new Error(`第${batchIndex + 1}批人口数据生成错误: 期望 ${currentBatchSize} 人，实际 ${batchResult.people?.length || 0} 人`);
            }

            batchResult.people.forEach((person, personIndex) => {
                person.id = `batch_${batchIndex}_person_${personIndex}`;
                totalGenerated++;
            });

            people = people.concat(batchResult.people);
        }

        if (people.length !== basePopulationSize) {
            throw new Error(`人口数量不匹配: 期望 ${basePopulationSize}, 实际 ${people.length}`);
        }

        const result = {
            totalPopulation: basePopulationSize,
            demographics: demographics.demographics,
            people: people
        };

        console.log('生成的完整人口数据:', result);
        return result;
    }

    static async generateDemographics(populationSize) {
        const systemPrompt = `生成一个${populationSize}人口的城市人口统计数据。
        仅返回统计数据，不包含具体个人信息。`;

        const prompt = `请生成以下统计数据：
        1. 年龄分布
        2. 职业分布
        3. 家庭结构分布
        4. 教育水平分布
        5. 收入水平分布`;

        return await this.callAI(prompt, systemPrompt);
    }

    static async generatePeopleBatch(batchSize, startIndex, demographics) {
        const systemPrompt = `基于给定的人口统计数据，生成${batchSize}个具体的居民数据。
        这是第${startIndex + 1}到${startIndex + batchSize}个居民。`;

        const prompt = `基于以下统计数据生成具体居民：
        ${JSON.stringify(demographics)}
        
        要求：
        1. 生成的居民数据要符合统计分布
        2. 每个居民要有完整的个人信息
        3. 确保家庭关系的合理性`;

        return await this.callAI(prompt, systemPrompt);
    }

    static async generateCityBasedOnNeeds(populationData) {
        console.log('开始生成城市规划，基于人口数据:', populationData);

        const systemPrompt = `你是一个城市规专一个细城规方案，必须严格按照以下JSON格式返回：
        {
            "buildings": [
                {
                    "id": "string",
                    "name": "建筑名称（中文）",
                    "type": "residential/commercial/education/healthcare/recreation",
                    "size": number(1-5),
                    "capacity": number,
                    "position": {
                        "x": number(0-1000),
                        "y": 0,
                        "z": number(0-1000)
                    },
                    "purpose": "建筑用途描述（中文）"
                }
            ],
            "districts": [
                {
                    "id": "string",
                    "name": "区域名称（中文）",
                    "type": "区域类型",
                    "boundaries": {
                        "x1": number,
                        "z1": number,
                        "x2": number,
                        "z2": number
                    }
                }
            ],
            "infrastructure": {
                "roads": [
                    {
                        "id": "string",
                        "type": "主干道/次干道",
                        "width": number,
                        "points": [
                            {"x": number, "z": number}
                        ]
                    }
                ]
            }
        }

        注意：
        1. 必须严格按照此JSON格式返回
        2. 不要添加任何额外的说明文字
        3. 所有字符串必须使用双引号
        4. 所有数字不需要引号
        5. 建筑物的position必须在0-1000范围内
        6. 建筑物的size必须在1-5范围内`;

        const prompt = `基于以下人口数据生成城市规划：
        总人口：${populationData.totalPopulation}
        年龄分布：${JSON.stringify(populationData.demographics.ageDistribution)}
        职业分布：${JSON.stringify(populationData.demographics.occupationDistribution)}
        家庭结构：${JSON.stringify(populationData.demographics.familyStructure)}

        要求：
        1. 建筑物数量要与人口规模相匹配
        2. 建筑物类型要满足不同职业和年龄段的需
        3. 建筑物容量要合理
        4. 建筑物位置要避免重叠
        5. 相似功能的建筑要集中在同一区域
        6. 道路网络要连接所有建筑物

        请直接返回符合格式的JSON数据，不要添加任何说明文字。`;

        try {
            const cityPlan = await this.callAI(prompt, systemPrompt);
            console.log('生成的城市规划数据:', cityPlan);
            return cityPlan;
        } catch (error) {
            console.error('生成城市规划失败:', error);
            throw error;
        }
    }

    static validateBuilding(building) {
        return building && 
               typeof building.id === 'string' &&
               typeof building.name === 'string' &&
               typeof building.type === 'string' &&
               typeof building.purpose === 'string' &&
               typeof building.capacity === 'number' &&
               typeof building.size === 'number' &&
               building.position && 
               typeof building.position.x === 'number' &&
               typeof building.position.z === 'number';
    }

    static validateDistrict(district) {
        return district &&
               typeof district.id === 'string' &&
               typeof district.name === 'string' &&
               typeof district.type === 'string' &&
               district.boundaries &&
               typeof district.boundaries.x1 === 'number' &&
               typeof district.boundaries.z1 === 'number' &&
               typeof district.boundaries.x2 === 'number' &&
               typeof district.boundaries.z2 === 'number';
    }

    static validateRoad(road) {
        return road &&
               typeof road.id === 'string' &&
               typeof road.type === 'string' &&
               typeof road.width === 'number' &&
               Array.isArray(road.points) &&
               road.points.length >= 2 &&
               road.points.every(point => 
                   typeof point.x === 'number' && 
                   typeof point.z === 'number'
               );
    }

    static validatePublicSpace(space) {
        return space &&
               typeof space.id === 'string' &&
               typeof space.type === 'string' &&
               typeof space.name === 'string' &&
               space.position &&
               typeof space.position.x === 'number' &&
               typeof space.position.z === 'number' &&
               typeof space.size === 'number';
    }

    static async getDecision(context) {
        try {
            // 1. 检查是否有紧急需求，如果有直接返回默认决策
            const urgentNeed = context.agent.checkUrgentNeed();
            if (urgentNeed) {
                return this.getDefaultDecision(context);
            }

            // 2. 生成缓存键
            const cacheKey = this.generateCacheKey(context);

            // 3. 检查缓存
            const cachedDecision = this.checkCache(cacheKey);
            if (cachedDecision) {
                return cachedDecision;
            }

            // 4. 检查请求间隔
            const now = Date.now();
            if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
                return this.getDefaultDecision(context);
            }

            // 5. 调用AI API
            const decision = await this.callAI(this.formatPrompt(context));
            
            // 6. 缓存结果
            this.cacheDecision(cacheKey, decision);
            
            // 7. 更新最后请求时间
            this.lastRequestTime = now;

            return decision;

        } catch (error) {
            console.error('生成决策失败:', error);
            return this.getDefaultDecision(context);
        }
    }

    static generateCacheKey(context) {
        // 生成缓存键，考虑关键状态
        const key = {
            agentId: context.agent.id,
            location: context.agent.currentLocation,
            timeOfDay: context.environment.timeOfDay,
            energy: Math.round(context.agent.currentState.physical.energy / 10) * 10,
            stress: Math.round(context.agent.currentState.emotional.stress / 10) * 10,
            socialNeeds: Math.round(context.agent.currentState.social.socialNeeds / 10) * 10
        };
        return JSON.stringify(key);
    }

    static checkCache(key) {
        const cached = this.decisionCache.get(key);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_DURATION)) {
            return cached.decision;
        }
        return null;
    }

    static cacheDecision(key, decision) {
        this.decisionCache.set(key, {
            decision,
            timestamp: Date.now()
        });

        // 清理过期缓存
        if (this.decisionCache.size > 1000) {
            this.cleanCache();
        }
    }

    static cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.decisionCache.entries()) {
            if (now - value.timestamp > this.CACHE_DURATION) {
                this.decisionCache.delete(key);
            }
        }
    }

    static getDefaultDecision(context) {
        // 根据代理状态生成默认决策
        const state = context.agent.currentState;
        
        if (state.physical.energy < 30) {
            return {
                action: 'rest',
                target: context.agent.residence?.id,
                reason: '能量不足，需要休息',
                energyCost: 5,
                stressImpact: -10
            };
        }

        if (state.emotional.stress > 70) {
            return {
                action: 'relax',
                target: 'park_1',
                reason: '压力过大，需要放松',
                energyCost: 5,
                stressImpact: -15
            };
        }

        if (state.social.socialNeeds > 70) {
            return {
                action: 'socialize',
                target: 'plaza_1',
                reason: '社交需求强烈',
                energyCost: 10,
                stressImpact: -5
            };
        }

        // 默认决策
        return {
            action: 'rest',
            target: context.agent.residence?.id,
            reason: '默认休息行为',
            energyCost: 5,
            stressImpact: -5
        };
    }

    static async getInteraction(context) {
        const systemPrompt = `你是一个AI交互系。生成两个AI代理之间的自然交互内容。
        输出必须是JSON格式，包含以下字段：
        {
            "type": "交互类型",
            "content": "具体内容",
            "impact": number,
            "duration": number
        }`;

        const prompt = `生成以下两个AI代理之间的交互：
        代理1：${JSON.stringify(context.agent1)}
        代理2：${JSON.stringify(context.agent2)}
        
        考虑他们的角色、特和当前状态生成合适交互内容。`;

        return await this.callAI(prompt, systemPrompt);
    }

    static async getPersonality(personData) {
        const systemPrompt = `你是一个角色设计专家。基于给定的人物基础信息，生成详细的个性化特征。
        输必须是规范的JSON格式：
        {
            "personality": {
                "traits": ["性格特征"],
                "values": ["核心价值观"],
                "interests": ["具体兴趣爱好"],
                "goals": {
                    "shortTerm": ["短期目标"],
                    "longTerm": ["长期目标"]
                },
                "socialPreferences": {
                    "introversion": number(0-1),
                    "preferredInteractions": ["喜欢的社交方式"]
                }
            },
            "schedule": {
                "weekday": ["工作日日程"],
                "weekend": ["周末日程"]
            }
        }`;

        const prompt = `基于以下人物信息生成详细的个性特征：
        姓名：${personData.name}
        年龄：${personData.age}
        职业：${personData.occupation}
        教育程度：${personData.education}
        收入水平：${personData.income}
        基本特征：${JSON.stringify(personData.traits)}
        基本兴趣：${JSON.stringify(personData.interests)}

        要求：
        1. 性格特征要与业和年龄相匹配
        2. 目标要符合职业发展路径
        3. 社交偏好要考虑性格特征
        4. 日程安排要符合职业特点`;

        return await this.callAI(prompt, systemPrompt);
    }

    static compressPersonData(person) {
        return {
            i: person.id,                    // id
            n: person.name,                  // name
            a: person.age,                   // age
            o: person.occupation,            // occupation
            f: person.familyId,              // familyId
            t: person.traits.join(','),      // traits
            s: person.schedule.join(',')     // schedule
        };
    }

    static decompressPersonData(compressed) {
        return {
            id: compressed.i,
            name: compressed.n,
            age: compressed.a,
            occupation: compressed.o,
            familyId: compressed.f,
            traits: compressed.t.split(','),
            schedule: compressed.s.split(',')
        };
    }

    static validatePopulationData(data) {
        const required = ['totalPopulation', 'demographics', 'people'];
        const missing = required.filter(key => !data[key]);
        
        if (missing.length > 0) {
            throw new Error(`数据不完整，缺少: ${missing.join(', ')}`);
        }

        if (data.people.length !== data.totalPopulation) {
            throw new Error(`人口数量不匹配: 预期 ${data.totalPopulation}, 实际 ${data.people.length}`);
        }

        return data;
    }

    static async generateConversation(context) {
        try {
            const systemPrompt = `你是一个对话生成专家。请根据以下场景和人物信息生成一段自然的对话。
            要求：
            1. 对话要符合场景和身份特征
            2. 对话要有起因和目的
            3. 语气要自然，符合中国人的表达习惯
            4. 考虑说话者的职业背景和性格特征
            5. 考虑当前的环境和时间
            6. 对话要有情感和态度的表现

            输出格式必须是JSON：
            {
                "content": {
                    "speaker": ["说���内容1", "说话内容2"],
                    "listener": ["回应内容1", "回应内容2"]
                },
                "topic": "对话主题",
                "mood": "对话氛围",
                "impact": number(-1到1之间，表示对关系的影响)
            }`;

            const prompt = `场景：${context.environment?.location || '未知地点'}
            时间：${new Date().toLocaleTimeString()}
            周围环境：有${context.environment?.nearbyAgents || 0}人在场

            说话者信息：
            - 职业：${context.agent1?.occupation || '未知'}
            - 性格特征：${context.agent1?.personality?.traits?.join('、') || '未知'}
            - 当前状态：
              * 疲劳度：${context.agent1?.currentState?.physical?.energy || 100}%
              * 心情：${context.agent1?.currentState?.emotional?.happiness || 100}%
              * 压力：${context.agent1?.currentState?.emotional?.stress || 0}%

            听众信息：
            - 职业：${context.agent2?.occupation || '未知'}
            - 性格特征：${context.agent2?.personality?.traits?.join('、') || '未知'}
            - 当前状态
              * 疲劳度：${context.agent2?.currentState?.physical?.energy || 100}%
              * 心情：${context.agent2?.currentState?.emotional?.happiness || 100}%
              * 压力：${context.agent2?.currentState?.emotional?.stress || 0}%

            社交关系：${context.agent1?.relationshipHistory ? 
                '之前有过互动，关系程度：' + context.agent1.relationshipHistory.level : 
                '初次见面'}

            要求生成一段自然的对话，考虑：
            1. 如果是初次见面，对话应该更礼貌和试探性
            2. 如果之前有互动，对话应该体现出熟悉程度
            3. 根据场合选择合适的话题（工作场合谈工作，休闲场合可以闲聊）
            4. 考虑双方的疲劳度和心情状态
            5. 对话要有来有往，不要太生硬
            6. 符合中国人的社交习惯和礼仪`;

            const response = await this.callAI(prompt, systemPrompt);

            if (!response || !response.content) {
                return {
                    content: {
                        speaker: ["你好，今天工作还顺利吗？", "最近天气不错，适合出来走走。"],
                        listener: ["挺好的，谢谢关心。", "是啊，难得有这么好的天气。"]
                    },
                    topic: "日常暄",
                    mood: "友好",
                    impact: 0.1
                };
            }

            return response;

        } catch (error) {
            console.error('生成对话失败:', error);
            return {
                content: {
                    speaker: ["你好。", "最近怎么样？"],
                    listener: ["你好。", "还不错，谢谢。"]
                },
                topic: "简单问候",
                mood: "平和",
                impact: 0.05
            };
        }
    }

    static generateBuildingsForNeeds(needs) {
        const buildingTypes = {
            physical: {
                hunger: ['restaurant', 'cafeteria', 'supermarket'],
                fatigue: ['residential', 'rest_area', 'hotel'],
                health: ['hospital', 'clinic', 'gym'],
                energy: ['rest_area', 'cafe']
            },
            emotional: {
                stress: ['park', 'recreation_center', 'spa'],
                happiness: ['entertainment_center', 'art_gallery', 'theater'],
                satisfaction: ['service_center', 'luxury_facilities']
            },
            social: {
                socialNeeds: [
                    'community_center',  // 社区中心
                    'plaza',            // 广场
                    'cafe',             // 咖啡馆
                    'restaurant',       // 餐厅
                    'park',             // 公园
                    'recreation_center' // 娱乐中心
                ],
                relationships: [
                    'public_space',     // 公共空间
                    'social_club',      // 社交俱乐部
                    'community_hall'    // 社区会堂
                ]
            },
            development: {
                career: ['office_building', 'training_center', 'library'],
                education: ['school', 'university', 'training_institute'],
                personal: ['cultural_center', 'sports_facility']
            }
        };

        // 确保每种需求类型都有对应的建筑物
        const essentialBuildings = {
            'community_center': {
                type: 'recreation',
                name: '社区中心',
                services: ['socialize', 'entertainment', 'relax'],
                schedule: { open: 8, close: 22 }
            },
            'plaza': {
                type: 'plaza',
                name: '中央广场',
                services: ['socialize', 'relax'],
                schedule: { open: 0, close: 24 }  // 24小时开放
            },
            'park': {
                type: 'park',
                name: '城市公园',
                services: ['socialize', 'exercise', 'relax'],
                schedule: { open: 0, close: 24 }  // 24小时开放
            },
            'cafe': {
                type: 'commercial',
                subType: 'cafe',
                name: '咖啡馆',
                services: ['socialize', 'eat', 'relax'],
                schedule: { open: 7, close: 23 }
            }
        };

        return {
            buildingTypes,
            essentialBuildings
        };
    }

    static validateCityPlan(cityPlan) {
        console.log('验证城市规划数据:', cityPlan);

        if (!cityPlan || typeof cityPlan !== 'object') {
            console.error('城市规划数据无效');
            return false;
        }

        const requiredFields = ['buildings', 'districts', 'infrastructure'];
        for (const field of requiredFields) {
            if (!cityPlan[field]) {
                console.error(`缺少必要字段: ${field}`);
                return false;
            }
        }

        if (!Array.isArray(cityPlan.buildings) || cityPlan.buildings.length === 0) {
            console.error('建筑物数据无效');
            return false;
        }

        for (const building of cityPlan.buildings) {
            if (!this.validateBuilding(building)) {
                console.error('建筑物数据不完整:', building);
                return false;
            }
        }

        if (!Array.isArray(cityPlan.districts) || cityPlan.districts.length === 0) {
            console.error('区域数据无效');
            return false;
        }

        if (!cityPlan.infrastructure || !cityPlan.infrastructure.roads) {
            console.error('基础设施数据无效');
            return false;
        }

        console.log('城市规划数据验证通过');
        return true;
    }

    static async simulateAction(context) {
        const systemPrompt = `你是一行为模拟系统。于代理的行动和环境，生成行动的结果和影响。
        考虑：
        1. 行动的成功概率
        2. 对代理状态影响
        3. 可能的交机会
        4. 获得的经验和记忆

        返回格式必须是JSON：
        {
            "success": boolean,
            "stateChanges": {
                "physical": { changes... },
                "emotional": { changes... },
                "social": { changes... }
            },
            "experience": "获得的经验",
            "socialOpportunity": boolean,
            "nearbyAgent": "可能的社交对象ID"
        }`;

        return await this.callAI(JSON.stringify(context), systemPrompt);
    }

    static async saveAgentData(agent) {
        try {
            const currentAction = agent.behaviorControl?.currentAction;
            const isMoving = agent.behaviorControl?.isMoving;
            
            if (currentAction || isMoving) {
                console.log(`代理 ${agent.id} 在执行行动或移动，跳过API调用`);
                return true;
            }

            const now = Date.now();
            const lastCallTime = agent.lastApiCallTime || 0;
            const API_CALL_COOLDOWN = 10000;

            if (now - lastCallTime < API_CALL_COOLDOWN) {
                console.log(`代理 ${agent.id} API调用冷却中，跳过调用`);
                return true;
            }

            const needsUpdate = 
                (agent.state?.physical?.energy < 30) ||
                (agent.state?.emotional?.stress > 70) ||
                (agent.state?.social?.socialNeeds > 70);

            if (!needsUpdate) {
                console.log(`代理 ${agent.id} 当前状态良好，无需更新`);
                return true;
            }

            agent.lastApiCallTime = now;

            const agentData = {
                id: agent.id,
                name: agent.name || agent.id,
                occupation: agent.occupation,
                personality: agent.personality,
                state: {
                    physical: {
                        ...agent.state.physical,
                        energy: Math.max(0, agent.state.physical.energy)
                    },
                    emotional: {
                        ...agent.state.emotional,
                        stress: Math.min(100, agent.state.emotional.stress)
                    },
                    social: {
                        ...agent.state.social,
                        socialNeeds: Math.min(100, agent.state.social.socialNeeds)
                    }
                },
                behavior: {
                    currentAction: currentAction || null,
                    actionProgress: agent.behaviorControl?.actionStartTime ? 
                        Math.min(100, ((now - agent.behaviorControl.actionStartTime) / 
                        (agent.behaviorControl?.actionDuration || 3000)) * 100) : 0,
                    isMoving: isMoving || false,
                    position: agent.position,
                    path: agent.behavior?.path || [],
                    schedule: agent.behavior?.dailySchedule || {}
                },
                memory: {
                    shortTerm: agent.memory?.shortTerm || [],
                    relationships: Array.from(agent.memory?.relationships?.entries() || []),
                    experiences: agent.memory?.experiences || []
                },
                lastUpdate: new Date().toISOString()
            };

            console.log(`代理 ${agent.id} 数据更新:`, {
                基本信息: {
                    ID: agent.id,
                    职业: agent.occupation,
                    位置: agent.position,
                    行动状态: currentAction ? 
                        `正在${currentAction} (${agentData.behavior.actionProgress.toFixed(1)}%)` : 
                        '空闲',
                    上次API调用: new Date(lastCallTime).toLocaleTimeString()
                },
                当前状态: {
                    体力: agentData.state.physical.energy.toFixed(1),
                    心情: agentData.state.emotional.happiness,
                    压力: agentData.state.emotional.stress.toFixed(1),
                    社交需求: agentData.state.social.socialNeeds.toFixed(1)
                },
                当前行为: {
                    行动: currentAction || '空闲',
                    目标地点: agent.behavior?.targetLocation || '无',
                    移动状态: isMoving ? '移动中' : '静止',
                    路径点数: agent.behavior?.path?.length || 0
                }
            });

            localStorage.setItem(`agent_${agent.id}`, JSON.stringify(agentData));
            console.log(`代理 ${agent.id} 数据已保存`);

            return true;
        } catch (error) {
            console.error(`保存代理 ${agent.id} 数据失败:`, error);
            return false;
        }
    }

    static async loadAgentData(agentId) {
        try {
            const data = localStorage.getItem(`agent_${agentId}`);
            if (!data) {
                console.warn(`未找到代理 ${agentId} 的数据`);
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            console.error(`加载代理 ${agentId} 数据失败:`, error);
            return null;
        }
    }

    static async waitForRateLimit(provider) {
        const providerKey = provider.toUpperCase();
        const timestamps = this.requestTimestamps[providerKey];
        const limits = this.RATE_LIMITS[providerKey];

        if (!limits) return;

        const now = Date.now();
        
        // 清理超1小时的旧记录
        const oneHourAgo = now - 3600000;
        this.requestTimestamps[providerKey] = timestamps.filter(t => t > oneHourAgo);

        // 检查分钟级别的限制
        const oneMinuteAgo = now - 60000;
        const requestsLastMinute = timestamps.filter(t => t > oneMinuteAgo).length;
        
        if (requestsLastMinute >= limits.requestsPerMinute) {
            const waitTime = oneMinuteAgo + 60000 - now + 1000;
            console.log(`达到每分钟请求限制，等待 ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // 检查小时级别的限制
        const requestsLastHour = timestamps.length;
        if (requestsLastHour >= limits.requestsPerHour) {
            const waitTime = oneHourAgo + 3600000 - now + 1000;
            console.log(`达到每小时请求限制，等待 ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // 确保请求之间有最小间隔
        const lastRequest = timestamps[timestamps.length - 1];
        if (lastRequest) {
            const timeSinceLastRequest = now - lastRequest;
            if (timeSinceLastRequest < limits.cooldownMs) {
                const waitTime = limits.cooldownMs - timeSinceLastRequest;
                console.log(`等待请求冷却时间 ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        // 记录本次请求时间
        this.requestTimestamps[providerKey].push(now);
    }

    static async callStep(prompt, systemPrompt = '') {
        try {
            console.log('调用 Step API...');

            if (!CONFIG.STEP_API_KEY) {
                throw new Error('未配置 Step API Key');
            }

            const response = await fetch(`${CONFIG.API_URLS.STEP}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.STEP_API_KEY}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.SELECTED_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    top_p: 0.95,
                    response_format: { type: "json_object" },
                    stream: false,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('429 请求过于频繁，需要等待');
                }
                throw new Error(`Step API 调用失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            console.error('Step API 调用失败:', error);
            throw error;
        }
    }

    static async generateDailySchedule(agentInfo) {
        const systemPrompt = `你是一个生活规划专家。请根据以下人物信息生成合理的日常作息安排：
        职业：${agentInfo.occupation}
        性格特征：${agentInfo.personality.traits.join(', ')}
        兴趣爱好：${agentInfo.personality.interests.join(', ')}
        工作地点：${agentInfo.workplace?.name || '未知'}
        居住地点：${agentInfo.residence?.name || '未知'}

        要求：
        1. 安排要符合职业特点
        2. 考虑性格和兴趣的影响
        3. 时间安排要合理
        4. 必须包含：工作、休息、用餐、社交等基本活动
        5. 分为四个时段：morning(6:00-12:00), afternoon(12:00-18:00), evening(18:00-22:00), night(22:00-6:00)

        输出格式必须是JSON：
        {
            "morning": [
                {"time": "6:00", "action": "wake_up", "location": "residence", "duration": 30},
                {"time": "7:00", "action": "breakfast", "location": "residence", "duration": 30},
                ...
            ],
            "afternoon": [...],
            "evening": [...],
            "night": [...]
        }`;

        const prompt = `请为这位${agentInfo.occupation}生成一份合理的日常作息安排。
        考虑到他/她是一个${agentInfo.personality.traits.join('、')}的人，
        喜欢${agentInfo.personality.interests.join('、')}。
        需要合理安排工作、休息、用餐、社交等活动。`;

        try {
            const schedule = await AIService.callAI(prompt, systemPrompt);
            console.log(`为代理 ${agentInfo.id} 生成的日程安排:`, schedule);
            return schedule;
        } catch (error) {
            console.error('生成日程安排失败:', error);
            // 返回默认日程
            return {
                morning: [
                    {time: "7:00", action: "wake_up", location: "residence", duration: 30},
                    {time: "7:30", action: "breakfast", location: "residence", duration: 30},
                    {time: "8:30", action: "work", location: "workplace", duration: 180}
                ],
                afternoon: [
                    {time: "12:00", action: "lunch", location: "restaurant", duration: 60},
                    {time: "13:00", action: "work", location: "workplace", duration: 240}
                ],
                evening: [
                    {time: "18:00", action: "dinner", location: "residence", duration: 60},
                    {time: "19:00", action: "relax", location: "residence", duration: 120}
                ],
                night: [
                    {time: "22:00", action: "sleep", location: "residence", duration: 480}
                ]
            };
        }
    }
} 