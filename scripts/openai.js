class OpenAI {
    constructor(config) {
        this.baseURL = config.baseURL || '/api';
        this.apiKey = config.apiKey;
        this.chat = {
            completions: {
                create: this.createChatCompletion.bind(this)
            }
        };
    }

    async createChatCompletion(params) {
        try {
            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || '未知错误');
            }

            return {
                choices: [{
                    message: {
                        content: data.message
                    }
                }]
            };
        } catch (error) {
            console.error('创建聊天完成请求时出错:', error);
            throw error;
        }
    }
}

export default OpenAI;