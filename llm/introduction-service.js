// 介绍文本生成服务模块
// 处理AI流式生成焦点问题的介绍文本

/**
 * 介绍文本生成服务
 * 负责调用DeepSeek API生成简洁的知识介绍文本
 */
class IntroductionTextService {
    /**
     * 构造函数
     * @param {string} apiBaseUrl - API基础URL
     */
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }
    
    /**
     * 流式生成介绍文本
     * @param {string} keyword - 关键词（焦点问题）
     * @param {Function} onChunk - 接收文本片段的回调函数
     * @returns {Promise<Object>} 生成结果 {success, text, message}
     */
    async generateIntroduction(keyword, onChunk) {
        console.log('📝 开始生成介绍文本，关键词:', keyword);
        
        try {
            // 构建提示词
            const prompt = this.buildIntroPrompt(keyword);
            console.log('   提示词长度:', prompt.length, '字符');
            
            // System Prompt：定义AI角色和输出要求
            const systemPrompt = "你是一个知识介绍专家，擅长用简洁清晰的语言介绍各种概念和知识。请用中文回答，内容保持在一段中，字数严格控制在150字以内。";
            
            // 使用fetch接收流式响应（Server-Sent Events）
            const response = await fetch(`${this.apiBaseUrl}/chat/stream`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ 
                    message: prompt,
                    system_prompt: systemPrompt
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 处理流式响应
            const result = await this.processStreamResponse(response, onChunk);
            
            console.log('介绍文本生成完成，总字数:', result.text.length);
            console.log('生成的完整文本:', result.text.substring(0, 100) + '...');
            
            return {
                success: true,
                text: result.text,
                message: '介绍文本生成完成'
            };
            
        } catch (error) {
            console.error('介绍文本生成失败:', error);
            return {
                success: false,
                error: error.message,
                message: '介绍文本生成失败'
            };
        }
    }
    
    /**
     * 处理流式响应（SSE格式）
     * @param {Response} response - fetch响应对象
     * @param {Function} onChunk - 文本片段回调函数
     * @returns {Promise<Object>} {text: string}
     */
    async processStreamResponse(response, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let streamDone = false;
        
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log('流读取完成（done=true）');
                    break;
                }
                
                // 解码并处理数据
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行
                
                // 处理每一行
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data.trim()) {
                            try {
                                const chunk = JSON.parse(data);
                                
                                // 检查流是否结束
                                if (chunk.done) {
                                    console.log('收到done标记，流式输出结束');
                                    streamDone = true;
                                    break;
                                }
                                
                                // 处理文本内容
                                if (chunk.content) {
                                    fullText += chunk.content;
                                    onChunk(chunk.content); // 实时回调显示
                                } else if (chunk.error) {
                                    throw new Error(chunk.error);
                                }
                            } catch (e) {
                                console.error('解析chunk失败:', e, '原始数据:', data);
                            }
                        }
                    }
                }
                
                // 如果收到done标记，跳出循环
                if (streamDone) {
                    console.log('跳出while循环');
                    break;
                }
            }
            
            // 处理剩余的buffer
            if (buffer && buffer.trim()) {
                console.log('处理剩余buffer:', buffer);
                if (buffer.startsWith('data: ')) {
                    const data = buffer.slice(6);
                    if (data.trim()) {
                        try {
                            const chunk = JSON.parse(data);
                            if (chunk.content) {
                                fullText += chunk.content;
                                onChunk(chunk.content);
                            }
                        } catch (e) {
                            console.error('解析最后一个chunk失败:', e);
                        }
                    }
                }
            }
            
            return { text: fullText };
            
        } finally {
            // 显式释放reader和关闭连接
            try {
                reader.cancel();
                console.log('✅ 流式连接已关闭');
            } catch (e) {
                console.warn('关闭reader时出错:', e);
            }
        }
    }
    
    /**
     * 构建介绍文本生成提示词
     * @param {string} keyword - 关键词
     * @returns {string} 提示词
     */
    buildIntroPrompt(keyword) {
        return `请用2-3段话介绍"${keyword}"，要求：

1. 内容全面：涵盖定义、核心概念、主要特点、应用场景
2. 格式清晰：分2-3个段落，每段3-5句话
3. 风格：客观、准确、易懂
4. 深度适中：既有概括也有具体说明

请直接输出介绍文本，不要有标题或其他格式。`;
    }
}

// 导出服务类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntroductionTextService;
} else if (typeof window !== 'undefined') {
    window.IntroductionTextService = IntroductionTextService;
}

