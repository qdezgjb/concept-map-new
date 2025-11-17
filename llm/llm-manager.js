// AI服务管理器模块 (LLM Manager)
// 统一管理与大模型API的交互，包括三元组提取和概念图生成
// 
// 核心职责：
// - 管理和协调所有AI服务（三元组提取、概念图生成）
// - 提供统一的对外接口（LLMManager）
// - API配置和端口管理
// - 集成介绍文本生成服务（可选依赖）

/**
 * API配置和端口管理
 */
class LLMConfig {
    constructor() {
        this.API_BASE_URL = 'http://localhost:5000/api';
        this.currentPort = null; // 缓存当前端口
    }
    
    /**
     * 更新API地址（带缓存优化）
     * @param {boolean} force - 是否强制更新并打印日志
     */
    updateApiUrl(force = false) {
        let newPort = null;
        
        if (window.portChecker) {
            newPort = window.portChecker.getCurrentPort();
        } else {
            // 备用方案：从localStorage获取
            const savedPort = localStorage.getItem('flask_port');
            newPort = savedPort ? parseInt(savedPort) : 5000;
        }
        
        // 只有端口变化或强制更新时才打印日志
        if (newPort !== this.currentPort || force) {
            const oldPort = this.currentPort;
            this.currentPort = newPort;
            this.API_BASE_URL = `http://localhost:${newPort}/api`;
            
            if (force || oldPort === null) {
                // 首次初始化时打印详细信息
                console.log(`✅ API端口已配置: ${newPort}`);
                console.log(`   API地址: ${this.API_BASE_URL}`);
            } else if (oldPort !== newPort) {
                // 端口变化时打印警告
                console.warn(`⚠️ API端口已变更: ${oldPort} → ${newPort}`);
                console.log(`   新API地址: ${this.API_BASE_URL}`);
            }
        }
        // 如果端口未变化，静默更新，不打印日志
    }
}

/**
 * 三元组提取服务
 */
class TripleExtractionService {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * 从文本内容中提取三元组
     * @param {string} introText - 输入文本
     * @returns {Promise<Array>} 三元组数组
     */
    async extractTriplesFromIntro(introText) {
        console.log('🔍 开始三元组提取，文本长度:', introText.length);
        console.log('   文本内容（前200字符）:', introText.substring(0, 200));
        
        try {
            // 静默更新API地址（不打印日志，除非端口变化）
            this.config.updateApiUrl();
            
            // 构建三元组提取提示词（简化版，减少处理时间）
            const triplePrompt = this.buildTriplePrompt(introText);
            
            console.log('   提示词长度:', triplePrompt.length, '字符');
            
            // 直接调用API
            const requestUrl = `${this.config.API_BASE_URL}/chat`;
            const requestBody = { message: triplePrompt };
            
            // 添加超时控制（75秒，略大于后端的60秒超时）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.error('❌ 请求超时（75秒），正在取消...');
                controller.abort();
            }, 75000); // 75秒超时
            
            try {
                console.log('📤 [三元组提取] 发送请求');
                console.log('   URL:', requestUrl);
                console.log('   时间戳:', new Date().toISOString());
                const fetchStart = performance.now();
                
                const response = await fetch(requestUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                
                const fetchDuration = ((performance.now() - fetchStart) / 1000).toFixed(2);
                clearTimeout(timeoutId);
                
                console.log(`✅ 收到响应（${fetchDuration}s）- 状态: ${response.status}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log(`   AI返回内容长度: ${result.response.length} 字符`);
                    
                    // 解析三元组（调用data-processing.js中的全局函数）
                    if (typeof window.parseTriplesFromResponse !== 'function') {
                        console.error('❌ parseTriplesFromResponse 函数未定义，请检查 data-processing.js 是否正确加载');
                        console.error('当前 window 对象上的相关函数:', {
                            parseTriplesFromResponse: typeof window.parseTriplesFromResponse,
                            convertTriplesToConceptData: typeof window.convertTriplesToConceptData,
                            convertToD3Format: typeof window.convertToD3Format
                        });
                        return {
                            success: false,
                            error: '三元组解析函数未加载',
                            message: '系统错误：三元组解析函数未加载，请刷新页面重试'
                        };
                    }
                    
                    const triples = window.parseTriplesFromResponse(result.response);
                    console.log(`✅ 成功提取 ${triples.length} 个三元组`);
                    
                    if (triples.length === 0) {
                        console.warn('⚠️ 未能从AI响应中解析到任何三元组');
                        console.log('AI完整响应内容:', result.response);
                        return {
                            success: false,
                            error: '未能解析到三元组',
                            message: 'AI返回了内容，但未能提取到有效的三元组。请检查AI返回格式是否正确。',
                            rawResponse: result.response
                        };
                    }
                    
                    return {
                        success: true,
                        triples: triples,
                        message: `成功从文本中提取 ${triples.length} 个三元组`,
                        rawResponse: result.response
                    };
                } else {
                    console.error('❌ AI响应失败:', result.error);
                    return {
                        success: false,
                        error: result.error || '未知错误',
                        message: `三元组提取失败: ${result.error || '未知错误'}`
                    };
                }
                
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    console.error('❌ 请求超时（75秒）');
                    throw new Error('请求超时：大模型处理时间过长。建议：1) 稍后重试 2) 检查网络连接');
                }
                throw error;
            }
            
        } catch (error) {
            console.error('❌ 三元组提取失败:', error);
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            let userMessage = '网络请求失败';
            if (error.message.includes('超时')) {
                userMessage = error.message;
            } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
                userMessage = '无法连接到后端服务，请确认：1) 后端服务是否启动 2) 端口是否正确(5000) 3) 网络连接是否正常';
            } else {
                userMessage = `请求失败: ${error.message}`;
            }
            
            return {
                success: false,
                error: error.message,
                message: userMessage
            };
        }
    }
    
    /**
     * 构建三元组提取提示词（层级标记版本）
     * @param {string} introText - 输入文本
     * @returns {string} 提示词
     */
    buildTriplePrompt(introText) {
        // 层级标记提取提示词：添加层级标记，只在相邻层之间提取三元组关系
        return `# 重要任务：从文本中提取概念关系，构建分层知识图谱

## ⚠️ 核心规则（必须严格遵守）：
- **为每个概念添加层级标记（L1、L2、L3、L4等）**
- **只能从高层到低层提取三元组**（L1→L2、L2→L3、L3→L4，单向流动）
- **严格禁止反向提取**（绝对不能从低层到高层，如L2→L1、L3→L2、L4→L3）
- **严格禁止跨层提取**（绝对不能从L1直接连接到L3或L4）
- **严格禁止同层提取**（绝对不能在同一层内提取概念关系，如L2-L2、L3-L3、L4-L4）
- **总三元组数：20-28个（严格限制）**
- **🔴🔴🔴 每层节点数量限制（必须严格遵守，超过即视为错误）：**
  - **L1层：有且只有1个节点（这是铁律！必须严格遵守！）**
  - **L2层：3-5个节点（最少3个，最多5个，严禁超过5个）**
  - **L3层：3-5个节点（最少3个，最多5个，严禁超过5个）**
  - **L4层：3-5个节点（最少3个，最多5个，严禁超过5个）**
- **⚠️ L1层只能有1个节点！绝对不能有2个或更多！这是布局的基础要求！**
- **⚠️ 超过节点数量上限将导致概念图布局混乱，必须严格控制！**
- **内容长度要求：约300字左右**
- **层级完整性要求：每一层都必须有节点**
- **⭐ 相邻层连接强制要求（最重要）：**
  - **L1→L2 之间必须提取至少 4 个三元组**
  - **L2→L3 之间必须提取至少 6 个三元组**
  - **L3→L4 之间必须提取至少 6 个三元组**
  - 这些三元组必须覆盖不同的节点组合，确保层次间的充分连接

## 层级划分方法：
1. **L1（第一层）**：🔴 核心主题概念（有且只有1个！绝对不能有第2个！）
2. **L2（第二层）**：主要分类或维度（3-5个，最多5个）
3. **L3（第三层）**：具体分类或子维度（3-5个，最多5个）
4. **L4（第四层）**：具体细节或实例（3-5个，最多5个）

## 提取规则：
1. 将文本按句号、分号、逗号等标点符号分割成行
2. 分析每行内容，确定概念的层级归属
3. **🔴 严格控制每层节点数量（绝对不能超过上限）**：
   - **L1层：有且只有1个节点（绝对不能有第2个！）**
   - **L2层：3-5个节点（最多5个，严禁第6个）**
   - **L3层：3-5个节点（最多5个，严禁第6个）**
   - **L4层：3-5个节点（最多5个，严禁第6个）**
4. **层级完整性要求**：
   - 必须确保L1、L2、L3、L4每一层都有至少1个节点
   - 不能出现空层的情况
5. **⭐ 相邻层连接强制要求（从高到低，最关键）**：
   - **L1→L2 之间必须提取至少 4 个三元组**（从L1的1个节点连接到L2的不同节点）
   - **L2→L3 之间必须提取至少 6 个三元组**（从L2的不同节点连接到L3的不同节点）
   - **L3→L4 之间必须提取至少 6 个三元组**（从L3的不同节点连接到L4的不同节点）
   - 这些三元组必须覆盖不同的源节点和目标节点，确保层次间的充分连接
   - 每个层级的节点应该至少有一个连接到下一层
6. **只能从高层到低层提取关系**（L1→L2、L2→L3、L3→L4，单向）
7. **总三元组数量分配**：
   - L1→L2：4-6个三元组
   - L2→L3：6-10个三元组
   - L3→L4：6-10个三元组
   - 总计：20-28个三元组
8. **绝对禁止同层、跨层和反向提取**
9. **L1层概念只能连接到L2层（向下）**
10. **L2层概念只能连接到L3层（向下）**
11. **L3层概念只能连接到L4层（向下）**
12. **L4层是最底层，不能再向下连接**
13. **如果某层节点数量已达上限，跳过该层的额外节点**
14. **内容长度控制：确保提取的内容适合约300字的介绍**

## ⭐ 相邻层连接强制要求（最重要，必须首先确保）：
**在开始提取之前，必须计划好层间连接，确保：**
1. **L1→L2：至少4个三元组**
   - 从L1的唯一节点（核心主题）连接到L2的至少4个不同节点
   - 覆盖L2层的主要节点，建立核心主题与主要分类的关系
   
2. **L2→L3：至少6个三元组**
   - 从L2的不同节点连接到L3的至少6个不同节点
   - 每个L2节点尽量连接到L3层的节点
   - 确保L3层的节点都有来自L2的连接
   
3. **L3→L4：至少6个三元组**
   - 从L3的不同节点连接到L4的至少6个不同节点
   - 每个L3节点尽量连接到L4层的节点
   - 确保L4层的节点都有来自L3的连接

**这是最关键的要求，必须在提取过程中时刻记住！**

## 🔍 层级验证步骤（必须执行）：
在输出每个三元组之前，必须进行以下检查：
1. **检查概念1的层级**：确定它是L1、L2、L3还是L4
2. **检查概念2的层级**：确定它是L1、L2、L3还是L4
3. **🔴 检查节点数量限制（严格遵守，这是硬性约束）**：
   - 🔴🔴🔴 **如果L1层已有1个节点，绝对不能再添加第2个L1节点！**
   - 如果L2层已有5个节点，绝对不能再添加L2节点（严禁第6个）
   - 如果L3层已有5个节点，绝对不能再添加L3节点（严禁第6个）
   - 如果L4层已有5个节点，绝对不能再添加L4节点（严禁第6个）
   - **⚠️ L1层超过1个节点会导致布局严重错误，必须严格拒绝！**
   - **⚠️ L2/L3/L4层超过5个节点会导致布局混乱，必须拒绝！**
   - **确保L2、L3、L4层最终至少有3个节点（不能少于3个）**
4. **验证层级关系（只允许从高到低）**：
   - 如果概念1是L1，概念2必须是L2（L1→L2）
   - 如果概念1是L2，概念2必须是L3（L2→L3）
   - 如果概念1是L3，概念2必须是L4（L3→L4）
   - 如果概念1是L4，不能再向下连接
5. **拒绝无效连接**：
   - ❌ 拒绝L2-L1、L3-L2、L4-L3（反向，从低到高）
   - ❌ 拒绝L1-L3、L1-L4（跨层）
   - ❌ 拒绝L2-L4（跨层）
   - ❌ 拒绝L2-L2、L3-L3、L4-L4（同层）
   - ❌ 拒绝L3-L1、L4-L1、L4-L2（反向跨层）
   - ❌ 拒绝超出节点数量限制的连接
6. **层级完整性检查**：
   - ✓ 确保L1层至少有1个节点
   - ✓ 确保L2层至少有1个节点
   - ✓ 确保L3层至少有1个节点
   - ✓ 确保L4层至少有1个节点
7. **⭐ 相邻层连接检查（从高到低，最关键）**：
   - ✓ **确保L1→L2之间有至少 4 个三元组**（从L1到L2的不同节点）
   - ✓ **确保L2→L3之间有至少 6 个三元组**（从L2的不同节点到L3的不同节点）
   - ✓ **确保L3→L4之间有至少 6 个三元组**（从L3的不同节点到L4的不同节点）
   - ✓ 验证每对相邻层之间的三元组数量是否充足
   - ✓ 验证连接是否覆盖了各层的不同节点
8. **内容长度检查**：
   - ✓ 确保提取的内容适合约300字的介绍
   - ✓ 避免过于冗长或过于简短的描述

## 输出格式（严格遵守）：
每行一个三元组，格式为：(概念1, 关系词, 概念2, 层级关系)

层级关系标记（只允许从高到低）：
- L1-L2: 第一层到第二层的关系（✅ 允许）
- L2-L3: 第二层到第三层的关系（✅ 允许）
- L3-L4: 第三层到第四层的关系（✅ 允许）
- ❌ 禁止L2-L1、L3-L2、L4-L3（反向，从低到高）
- ❌ 禁止L1-L3、L1-L4、L2-L4（跨层）
- ❌ 禁止L2-L2、L3-L3、L4-L4（同层）

## 关系词选择（重要：简洁且能读成完整句子）：
**关系词要简洁，不含助词（如"的"、"了"等），但能让"概念1 + 关系词 + 概念2"连读成通顺的话**

推荐关系词类型（2-4字动词短语）：
- 包含关系：包括、包含、涵盖、含有、构成
- 因果关系：导致、引发、造成、促进、推动、影响
- 层级关系：属于、分为、构成、组成
- 功能关系：用于、应用于、服务于、实现、支持
- 依赖关系：需要、基于、依赖、借助、通过

**示例说明**：
- ✓ 好："辛亥革命" + "背景包括" + "革命思想" → 读："辛亥革命背景包括革命思想"
- ✓ 好："机器学习" + "方法包括" + "神经网络" → 读："机器学习方法包括神经网络"
- ✓ 好："清政腐败" + "引发" + "民众不满" → 读："清政腐败引发民众不满"
- ✗ 差："辛亥革命" + "有" + "革命思想" → 单字动词，太简单
- ✗ 差："革命" + "的原因是" + "腐败" → 包含助词"的"

**禁止使用**：
- 单字关系词如"是"、"有"
- 包含助词的关系词如"的背景是"、"导致了"

## 概念要求：
1. 概念词必须简短（2-6个字）
2. 必须明确标注层级（L1、L2、L3）
3. 优先选择每层中最核心的概念
4. 避免重复提取相同的概念

## 层级提取示例：
假设文本为：
"辛亥革命是1911年爆发的资产阶级民主革命。它旨在推翻清朝封建专制统治，建立共和制度，实现民族独立。革命的主要特点是广泛的社会参与，涉及知识分子、新军、民众和海外华侨。革命成果包括推翻帝制、建立民国、传播民主思想、促进社会变革等。"

层级分析（四层结构）：
- L1: 辛亥革命（核心主题，1个节点）
- L2: 推翻清朝、建立共和、民族独立、社会参与（主要目标，4个节点）
- L3: 知识分子、新军、民众、海外华侨（具体参与者和要素，4个节点）
- L4: 推翻帝制、建立民国、传播民主、社会变革（具体成果，4个节点）

提取结果（必须保证每层之间有足够的连接）：

**L1→L2 连接（至少3个）**：
(辛亥革命, 旨在, 推翻清朝, L1-L2)
(辛亥革命, 目标是, 建立共和, L1-L2)
(辛亥革命, 追求, 民族独立, L1-L2)
(辛亥革命, 特点是, 社会参与, L1-L2)

**L2→L3 连接（至少4个）**：
(社会参与, 涉及, 知识分子, L2-L3)
(社会参与, 涉及, 新军, L2-L3)
(社会参与, 涉及, 民众, L2-L3)
(社会参与, 涉及, 海外华侨, L2-L3)

**L3→L4 连接（至少4个）**：
(知识分子, 推动, 传播民主, L3-L4)
(新军, 实现, 推翻帝制, L3-L4)
(民众, 促成, 社会变革, L3-L4)
(海外华侨, 支持, 建立民国, L3-L4)

## ❌ 严格禁止的提取方式：
**同层提取（绝对错误）**：
- ❌ 错误：(辛亥革命背景, 包含, 民族独立, L2-L2) - 同层提取
- ❌ 错误：(知识分子, 包含, 新军, L3-L3) - 同层提取
- ❌ 错误：(新军, 包含, 民众, L3-L3) - 同层提取
- ❌ 错误：(民众, 包含, 新军, L3-L3) - 同层提取
- ❌ 错误：(推翻清朝, 包含, 新军, L3-L3) - 同层提取

**跨层提取（绝对错误）**：
- ❌ 错误：(辛亥革命, 涉及, 知识分子, L1-L3) - 跨层提取
- ❌ 错误：(辛亥革命, 涉及, 民众, L1-L3) - 跨层提取
- ❌ 错误：(辛亥革命, 涉及, 列强侵略, L1-L3) - 跨层提取

## ✅ 正确的提取方式（从高层到低层，每层之间必须有足够的连接）：

**L1→L2 连接示例（至少3个）**：
- ✅ 正确：(辛亥革命, 旨在, 推翻清朝, L1-L2) - 从L1到L2，向下
- ✅ 正确：(辛亥革命, 目标是, 建立共和, L1-L2) - 从L1到L2，向下
- ✅ 正确：(辛亥革命, 追求, 民族独立, L1-L2) - 从L1到L2，向下
- ✅ 正确：(辛亥革命, 特点是, 社会参与, L1-L2) - 从L1到L2，向下

**L2→L3 连接示例（至少4个）**：
- ✅ 正确：(推翻清朝, 依靠, 知识分子, L2-L3) - 从L2到L3，向下
- ✅ 正确：(社会参与, 涉及, 新军, L2-L3) - 从L2到L3，向下
- ✅ 正确：(社会参与, 涉及, 民众, L2-L3) - 从L2到L3，向下
- ✅ 正确：(民族独立, 需要, 海外华侨, L2-L3) - 从L2到L3，向下

**L3→L4 连接示例（至少4个）**：
- ✅ 正确：(知识分子, 推动, 传播民主, L3-L4) - 从L3到L4，向下
- ✅ 正确：(新军, 实现, 推翻帝制, L3-L4) - 从L3到L4，向下
- ✅ 正确：(民众, 促成, 社会变革, L3-L4) - 从L3到L4，向下
- ✅ 正确：(海外华侨, 支持, 建立民国, L3-L4) - 从L3到L4，向下

## 文本内容：
${introText}

## 最终检查清单：
✓ 为每个概念明确标注层级（L1、L2、L3、L4）
✓ 🔴 严格控制每层节点数量（这是硬性约束）：
  - 🔴 **L1层：有且只有1个节点（绝对不能有第2个！）**
  - L2层：3-5个节点（最多5个，严禁第6个节点）
  - L3层：3-5个节点（最多5个，严禁第6个节点）
  - L4层：3-5个节点（最多5个，严禁第6个节点）
✓ **只能从高层到低层提取**（L1→L2、L2→L3、L3→L4）
✓ 绝对禁止同层提取（L2-L2、L3-L3、L4-L4等）
✓ 绝对禁止跨层提取（L1-L3、L1-L4、L2-L4等）
✓ **绝对禁止反向提取**（L2→L1、L3→L2、L4→L3等）
✓ L1层概念只能连接到L2层（向下）
✓ L2层概念只能连接到L3层（向下）
✓ L3层概念只能连接到L4层（向下）
✓ L4层是最底层，不能再向下
✓ 每个三元组都经过层级验证
✓ 拒绝所有L4-L4连接
✓ 拒绝所有L3-L3连接
✓ 拒绝所有L2-L2连接
✓ 拒绝所有L1-L3、L1-L4连接
✓ 拒绝所有L2-L4连接
✓ **拒绝所有L2-L1、L3-L2、L4-L3反向连接**
✓ 拒绝超出节点数量限制的连接
✓ 总共20-28个三元组
✓ 每个概念2-6个字
✓ 关系词准确，不使用"是"、"有"
✓ 层级关系标记正确（L1-L2、L2-L3、L3-L4等）
✓ **层级完整性：每一层都有至少1个节点**
✓ **⭐ 相邻层连接数量要求（最关键）：**
  - **L1→L2 之间必须有至少 4 个三元组**
  - **L2→L3 之间必须有至少 6 个三元组**
  - **L3→L4 之间必须有至少 6 个三元组**
✓ **内容长度：适合约300字的介绍**
✓ **L1→L2 之间有至少 4 个连接（覆盖L2的不同节点）**
✓ **L2→L3 之间有至少 6 个连接（覆盖L2和L3的不同节点）**
✓ **L3→L4 之间有至少 6 个连接（覆盖L3和L4的不同节点）**

## ⚠️ 输出前最后提醒：
**🔴🔴🔴 L1层有且只有1个节点！这是最关键的约束！绝对不能有第2个！**
**每层节点数量上限是5个，这是硬性约束！**
- 🔴 L1层只能有1个节点，第2个必须拒绝
- L2层最多5个节点，第6个必须拒绝
- L3层最多5个节点，第6个必须拒绝
- L4层最多5个节点，第6个必须拒绝

请开始输出三元组（记住：🔴**L1层只能有1个节点！**，只能从高层到低层提取，绝对禁止反向、同层和跨层提取，L1→L2、L2→L3、L3→L4单向流动，**L2/L3/L4每层最多5个节点，严禁超过！**，**确保每个相邻层之间都有足够的三元组连接（L1→L2至少4个，L2→L3至少6个，L3→L4至少6个）**，内容适合约300字介绍）：`;
    }
    
}

/**
 * 概念图生成服务
 */
class ConceptMapGenerationService {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * 生成概念图
     * @param {string} type - 生成类型 ('keyword' 或 'description')
     * @param {Object} data - 输入数据
     * @returns {Promise<Object>} 生成结果
     */
    async generateConceptMap(type, data) {
        console.log('🗺️ 开始生成概念图，类型:', type, '数据:', data);
        
        try {
            // 静默更新API地址（不打印日志，除非端口变化）
            this.config.updateApiUrl();
            
            // 构建概念图生成提示词
            const conceptPrompt = this.buildConceptPrompt(type, data);
            
            let conceptResponse;
            
            if (type === 'keyword') {
                // 焦点问题模式：只调用概念图生成API，直接生成节点和关系
                console.log('准备发送焦点问题生成请求...');
                console.log('请求URL:', `${this.config.API_BASE_URL}/chat`);
                console.log('请求内容:', conceptPrompt.substring(0, 100) + '...');
                
                // 创建一个带超时的fetch请求
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 50000); // 50秒超时
                
                try {
                    conceptResponse = await fetch(`${this.config.API_BASE_URL}/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: conceptPrompt }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        throw new Error('请求超时（50秒），请稍后重试');
                    }
                    throw error;
                }
                
                console.log('概念图生成API响应状态:', conceptResponse.status);
            } else {
                // 文本分析模式：只调用概念图生成API，不生成介绍内容
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 50000); // 50秒超时
                
                try {
                    conceptResponse = await fetch(`${this.config.API_BASE_URL}/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: conceptPrompt }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        throw new Error('请求超时（50秒），请稍后重试');
                    }
                    throw error;
                }
            }
            
            const conceptResult = await conceptResponse.json();
            console.log('概念图生成API响应结果:', conceptResult);
            
            // 处理概念图生成结果
            if (conceptResult.success) {
                console.log('概念图生成成功，开始解析JSON...');
                try {
                    const content = conceptResult.response;
                    const startIdx = content.indexOf('{');
                    const endIdx = content.lastIndexOf('}') + 1;
                    
                    if (startIdx !== -1 && endIdx !== -1) {
                        const jsonContent = content.substring(startIdx, endIdx);
                        const conceptData = JSON.parse(jsonContent);
                        
                        // 提取JSON前后的AI描述文本
                        const beforeJson = content.substring(0, startIdx).trim();
                        const afterJson = content.substring(endIdx).trim();
                        const aiDescription = (beforeJson + ' ' + afterJson).trim();
                        
                        return {
                            success: true,
                            data: conceptData,
                            aiResponse: content, // 保存完整的AI响应
                            aiDescription: aiDescription, // AI的描述文本
                            message: '概念图生成成功！'
                        };
                    } else {
                        throw new Error('响应中未找到有效的JSON数据');
                    }
                } catch (parseError) {
                    console.error('JSON解析失败:', parseError);
                    return {
                        success: false,
                        error: '概念图数据解析失败',
                        message: '概念图数据解析失败'
                    };
                }
            } else {
                let errorMessage = '未知错误';
                if (conceptResult.error) {
                    if (conceptResult.error.includes('timeout') || conceptResult.error.includes('超时')) {
                        errorMessage = 'AI服务响应超时，请稍后重试';
                    } else if (conceptResult.error.includes('HTTPSConnectionPool')) {
                        errorMessage = 'AI服务连接超时，请检查网络或稍后重试';
                    } else {
                        errorMessage = conceptResult.error;
                    }
                }
                
                return {
                    success: false,
                    error: errorMessage,
                    message: `概念图生成失败: ${errorMessage}`
                };
            }
            
        } catch (error) {
            console.error('请求失败:', error);
            return {
                success: false,
                error: error.message,
                message: '网络请求失败，请检查后端服务是否启动'
            };
        }
    }
    
    /**
     * 构建概念图生成提示词（三层结构版本）
     * @param {string} type - 生成类型
     * @param {Object} data - 输入数据
     * @returns {string} 提示词
     */
    buildConceptPrompt(type, data) {
        if (type === 'keyword') {
            return `# 任务
请为焦点问题"${data.keyword}"生成一个四层结构的概念图，以JSON格式输出。

## ⚠️ 严格数量限制（必须遵守）：
- **总节点数：13-17个**
- **第一层（L1）**：必须且只有1个节点（焦点问题本身）
- **第二层（L2）**：必须4-5个节点（不能少于4个，不能多于5个）
- **第三层（L3）**：必须4-5个节点（不能少于4个，不能多于5个）
- **第四层（L4）**：必须4-5个节点（不能少于4个，不能多于5个）

# JSON格式示例（13个节点）
{
  "nodes": [
    {"id": "1", "label": "${data.keyword}", "type": "main", "description": "第一层核心节点", "importance": 10, "layer": 1},
    {"id": "2", "label": "核心概念1", "type": "core", "description": "第二层核心概念", "importance": 8, "layer": 2},
    {"id": "3", "label": "核心概念2", "type": "core", "description": "第二层核心概念", "importance": 8, "layer": 2},
    {"id": "4", "label": "核心概念3", "type": "core", "description": "第二层核心概念", "importance": 8, "layer": 2},
    {"id": "5", "label": "核心概念4", "type": "core", "description": "第二层核心概念", "importance": 8, "layer": 2},
    {"id": "6", "label": "扩展概念1", "type": "detail", "description": "第三层扩展概念", "importance": 6, "layer": 3},
    {"id": "7", "label": "扩展概念2", "type": "detail", "description": "第三层扩展概念", "importance": 6, "layer": 3},
    {"id": "8", "label": "扩展概念3", "type": "detail", "description": "第三层扩展概念", "importance": 6, "layer": 3},
    {"id": "9", "label": "扩展概念4", "type": "detail", "description": "第三层扩展概念", "importance": 6, "layer": 3},
    {"id": "10", "label": "细化概念1", "type": "detail", "description": "第四层细化概念", "importance": 4, "layer": 4},
    {"id": "11", "label": "细化概念2", "type": "detail", "description": "第四层细化概念", "importance": 4, "layer": 4},
    {"id": "12", "label": "细化概念3", "type": "detail", "description": "第四层细化概念", "importance": 4, "layer": 4},
    {"id": "13", "label": "细化概念4", "type": "detail", "description": "第四层细化概念", "importance": 4, "layer": 4}
  ],
  "links": [
    {"source": "1", "target": "2", "label": "方面包括", "type": "relation", "strength": 8},
    {"source": "1", "target": "3", "label": "方面包括", "type": "relation", "strength": 8},
    {"source": "1", "target": "4", "label": "方面包括", "type": "relation", "strength": 8},
    {"source": "1", "target": "5", "label": "方面包括", "type": "relation", "strength": 8},
    {"source": "2", "target": "6", "label": "内容包括", "type": "relation", "strength": 6},
    {"source": "2", "target": "7", "label": "内容包括", "type": "relation", "strength": 6},
    {"source": "3", "target": "8", "label": "导致", "type": "relation", "strength": 6},
    {"source": "4", "target": "9", "label": "促进", "type": "relation", "strength": 6},
    {"source": "6", "target": "10", "label": "涉及", "type": "relation", "strength": 4},
    {"source": "7", "target": "11", "label": "涉及", "type": "relation", "strength": 4},
    {"source": "8", "target": "12", "label": "包含", "type": "relation", "strength": 4},
    {"source": "9", "target": "13", "label": "包含", "type": "relation", "strength": 4}
  ],
  "metadata": {"keyword": "${data.keyword}", "summary": "概念图摘要", "domain": "领域"}
}

# 重要说明
- **总节点数必须是13-17个**（包括焦点问题节点）
- 第一层只有1个节点（焦点问题）
- **第二层必须4-5个节点（不能少于4个，不能多于5个）**
- **第三层必须4-5个节点（不能少于4个，不能多于5个）**
- **第四层必须4-5个节点（不能少于4个，不能多于5个）**
- 节点label要简洁（2-6字），避免过长
- **关系label必须简洁且能读成完整句子**：不含助词（如"的"、"了"），但能让"源节点 + 关系词 + 目标节点"连读通顺
  - ✓ 好："人工智能" + "领域包括" + "机器学习" = "人工智能领域包括机器学习"
  - ✓ 好："辛亥革命" + "背景包括" + "清政腐败" = "辛亥革命背景包括清政腐败"
  - ✓ 好："清政腐败" + "引发" + "民众不满" = "清政腐败引发民众不满"
  - ✗ 差：单字关系词如"是"、"有"
  - ✗ 差：包含助词如"的背景是"、"导致了"
- 推荐关系词（2-4字动词短语）：包括、包含、涵盖、导致、引发、促进、推动、应用于、基于、需要等
- 必须包含layer属性（1、2或3）
- 确保JSON格式正确，可直接解析

## 最终检查清单：
✓ nodes数组长度为13-17个
✓ layer=1的节点只有1个
✓ layer=2的节点必须4-5个（不能少于4个，不能多于5个）
✓ layer=3的节点必须4-5个（不能少于4个，不能多于5个）
✓ layer=4的节点必须4-5个（不能少于4个，不能多于5个）
✓ 每个节点都有layer属性

请直接输出JSON，不要有其他解释文字。`;
        } else {
            return `分析文本提取四层结构概念图JSON：
${data.description}

## ⚠️ 严格数量限制：
- **总节点数：13-16个**
- 第一层：1个节点（核心概念）
- 第二层：4-5个节点（最核心的分类）
- 第三层：4-5个节点（具体细节）
- 第四层：4-5个节点（更细化的细节）

格式：
{
  "nodes": [
    {"id": "1", "label": "核心概念", "type": "main", "description": "描述", "importance": 10, "layer": 1},
    {"id": "2", "label": "核心概念1", "type": "core", "description": "描述", "importance": 8, "layer": 2},
    {"id": "3", "label": "核心概念2", "type": "core", "description": "描述", "importance": 8, "layer": 2},
    {"id": "4", "label": "核心概念3", "type": "core", "description": "描述", "importance": 8, "layer": 2},
    {"id": "5", "label": "核心概念4", "type": "core", "description": "描述", "importance": 8, "layer": 2},
    {"id": "6", "label": "扩展概念1", "type": "detail", "description": "描述", "importance": 6, "layer": 3},
    {"id": "7", "label": "扩展概念2", "type": "detail", "description": "描述", "importance": 6, "layer": 3},
    {"id": "8", "label": "扩展概念3", "type": "detail", "description": "描述", "importance": 6, "layer": 3},
    {"id": "9", "label": "扩展概念4", "type": "detail", "description": "描述", "importance": 6, "layer": 3},
    {"id": "10", "label": "细化概念1", "type": "detail", "description": "描述", "importance": 4, "layer": 4},
    {"id": "11", "label": "细化概念2", "type": "detail", "description": "描述", "importance": 4, "layer": 4},
    {"id": "12", "label": "细化概念3", "type": "detail", "description": "描述", "importance": 4, "layer": 4},
    {"id": "13", "label": "细化概念4", "type": "detail", "description": "描述", "importance": 4, "layer": 4}
  ],
  "links": [
    {"source": "1", "target": "2", "label": "方面包括", "type": "relation", "strength": 8},
    {"source": "2", "target": "6", "label": "内容包括", "type": "relation", "strength": 6},
    {"source": "6", "target": "10", "label": "涉及", "type": "relation", "strength": 4}
  ],
  "metadata": {"summary": "概要", "domain": "领域", "keyInsights": "洞察"}
}

要求：
- 总共13-16个概念（nodes数组长度13-16）
- 必须包含layer属性（1、2、3或4）
- **关系词要简洁且能读成完整句子**：不含助词（如"的"、"了"），使用2-4字动词短语
  - 推荐：包括、包含、涵盖、导致、引发、促进、推动、应用于、基于、需要等
  - 禁止：单字关系词如"是"、"有"
  - 禁止：包含助词如"的背景是"、"导致了"
- 节点label简洁（2-6字）`;
        }
    }
}

/**
 * 大模型交互管理器
 */
class LLMManager {
    constructor() {
        this.config = new LLMConfig();
        
        // 初始化内置服务
        this.tripleService = new TripleExtractionService(this.config);
        this.conceptMapService = new ConceptMapGenerationService(this.config);
        
        // 介绍文本服务（独立模块，可选依赖）
        if (typeof IntroductionTextService !== 'undefined') {
            this.introService = new IntroductionTextService(this.config.API_BASE_URL);
        } else {
            console.warn('IntroductionTextService 未加载，请确保引入 introduction-service.js');
        }
        
        // 焦点问题提取服务（独立模块，可选依赖）
        if (typeof FocusQuestionService !== 'undefined') {
            this.focusQuestionService = new FocusQuestionService(this.config.API_BASE_URL);
        } else {
            console.warn('FocusQuestionService 未加载，请确保引入 focus-question-service.js');
        }
    }
    
    /**
     * 初始化
     */
    init() {
        // 页面加载时更新API地址（首次强制打印日志）
        this.config.updateApiUrl(true);
        
        // 监听端口变化事件
        window.addEventListener('portChanged', (event) => {
            console.log(`📡 检测到端口变化事件: ${event.detail.port}`);
            // 端口变化时会自动检测并打印警告
            this.config.updateApiUrl(true);
            
            // 更新独立服务的API地址
            if (this.introService) {
                this.introService.apiBaseUrl = this.config.API_BASE_URL;
            }
            if (this.focusQuestionService) {
                this.focusQuestionService.apiBaseUrl = this.config.API_BASE_URL;
            }
        });
    }
    
    /**
     * 生成介绍文本（流式）
     * @param {string} keyword - 关键词
     * @param {Function} onChunk - 接收文本片段的回调函数
     * @returns {Promise<Object>} 生成结果
     */
    async generateIntroduction(keyword, onChunk) {
        if (!this.introService) {
            return {
                success: false,
                error: 'IntroductionTextService 未加载',
                message: '介绍文本生成服务未初始化'
            };
        }
        return await this.introService.generateIntroduction(keyword, onChunk);
    }
    
    /**
     * 提取三元组
     * @param {string} introText - 输入文本
     * @returns {Promise<Object>} 提取结果
     */
    async extractTriples(introText) {
        return await this.tripleService.extractTriplesFromIntro(introText);
    }
    
    /**
     * 生成概念图
     * @param {string} type - 生成类型
     * @param {Object} data - 输入数据
     * @returns {Promise<Object>} 生成结果
     */
    async generateConceptMap(type, data) {
        return await this.conceptMapService.generateConceptMap(type, data);
    }
    
    /**
     * 提取焦点问题（从文本中）
     * @param {string} text - 用户输入的文本内容
     * @returns {Promise<Object>} 提取结果 {success, focusQuestion, message}
     */
    async extractFocusQuestion(text) {
        if (!this.focusQuestionService) {
            return {
                success: false,
                error: 'FocusQuestionService 未加载',
                message: '焦点问题提取服务未初始化'
            };
        }
        return await this.focusQuestionService.extractFocusQuestion(text);
    }
}

// 创建全局实例
window.llmManager = new LLMManager();

// 导出类供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LLMConfig,
        TripleExtractionService,
        ConceptMapGenerationService,
        LLMManager
    };
}
