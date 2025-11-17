// 图像概念图生成服务模块
// 负责从用户上传的图片中提取焦点问题和三元组，以生成概念图

/**
 * 图像概念图生成服务
 * - 构建多模态提示，指导AI分析图像、提取焦点问题和三元组
 * - 调用后端API，处理从图像到概念图数据的完整流程
 */
class ImageConceptMapService {
    /**
     * 构造函数
     * @param {string} apiBaseUrl - API基础URL
     */
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        console.log("ImageConceptMapService initialized with base URL:", apiBaseUrl);
    }

    /**
     * 从图像生成概念图所需的数据（焦点问题和三元组）
     * @param {string} imageData - Base64编码的图像数据
     * @param {Function} onChunk - 处理流式响应的回调
     * @param {Function} onComplete - 完成时的回调
     * @param {Function} onError - 出错时的回调
     */
    async generate(imageData, onChunk, onComplete, onError) {
        try {
            console.log("🖼️ 开始从图像生成概念图数据...");
            const prompt = this.buildPrompt();

            // 调用新的流式API端点
            const response = await fetch(`${this.apiBaseUrl}/analyze-concept-map/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    image_data: imageData.split(',')[1], // 移除 'data:image/...;base64,' 前缀
                    prompt: prompt,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';
            let fullResponse = '';

            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {
                    stream: true
                });
                const parts = buffer.split('\n\n');
                buffer = parts.pop();

                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        const chunk = part.substring(6);
                        if (chunk !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(chunk);
                                if (parsed.done) {
                                    // 流结束标记，忽略
                                } else if (parsed.content) {
                                    fullResponse += parsed.content;
                                    onChunk(parsed.content);
                                }
                            } catch (e) {
                                console.warn('Could not parse stream chunk:', chunk, e);
                            }
                        }
                    }
                }
            }
             // Handle any remaining data in the buffer
             if (buffer.startsWith('data: ')) {
                const chunk = buffer.substring(6);
                if (chunk && chunk !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(chunk);
                        if (parsed.done) {
                            // 忽略结束
                        } else if (parsed.content) {
                            fullResponse += parsed.content;
                            onChunk(parsed.content);
                        }
                    } catch (e) {
                        console.warn('Could not parse final buffer chunk:', chunk, e);
                    }
                }
            }

            console.log("✅ 流式响应接收完成，AI原始返回:", fullResponse);
            this.parseFinalResponse(fullResponse, onComplete, onError);

        } catch (error) {
            console.error('❌ 从图像生成概念图失败:', error);
            onError({
                message: `请求失败: ${error.message}`
            });
        }
    }
    
    /**
     * 解析最终的AI响应
     * @param {string} responseText - 完整的AI响应文本
     * @param {Function} onComplete - 成功回调
     * @param {Function} onError - 失败回调
     */
    parseFinalResponse(responseText, onComplete, onError) {
        try {
            const startIdx = responseText.indexOf('{');
            const endIdx = responseText.lastIndexOf('}') + 1;

            if (startIdx === -1 || endIdx === 0) {
                throw new Error('响应中未找到有效的JSON对象。');
            }

            const jsonContent = responseText.substring(startIdx, endIdx);
            const result = JSON.parse(jsonContent);

            if (result.focusQuestion && Array.isArray(result.triples)) {
                console.log("✅ 成功解析AI响应:", result);
                onComplete({
                    success: true,
                    focusQuestion: result.focusQuestion,
                    triples: result.triples.map(t => ({
                        source: t[0],
                        relation: t[1],
                        target: t[2],
                        layer: t[3]
                    })), // 转换为对象数组
                    rawResponse: responseText
                });
            } else {
                throw new Error('解析后的JSON结构无效，缺少 "focusQuestion" 或 "triples" 字段。');
            }
        } catch (error) {
            console.error('❌ 解析最终AI响应失败:', error);
            onError({
                message: `AI返回的数据格式不正确，无法解析: ${error.message}`,
                rawResponse: responseText
            });
        }
    }


    /**
     * 构建用于图像分析和概念图数据提取的提示
     * @returns {string} - 构建好的提示字符串
     */
    buildPrompt() {
        return `# 焦点问题驱动的图像概念图任务

你是一位多模态知识工程师。请先识别图像文字，再围绕焦点问题组织概念图。

## 目标说明
- 读取并理解图像场景与文字
- 提炼唯一的焦点问题
- 基于文字内容抽取分层三元组
- 以结构化JSON输出全部结果

## 执行流程
### 1. 焦点问题
- 依据图像核心信息形成1个问题或短句
- 直接输出文本，无引号与前缀
- 不超过20个汉字，能成为概念图中心

### 2. 文字识别
- 完整列出图像中的可读文字
- 仅使用识别出的文字作为后续依据

### 3. 三元组生成
- 先阅读上一步的文字，再根据以下规则抽取：
${this.getTripleExtractionPromptSection()}

### 4. 输出格式
仅返回一个合法JSON对象：
\`\`\`json
{
  "focusQuestion": "唯一的焦点问题",
  "triples": [
    ["概念1", "关系", "概念2", "L1-L2"],
    ["概念A", "关系", "概念B", "L2-L3"]
  ]
}
\`\`\`

## 结果限制
- \`focusQuestion\` 必须存在
- \`triples\` 为长度在15-25之间的数组；若无可用文字则返回 \`[]\`
- 严禁在JSON前后输出任何额外说明

请遵循以上格式完成分析。`;
    }

    /**
     * 获取三元组提取的详细提示规则
     * (此部分规则改编自 llm-manager.js, 确保AI遵循严格的层级和数量限制)
     * @returns {string}
     */
    getTripleExtractionPromptSection() {
        return `### 任务
请首先识别图像中的所有文字，然后根据这些文字内容，提取分层的概念关系三元组。

### 核心规则 (必须严格遵守)
- **为每个概念添加层级标记** (L1, L2, L3, L4)。
- **只能从高层向低层提取三元组** (L1→L2, L2→L3, L3→L4)，单向流动。
- **严格禁止反向、跨层、同层提取**。
- **内容必须完全来源于图像中的文字**。

### 数量限制 (硬性约束)
- **L1层**: 有且只有1个节点 (核心主题)。
- **L2层**: 3-5个节点。
- **L3层**: 3-5个节点。
- **L4层**: 3-5个节点。
- **总三元组数**: 15-25个。

### 层级连接要求 (最关键)
- **L1→L2**: 必须有至少3个三元组。
- **L2→L3**: 必须有至少5个三元组。
- **L3→L4**: 必须有至少5个三元组。

### 概念和关系词要求
- **概念**: 2-8个字，简洁明了。
- **关系词**: 2-4个字的动词短语 (如: 包括, 引发, 促进)，使 "概念1 + 关系词 + 概念2" 通顺。禁止使用 "是", "有" 或带助词的词语。

### 输出格式
每个三元组是一个包含四个元素的数组: \`["头实体", "关系", "尾实体", "层级关系"]\`
例如: \`["辛亥革命", "旨在", "推翻清朝", "L1-L2"]\``;
    }
}

// 导出服务类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageConceptMapService;
} else if (typeof window !== 'undefined') {
    window.ImageConceptMapService = ImageConceptMapService;
}

