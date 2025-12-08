// 概念图自动生成系统 - 核心模块
// 包含: DOM初始化、事件绑定、应用初始化、概念图生成

//=============================================================================
// 全局变量定义
//=============================================================================

// 当前概念图数据
window.currentGraphData = null;
window.isGenerating = false;

// 节点选中和拖动相关变量
window.selectedNodeId = null;
window.selectedLinkId = null;
window.isAllNodesSelected = false; // 标记是否全选所有节点
window.isDragging = false;
window.dragStartX = 0;
window.dragStartY = 0;
window.dragOriginalNodeX = 0;
window.dragOriginalNodeY = 0;

// 操作历史记录
window.operationHistory = [];
window.currentHistoryIndex = -1;
window.maxHistorySize = 20;

//=============================================================================
// 应用初始化函数
//=============================================================================

function cleanup() {
    // 移除全局拖动事件监听器
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // 恢复页面样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
}

function initializePage() {
    console.log('开始初始化页面...');
    
    // 禁用导出按钮（初始状态）
    if (window.exportBtn) {
        window.exportBtn.disabled = true;
        console.log('导出按钮已禁用');
    } else {
        console.error('exportBtn 元素未找到');
    }
    
    // 编辑工具栏现在在control-bar中，不需要单独设置
    
    // 添加示例数据提示
    if (window.keywordInput) {
        window.keywordInput.placeholder = '人工智能的背景';
        console.log('关键词输入框占位符已设置');
    } else {
        console.error('keywordInput 元素未找到');
    }
    
    if (window.descriptionTextarea) {
        window.descriptionTextarea.placeholder = '例如：人工智能是计算机科学的一个分支，致力于开发能够执行通常需要人类智能的任务的系统...';
        console.log('描述文本框占位符已设置');
    } else {
        console.error('descriptionTextarea 元素未找到');
    }
    
    // 初始化状态栏
    updateStatusBar({ nodes: [], links: [] });
    console.log('状态栏已初始化');
    
    // 初始化历史记录按钮
    updateHistoryButtons();
    console.log('历史记录按钮已初始化');
    
    // 初始化节点操作按钮状态
    updateNodeOperationButtons();
    console.log('节点操作按钮状态已初始化');
    
    showMessage('欢迎使用概念图自动生成系统！您可以直接使用右侧工具栏创建概念图，或使用AI生成', 'info');
    console.log('页面初始化完成');
}

function displayUploadedImage(imageData, fileName) {
    console.log('开始显示上传的图片:', fileName);
    
    // 隐藏占位符
    if (window.graphPlaceholder) {
        window.graphPlaceholder.style.display = 'none';
    }
    
    // 显示概念图展示区域
    const conceptMapDisplay = document.querySelector('.concept-map-display');
    if (conceptMapDisplay) {
        conceptMapDisplay.style.display = 'block';
    }
    
    // 更新当前流程文本
    if (window.processText) {
        window.processText.innerHTML = `
            <div style="padding: 15px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">📤 概念图评价流程</h4>
                <p style="margin: 5px 0;"><strong>当前操作：</strong>上传概念图图片</p>
                <p style="margin: 5px 0;"><strong>文件名：</strong>${fileName}</p>
                <p style="margin: 5px 0; color: #667eea;">✨ 正在调用AI进行专业评价分析...</p>
            </div>
        `;
    }
    
    // 清空并更新SVG画布，显示上传的图片
    const graphCanvas = document.querySelector('.graph-canvas-fullwidth') || document.querySelector('.graph-canvas');
    if (graphCanvas) {
        // 清空原有内容
        graphCanvas.innerHTML = '';
        
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            width: 100%;
            height: 1200px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
            overflow: auto;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = fileName;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        imageContainer.appendChild(img);
        graphCanvas.appendChild(imageContainer);
    }
    
    // 显示加载中的评价信息
    if (window.aiIntroText) {
        window.aiIntroText.innerHTML = `
            <div style="padding: 15px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">🤖 AI评价分析</h4>
                <div style="text-align: center; padding: 30px 0;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #666;">正在分析概念图，请稍候...</p>
                    <p style="margin-top: 5px; font-size: 12px; color: #999;">使用阿里云百炼 qwen3-vl-plus 模型</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
    
    console.log('图片显示完成，开始调用AI评价服务...');
    
    // 自动调用AI评价服务
    analyzeUploadedConceptMap(imageData, fileName);
}

/**
 * 探查迷思概念
 * @param {string} topic - 知识点
 */
async function exploreMisconception(topic) {
    console.log('开始探查迷思概念...');
    
    try {
        // 检查服务是否可用
        if (!window.DifyService || !window.MisconceptionService) {
            throw new Error('Dify 服务或迷思概念服务未加载');
        }
        
        // 从环境变量或配置中获取 Dify API 配置
        // 注意：在实际应用中，这些配置应该从后端获取或通过环境变量设置
        const difyApiBaseUrl = 'http://101.42.231.179/v1'; // 可以从后端API获取
        const difyApiKey = 'app-4DGFRXExxcP0xZ5Og3AXfT2N'; // 应该从后端安全获取
        
        // 创建 Dify 服务实例
        const difyService = new window.DifyService(difyApiBaseUrl, difyApiKey);
        
        // 创建迷思概念服务实例
        const misconceptionService = new window.MisconceptionService(difyService);
        
        // 清除之前的内容
        clearPreviousConceptMap();
        
        // 显示概念图展示区域
        const conceptMapDisplay = document.querySelector('.concept-map-display');
        if (conceptMapDisplay) {
            conceptMapDisplay.style.display = 'flex';
        }
        
        // 隐藏占位符
        if (window.graphPlaceholder) {
            window.graphPlaceholder.style.display = 'none';
        }
        
        // 更新流程状态
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🔬 迷思概念探查</h4>
                    <p style="margin: 5px 0;"><strong>当前操作：</strong>正在分析知识点并探查迷思概念...</p>
                    <p style="margin: 5px 0;"><strong>知识点：</strong>${topic}</p>
                    <p style="margin: 5px 0; color: #667eea;">✨ AI正在分析相关的迷思概念...</p>
                </div>
            `;
        }
        
        // 显示文本内容区域
        if (window.aiIntroText) {
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🤖 AI分析过程</h4>
                    <div style="text-align: center; padding: 30px 0;">
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 15px; color: #666;">正在探查迷思概念，请稍候...</p>
                        <p style="margin-top: 5px; font-size: 12px; color: #999;">使用 Dify AI 平台</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        // 初始化响应文本
        let fullResponseText = '';
        
        // 定义回调函数
        const onChunk = (content) => {
            // 累积内容
            fullResponseText += content;
            
            // 实时更新显示
            if (window.aiIntroText) {
                const displayText = fullResponseText.length > 2000 
                    ? fullResponseText.substring(0, 2000) + '...' 
                    : fullResponseText;
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">🔬 迷思概念探查结果 <span style="color: #28a745; font-size: 14px;">⚡ 生成中...</span></h4>
                        <div style="line-height: 1.8; color: #333; font-size: 14px;">
                            <div style="white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 500px; overflow-y: auto;">${displayText}</div>
                        </div>
                    </div>
                `;
            }
        };
        
        const onComplete = (result) => {
            console.log('✅ 迷思概念探查完成:', result);
            
            // 更新流程状态，添加一键生成思维导图按钮
            if (window.processText) {
                window.processText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 10px;">🔬 迷思概念探查</h4>
                        <p style="margin: 5px 0;"><strong>当前操作：</strong>探查完成</p>
                        <p style="margin: 5px 0;"><strong>知识点：</strong>${topic}</p>
                        <p style="margin: 5px 0; color: #28a745;">✅ 迷思概念探查已完成</p>
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <button id="generateConceptMapFromMisconceptionBtn" class="btn btn-primary" style="width: 100%;">
                                🗺️ 一键生成思维导图
                            </button>
                            <p style="margin-top: 8px; font-size: 12px; color: #999; text-align: center;">
                                基于探查结果生成概念图
                            </p>
                        </div>
                    </div>
                `;
                
                // 绑定按钮点击事件
                const generateBtn = document.getElementById('generateConceptMapFromMisconceptionBtn');
                if (generateBtn) {
                    generateBtn.addEventListener('click', function() {
                        console.log('点击一键生成思维导图按钮');
                        
                        // 检查是否正在生成
                        if (isGenerating) {
                            showMessage('正在生成中，请稍候...', 'warning');
                            return;
                        }
                        
                        // 禁用按钮
                        generateBtn.disabled = true;
                        generateBtn.textContent = '生成中...';
                        generateBtn.classList.add('loading');
                        
                        // 调用文本生成概念图功能
                        console.log('开始基于迷思概念内容生成概念图，内容长度:', fullResponseText.length);
                        
                        // 保存按钮引用到全局，以便在生成完成后恢复
                        window.misconceptionGenerateBtn = generateBtn;
                        
                        // 调用生成函数
                        generateConceptMapWithLLM('description', { description: fullResponseText })
                            .then(() => {
                                // 生成完成后恢复按钮状态
                                if (window.misconceptionGenerateBtn) {
                                    window.misconceptionGenerateBtn.disabled = false;
                                    window.misconceptionGenerateBtn.textContent = '🗺️ 一键生成思维导图';
                                    window.misconceptionGenerateBtn.classList.remove('loading');
                                    window.misconceptionGenerateBtn = null;
                                }
                            })
                            .catch((error) => {
                                console.error('生成概念图失败:', error);
                                // 即使失败也要恢复按钮状态
                                if (window.misconceptionGenerateBtn) {
                                    window.misconceptionGenerateBtn.disabled = false;
                                    window.misconceptionGenerateBtn.textContent = '🗺️ 一键生成思维导图';
                                    window.misconceptionGenerateBtn.classList.remove('loading');
                                    window.misconceptionGenerateBtn = null;
                                }
                            });
                    });
                }
            }
            
            // 显示最终结果
            if (window.aiIntroText) {
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">🔬 迷思概念探查结果</h4>
                        <div style="line-height: 1.8; color: #333; font-size: 14px;">
                            <div style="white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 500px; overflow-y: auto;">${fullResponseText}</div>
                        </div>
                    </div>
                `;
            }
            
            // 恢复按钮状态
            if (window.exploreMisconceptionBtn) {
                window.exploreMisconceptionBtn.classList.remove('loading');
                window.exploreMisconceptionBtn.textContent = '探查迷思概念';
                window.exploreMisconceptionBtn.disabled = false;
            }
            
            showMessage('迷思概念探查完成！', 'success');
        };
        
        const onError = (error) => {
            console.error('❌ 迷思概念探查失败:', error);
            
            // 显示错误信息
            if (window.aiIntroText) {
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 探查失败</h4>
                        <p style="color: #666; margin: 10px 0;">${error.message || '未知错误'}</p>
                        <p style="color: #999; font-size: 14px; margin-top: 15px;">请检查：</p>
                        <ul style="color: #999; font-size: 14px; margin: 5px 0; padding-left: 20px;">
                            <li>网络连接是否正常</li>
                            <li>Dify API 服务是否可用</li>
                            <li>API 密钥是否正确配置</li>
                        </ul>
                    </div>
                `;
            }
            
            // 更新流程状态
            if (window.processText) {
                window.processText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #e74c3c; margin-bottom: 10px;">🔬 迷思概念探查</h4>
                        <p style="margin: 5px 0;"><strong>当前操作：</strong>探查失败</p>
                        <p style="margin: 5px 0;"><strong>知识点：</strong>${topic}</p>
                        <p style="margin: 5px 0; color: #e74c3c;">❌ ${error.message || '探查失败'}</p>
                    </div>
                `;
            }
            
            // 恢复按钮状态
            if (window.exploreMisconceptionBtn) {
                window.exploreMisconceptionBtn.classList.remove('loading');
                window.exploreMisconceptionBtn.textContent = '探查迷思概念';
                window.exploreMisconceptionBtn.disabled = false;
            }
            
            showMessage('迷思概念探查失败: ' + (error.message || '未知错误'), 'error');
        };
        
        // 调用服务探查迷思概念
        await misconceptionService.exploreMisconception(topic, onChunk, onComplete, onError);
        
    } catch (error) {
        console.error('❌ 调用迷思概念探查服务时发生错误:', error);
        
        // 显示错误信息
        if (window.aiIntroText) {
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 系统错误</h4>
                    <p style="color: #666; margin: 10px 0;">${error.message}</p>
                    <p style="color: #999; font-size: 14px; margin-top: 15px;">请确保服务已正确加载。</p>
                </div>
            `;
        }
        
        // 恢复按钮状态
        if (window.exploreMisconceptionBtn) {
            window.exploreMisconceptionBtn.classList.remove('loading');
            window.exploreMisconceptionBtn.textContent = '探查迷思概念';
            window.exploreMisconceptionBtn.disabled = false;
        }
        
        showMessage('系统错误: ' + error.message, 'error');
    }
}

/**
 * 生成高支架概念图
 * @param {string} focusQuestion - 焦点问题
 */
async function generateHighScaffoldConceptMap(focusQuestion) {
    console.log('开始生成高支架概念图...', { focusQuestion });
    
    if (isGenerating) {
        console.log('正在生成中，忽略重复请求');
        return;
    }
    
    isGenerating = true;
    
    try {
        // 清除之前的概念图内容
        clearPreviousConceptMap();
        
        // 显示概念图展示区域
        const conceptMapDisplay = document.querySelector('.concept-map-display');
        if (conceptMapDisplay) {
            conceptMapDisplay.style.display = 'flex';
            // 设置为高支架模式布局（左右分栏）
            conceptMapDisplay.classList.add('scaffold-mode');
        }
        
        // 隐藏占位符
        if (window.graphPlaceholder) {
            window.graphPlaceholder.style.display = 'none';
        }
        
        // 显示加载状态
        showLoadingAnimation();
        
        // 更新流程状态
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🗺️ 高支架概念图生成</h4>
                    <p style="margin: 5px 0;"><strong>当前操作：</strong>正在生成完整概念图...</p>
                    <p style="margin: 5px 0;"><strong>焦点问题：</strong>${focusQuestion}</p>
                    <p style="margin: 5px 0; color: #667eea;">✨ AI正在生成概念图...</p>
                </div>
            `;
        }
        
        // 步骤1：生成介绍文本（用于提取三元组）
        console.log('=== 步骤1：生成介绍文本 ===');
        let introText = '';
        const introResult = await window.llmManager.generateIntroduction(
            focusQuestion,
            (chunk) => {
                introText += chunk;
            }
        );
        
        if (!introResult || !introResult.success) {
            throw new Error(introResult?.message || '介绍文本生成失败');
        }
        
        introText = introResult.text || introText;
        console.log('介绍文本生成完成，长度:', introText.length);
        
        // 显示生成的介绍文本到文本内容展示区域
        if (window.aiIntroText) {
            const displayText = introText.length > 2000 
                ? introText.substring(0, 2000) + '...' 
                : introText;
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 15px;">📝 AI生成的介绍文本</h4>
                    <div style="line-height: 1.8; color: #333; font-size: 14px;">
                        <div style="white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 500px; overflow-y: auto;">${displayText}</div>
                    </div>
                </div>
            `;
        }
        
        // 步骤2：提取三元组
        console.log('=== 步骤2：提取三元组 ===');
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🗺️ 高支架概念图生成</h4>
                    <p style="margin: 5px 0;"><strong>当前操作：</strong>正在提取三元组...</p>
                    <p style="margin: 5px 0;"><strong>焦点问题：</strong>${focusQuestion}</p>
                </div>
            `;
        }
        
        const triplesResult = await window.llmManager.extractTriples(introText);
        if (!triplesResult || !triplesResult.success || !triplesResult.triples) {
            throw new Error(triplesResult?.message || '三元组提取失败');
        }
        
        const triples = triplesResult.triples;
        console.log('三元组提取完成，数量:', triples.length);
        
        // 步骤3：转换为概念图数据
        console.log('=== 步骤3：转换为概念图数据 ===');
        const fullConceptData = window.convertTriplesToConceptData(triples);
        console.log('概念图数据转换完成:', fullConceptData);
        
        // 保存完整的概念图数据（作为专家图）
        window.expertConceptMapData = JSON.parse(JSON.stringify(fullConceptData));
        
        // 步骤4：移除部分节点到待选概念区
        console.log('=== 步骤4：移除部分节点到待选概念区 ===');
        const { incompleteGraph, candidateNodes } = removeNodesForScaffold(fullConceptData);
        
        // 保存待完成的概念图数据
        window.currentGraphData = incompleteGraph;
        
        // 保存待选节点
        window.scaffoldCandidateNodes = candidateNodes;
        
        // 步骤5：渲染待完成的概念图（右侧）
        console.log('=== 步骤5：渲染待完成的概念图 ===');
        setupScaffoldLayout();
        
        // 应用布局算法到待完成的概念图
        const selectedLayout = window.layoutSelect ? window.layoutSelect.value : 'hierarchical';
        let layoutAppliedGraph = incompleteGraph;
        
        try {
            if (selectedLayout === 'hierarchical' && typeof window.applySugiyamaLayout === 'function') {
                layoutAppliedGraph = window.applySugiyamaLayout(incompleteGraph);
            } else if (selectedLayout === 'force' && typeof window.applyForceDirectedLayout === 'function') {
                layoutAppliedGraph = window.applyForceDirectedLayout(incompleteGraph, {
                    width: 2400,
                    height: 1200,
                    iterations: 300,
                    coolingFactor: 0.95,
                    linkDistance: 100,
                    nodeCharge: -300,
                    nodeSpacing: 60
                });
            }
        } catch (error) {
            console.error('布局算法应用失败:', error);
        }
        
        displayIncompleteConceptMap(layoutAppliedGraph);
        displayCandidateNodes(candidateNodes);
        
        // 更新流程状态
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🗺️ 高支架概念图生成</h4>
                    <p style="margin: 5px 0;"><strong>当前操作：</strong>生成完成，请将待选概念添加到概念图中</p>
                    <p style="margin: 5px 0;"><strong>焦点问题：</strong>${focusQuestion}</p>
                    <p style="margin: 5px 0; color: #28a745;">✅ 已生成概念图，${candidateNodes.length}个待选概念</p>
                </div>
            `;
        }
        
        // 恢复按钮状态
        if (window.generateScaffoldConceptMapBtn) {
            window.generateScaffoldConceptMapBtn.classList.remove('loading');
            window.generateScaffoldConceptMapBtn.textContent = '生成支架概念图';
            window.generateScaffoldConceptMapBtn.disabled = false;
        }
        
        isGenerating = false;
        showMessage('高支架概念图生成完成！', 'success');
        
    } catch (error) {
        console.error('❌ 生成高支架概念图失败:', error);
        
        // 恢复按钮状态
        if (window.generateScaffoldConceptMapBtn) {
            window.generateScaffoldConceptMapBtn.classList.remove('loading');
            window.generateScaffoldConceptMapBtn.textContent = '生成支架概念图';
            window.generateScaffoldConceptMapBtn.disabled = false;
        }
        
        isGenerating = false;
        showMessage('生成失败: ' + (error.message || '未知错误'), 'error');
    }
}

/**
 * 从完整概念图中移除部分节点，用于支架模式
 * @param {Object} fullGraphData - 完整的概念图数据
 * @returns {Object} { incompleteGraph, candidateNodes }
 */
function removeNodesForScaffold(fullGraphData) {
    const nodes = [...fullGraphData.nodes];
    const links = [...fullGraphData.links];
    
    // 计算要移除的节点数量（移除约30-40%的节点）
    const removeCount = Math.max(1, Math.floor(nodes.length * 0.35));
    
    // 优先移除中间层级的节点（L2、L3），保留L1和部分L2
    const nodesByLayer = {};
    nodes.forEach(node => {
        const layer = node.layer || 1;
        if (!nodesByLayer[layer]) {
            nodesByLayer[layer] = [];
        }
        nodesByLayer[layer].push(node);
    });
    
    // 选择要移除的节点
    const nodesToRemove = [];
    const nodeIdsToRemove = new Set();
    
    // 优先从L2和L3层选择节点
    const layers = Object.keys(nodesByLayer).map(Number).sort((a, b) => a - b);
    let remainingCount = removeCount;
    
    for (const layer of layers) {
        if (layer === 1) continue; // 保留L1层节点
        
        const layerNodes = nodesByLayer[layer];
        const takeCount = Math.min(remainingCount, Math.floor(layerNodes.length * 0.5));
        
        // 随机选择节点
        const shuffled = [...layerNodes].sort(() => Math.random() - 0.5);
        for (let i = 0; i < takeCount && i < shuffled.length; i++) {
            nodesToRemove.push(shuffled[i]);
            nodeIdsToRemove.add(shuffled[i].id);
            remainingCount--;
        }
        
        if (remainingCount <= 0) break;
    }
    
    // 如果还需要移除更多节点，从L2层继续
    if (remainingCount > 0 && nodesByLayer[2]) {
        const layer2Nodes = nodesByLayer[2].filter(n => !nodeIdsToRemove.has(n.id));
        const shuffled = [...layer2Nodes].sort(() => Math.random() - 0.5);
        for (let i = 0; i < remainingCount && i < shuffled.length; i++) {
            nodesToRemove.push(shuffled[i]);
            nodeIdsToRemove.add(shuffled[i].id);
        }
    }
    
    // 创建待完成的概念图（移除选中的节点及其相关连线）
    const incompleteNodes = nodes.filter(node => !nodeIdsToRemove.has(node.id));
    // 只保留两端节点都存在的连接
    const incompleteLinks = links.filter(link => {
        const sourceExists = !nodeIdsToRemove.has(link.source);
        const targetExists = !nodeIdsToRemove.has(link.target);
        return sourceExists && targetExists;
    });
    
    const incompleteGraph = {
        nodes: incompleteNodes,
        links: incompleteLinks
    };
    
    console.log(`待完成概念图: ${incompleteNodes.length} 个节点, ${incompleteLinks.length} 条连接`);
    
    // 待选节点（移除的节点）
    const candidateNodes = nodesToRemove.map(node => ({
        id: node.id,
        label: node.label,
        layer: node.layer,
        type: node.type,
        description: node.description,
        importance: node.importance
    }));
    
    console.log(`移除了 ${candidateNodes.length} 个节点到待选概念区`);
    console.log('待选节点:', candidateNodes.map(n => n.label));
    
    return { incompleteGraph, candidateNodes };
}

/**
 * 设置支架模式的布局（左右分栏）
 */
function setupScaffoldLayout() {
    const conceptMapDisplay = document.querySelector('.concept-map-display');
    if (!conceptMapDisplay) return;
    
    // 创建左右分栏布局
    let scaffoldContainer = conceptMapDisplay.querySelector('.scaffold-container');
    if (!scaffoldContainer) {
        scaffoldContainer = document.createElement('div');
        scaffoldContainer.className = 'scaffold-container';
        scaffoldContainer.style.cssText = 'display: flex; width: 100%; height: 100%; gap: 20px;';
        
        // 清空原有内容
        conceptMapDisplay.innerHTML = '';
        conceptMapDisplay.appendChild(scaffoldContainer);
    }
    
    // 左侧：待选概念区
    let candidateArea = scaffoldContainer.querySelector('.candidate-nodes-area');
    if (!candidateArea) {
        candidateArea = document.createElement('div');
        candidateArea.className = 'candidate-nodes-area';
        candidateArea.style.cssText = `
            width: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            border: 1px solid #e9ecef;
            overflow-y: auto;
            max-height: 800px;
        `;
        candidateArea.innerHTML = `
            <h4 style="margin-bottom: 15px; color: #2c3e50;">待选概念</h4>
            <div class="candidate-nodes-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            <button id="showExpertMapBtn" class="btn btn-secondary" style="width: 100%; margin-top: 20px;">
                📊 展示专家图
            </button>
        `;
        scaffoldContainer.appendChild(candidateArea);
    }
    
    // 右侧：待完成的概念图
    let graphArea = scaffoldContainer.querySelector('.scaffold-graph-area');
    if (!graphArea) {
        graphArea = document.createElement('div');
        graphArea.className = 'scaffold-graph-area';
        graphArea.style.cssText = `
            flex: 1;
            background: white;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            position: relative;
            overflow: auto;
        `;
        graphArea.innerHTML = `
            <svg width="100%" height="100%" class="scaffold-concept-graph" viewBox="0 0 2400 1200" style="min-height: 800px;">
            </svg>
        `;
        scaffoldContainer.appendChild(graphArea);
    }
    
    // 专家图展示区域（初始隐藏）
    let expertMapArea = conceptMapDisplay.querySelector('.expert-map-area');
    if (!expertMapArea) {
        expertMapArea = document.createElement('div');
        expertMapArea.className = 'expert-map-area';
        expertMapArea.style.cssText = `
            width: 100%;
            margin-top: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            padding: 15px;
            display: none;
        `;
        expertMapArea.innerHTML = `
            <h4 style="margin-bottom: 15px; color: #2c3e50;">专家图（完整概念图）</h4>
            <svg width="100%" height="100%" class="expert-concept-graph" viewBox="0 0 2400 1200" style="min-height: 600px;">
            </svg>
        `;
        conceptMapDisplay.appendChild(expertMapArea);
    }
    
    // 绑定展示专家图按钮事件
    const showExpertBtn = candidateArea.querySelector('#showExpertMapBtn');
    if (showExpertBtn && !showExpertBtn.dataset.bound) {
        showExpertBtn.dataset.bound = 'true';
        showExpertBtn.addEventListener('click', function() {
            const isVisible = expertMapArea.style.display !== 'none';
            if (isVisible) {
                expertMapArea.style.display = 'none';
                this.textContent = '📊 展示专家图';
            } else {
                expertMapArea.style.display = 'block';
                this.textContent = '📊 隐藏专家图';
                // 如果专家图还没有渲染，则渲染它
                if (!expertMapArea.querySelector('.expert-concept-graph g[data-rendered="true"]')) {
                    displayExpertConceptMap(window.expertConceptMapData);
                }
            }
        });
    }
}

/**
 * 显示待完成的概念图（右侧）
 */
function displayIncompleteConceptMap(graphData) {
    const svg = document.querySelector('.scaffold-concept-graph');
    if (!svg) {
        console.error('找不到.scaffold-concept-graph SVG元素');
        return;
    }
    
    // 清空SVG
    svg.innerHTML = '';
    
    // 设置currentGraphData
    window.currentGraphData = graphData;
    
    // 使用drawGraph函数直接渲染到指定的SVG
    if (window.drawGraph) {
        // 临时将SVG添加到concept-graph类，以便drawGraph能找到它
        const originalClass = svg.className.baseVal;
        svg.classList.add('concept-graph');
        
        // 调用drawGraph渲染
        window.drawGraph(graphData);
        
        // 恢复原始类名（保留scaffold-concept-graph）
        svg.className.baseVal = originalClass;
    } else {
        console.error('drawGraph函数不存在');
    }
    
    // 重新设置拖放区域
    setupGraphDropZone();
}

/**
 * 设置概念图为拖放目标区域
 */
function setupGraphDropZone() {
    const graphArea = document.querySelector('.scaffold-graph-area');
    const svg = document.querySelector('.scaffold-concept-graph');
    
    if (!graphArea || !svg) return;
    
    // 移除之前的事件监听器（通过重新设置）
    graphArea.ondragover = null;
    graphArea.ondrop = null;
    graphArea.ondragenter = null;
    graphArea.ondragleave = null;
    
    // 允许拖放
    graphArea.ondragover = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        
        // 添加拖放提示样式
        graphArea.style.border = '3px dashed #667eea';
        graphArea.style.background = 'rgba(102, 126, 234, 0.05)';
    };
    
    graphArea.ondragenter = function(e) {
        e.preventDefault();
        e.stopPropagation();
        graphArea.style.border = '3px dashed #667eea';
        graphArea.style.background = 'rgba(102, 126, 234, 0.05)';
    };
    
    graphArea.ondragleave = function(e) {
        e.preventDefault();
        e.stopPropagation();
        // 只有当离开整个区域时才移除样式
        const rect = graphArea.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            graphArea.style.border = '1px solid #e9ecef';
            graphArea.style.background = 'white';
        }
    };
    
    graphArea.ondrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 恢复样式
        graphArea.style.border = '1px solid #e9ecef';
        graphArea.style.background = 'white';
        
        // 获取拖拽的节点ID
        const nodeId = e.dataTransfer.getData('text/plain');
        if (!nodeId || !window.draggingNode) {
            return;
        }
        
        // 计算在SVG中的坐标
        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox') || '0 0 2400 1200';
        const viewBoxParts = viewBox.split(' ').map(Number);
        const viewBoxX = viewBoxParts[0];
        const viewBoxY = viewBoxParts[1];
        const viewBoxWidth = viewBoxParts[2];
        const viewBoxHeight = viewBoxParts[3];
        
        // 将鼠标坐标转换为SVG坐标
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;
        const svgX = viewBoxX + (mouseX / svgRect.width) * viewBoxWidth;
        const svgY = viewBoxY + (mouseY / svgRect.height) * viewBoxHeight;
        
        console.log('拖放到位置:', svgX, svgY);
        
        // 添加节点到概念图（使用拖放位置）
        addCandidateNodeToGraphAtPosition(window.draggingNode, svgX, svgY);
        
        // 清除拖拽状态
        window.draggingNodeId = null;
        window.draggingNode = null;
    };
}

/**
 * 显示待选节点（左侧）
 */
function displayCandidateNodes(candidateNodes) {
    const candidateList = document.querySelector('.candidate-nodes-list');
    if (!candidateList) return;
    
    candidateList.innerHTML = '';
    
    candidateNodes.forEach(node => {
        const nodeItem = document.createElement('div');
        nodeItem.className = 'candidate-node-item';
        nodeItem.dataset.nodeId = node.id;
        nodeItem.draggable = true; // 启用拖拽
        nodeItem.style.cssText = `
            padding: 12px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 6px;
            cursor: grab;
            transition: all 0.2s;
            user-select: none;
        `;
        nodeItem.innerHTML = `
            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${node.label}</div>
            <div style="font-size: 12px; color: #6c757d;">层级: L${node.layer || 1}</div>
            <div style="font-size: 11px; color: #667eea; margin-top: 4px;">👆 拖拽到右侧概念图</div>
        `;
        
        // 拖拽开始
        nodeItem.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', node.id);
            e.dataTransfer.effectAllowed = 'move';
            this.style.opacity = '0.5';
            this.style.cursor = 'grabbing';
            
            // 创建拖拽预览
            const dragPreview = this.cloneNode(true);
            dragPreview.style.cssText = `
                position: absolute;
                top: -1000px;
                left: -1000px;
                width: ${this.offsetWidth}px;
                background: white;
                border: 2px solid #667eea;
                border-radius: 6px;
                padding: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, this.offsetWidth / 2, this.offsetHeight / 2);
            
            // 标记正在拖拽的节点
            window.draggingNodeId = node.id;
            window.draggingNode = node;
        });
        
        // 拖拽结束
        nodeItem.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            this.style.cursor = 'grab';
            window.draggingNodeId = null;
            window.draggingNode = null;
            
            // 移除拖拽预览
            const dragPreview = document.querySelector('.drag-preview');
            if (dragPreview) {
                dragPreview.remove();
            }
        });
        
        // 悬停效果
        nodeItem.addEventListener('mouseenter', function() {
            if (!this.draggable || this.style.opacity !== '0.5') {
                this.style.background = '#f0f4ff';
                this.style.transform = 'translateX(5px)';
            }
        });
        nodeItem.addEventListener('mouseleave', function() {
            if (!this.draggable || this.style.opacity !== '0.5') {
                this.style.background = 'white';
                this.style.transform = 'translateX(0)';
            }
        });
        
        candidateList.appendChild(nodeItem);
    });
    
    // 设置右侧概念图为拖放目标
    setupGraphDropZone();
}

/**
 * 将待选节点添加到概念图（使用拖放位置）
 */
function addCandidateNodeToGraphAtPosition(node, x, y) {
    if (!window.currentGraphData) {
        window.currentGraphData = { nodes: [], links: [] };
    }
    
    // 检查节点是否已存在
    const exists = window.currentGraphData.nodes.some(n => n.id === node.id);
    if (exists) {
        showMessage('该概念已添加到概念图中', 'warning');
        return;
    }
    
    // 创建节点副本并设置位置
    const newNode = {
        ...node,
        x: x,
        y: y
    };
    
    // 添加节点
    window.currentGraphData.nodes.push(newNode);
    
    // 恢复该节点在专家图中的连接关系
    if (window.expertConceptMapData) {
        restoreNodeLinks(node.id);
    }
    
    // 从待选列表中移除并标记
    markCandidateNodeAsAdded(node.id);
    
    // 应用布局算法并重新渲染
    applyLayoutAndRedraw();
    
    // 检查是否所有节点都已添加
    checkScaffoldCompletion();
    
    // 更新正确性统计
    updateCorrectnessStats();
}

/**
 * 将待选节点添加到概念图（点击方式，保持向后兼容）
 */
function addCandidateNodeToGraph(node) {
    if (!window.currentGraphData) {
        window.currentGraphData = { nodes: [], links: [] };
    }
    
    // 检查节点是否已存在
    const exists = window.currentGraphData.nodes.some(n => n.id === node.id);
    if (exists) {
        showMessage('该概念已添加到概念图中', 'warning');
        return;
    }
    
    // 添加节点（不设置位置，让布局算法自动分配）
    window.currentGraphData.nodes.push(node);
    
    // 恢复该节点在专家图中的连接关系
    if (window.expertConceptMapData) {
        restoreNodeLinks(node.id);
    }
    
    // 从待选列表中移除并标记
    markCandidateNodeAsAdded(node.id);
    
    // 应用布局算法并重新渲染
    applyLayoutAndRedraw();
    
    // 检查是否所有节点都已添加
    checkScaffoldCompletion();
    
    // 更新正确性统计
    updateCorrectnessStats();
}

/**
 * 标记待选节点为已添加
 */
function markCandidateNodeAsAdded(nodeId) {
    const candidateList = document.querySelector('.candidate-nodes-list');
    const nodeItem = candidateList?.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeItem) return;
    
    // 获取节点数据
    const node = window.scaffoldCandidateNodes?.find(n => n.id === nodeId);
    if (!node) return;
    
    // 判断添加是否正确
    const isCorrect = checkNodeCorrectness(node);
    
    // 禁用拖拽
    nodeItem.draggable = false;
    nodeItem.style.cursor = 'default';
    
    if (isCorrect) {
        nodeItem.style.background = '#d4edda';
        nodeItem.style.borderColor = '#28a745';
        nodeItem.innerHTML = `
            <div style="font-weight: 600; color: #155724; margin-bottom: 4px;">${node.label} ✓</div>
            <div style="font-size: 12px; color: #6c757d;">层级: L${node.layer || 1}</div>
            <div style="font-size: 11px; color: #28a745; margin-top: 4px;">✓ 正确</div>
        `;
    } else {
        nodeItem.style.background = '#f8d7da';
        nodeItem.style.borderColor = '#dc3545';
        nodeItem.innerHTML = `
            <div style="font-weight: 600; color: #721c24; margin-bottom: 4px;">${node.label} ✗</div>
            <div style="font-size: 12px; color: #6c757d;">层级: L${node.layer || 1}</div>
            <div style="font-size: 11px; color: #dc3545; margin-top: 4px;">✗ 不正确</div>
        `;
    }
    
    nodeItem.style.pointerEvents = 'none';
}

/**
 * 应用布局算法并重新渲染
 */
function applyLayoutAndRedraw() {
    const selectedLayout = window.layoutSelect ? window.layoutSelect.value : 'hierarchical';
    let layoutAppliedGraph = window.currentGraphData;
    
    try {
        if (selectedLayout === 'hierarchical' && typeof window.applySugiyamaLayout === 'function') {
            layoutAppliedGraph = window.applySugiyamaLayout(window.currentGraphData);
        } else if (selectedLayout === 'force' && typeof window.applyForceDirectedLayout === 'function') {
            layoutAppliedGraph = window.applyForceDirectedLayout(window.currentGraphData, {
                width: 2400,
                height: 1200,
                iterations: 300,
                coolingFactor: 0.95,
                linkDistance: 100,
                nodeCharge: -300,
                nodeSpacing: 60
            });
        }
    } catch (error) {
        console.error('布局算法应用失败:', error);
    }
    
    // 重新渲染概念图
    displayIncompleteConceptMap(layoutAppliedGraph);
    window.currentGraphData = layoutAppliedGraph;
}

/**
 * 恢复节点在专家图中的连接关系
 */
function restoreNodeLinks(nodeId) {
    if (!window.expertConceptMapData || !window.currentGraphData) return;
    
    // 找到专家图中该节点的所有连接
    const expertLinks = window.expertConceptMapData.links.filter(link => 
        link.source === nodeId || link.target === nodeId
    );
    
    // 检查哪些连接可以恢复（两端节点都已存在）
    expertLinks.forEach(link => {
        const sourceExists = window.currentGraphData.nodes.some(n => n.id === link.source);
        const targetExists = window.currentGraphData.nodes.some(n => n.id === link.target);
        
        if (sourceExists && targetExists) {
            // 检查连接是否已存在
            const linkExists = window.currentGraphData.links.some(l => 
                (l.source === link.source && l.target === link.target) ||
                (l.source === link.target && l.target === link.source)
            );
            
            if (!linkExists) {
                window.currentGraphData.links.push({
                    id: link.id,
                    source: link.source,
                    target: link.target,
                    label: link.label,
                    type: link.type
                });
            }
        }
    });
}

/**
 * 检查节点添加是否正确
 * @param {Object} node - 要检查的节点
 * @returns {boolean} 是否正确
 */
function checkNodeCorrectness(node) {
    if (!window.expertConceptMapData) {
        // 如果没有专家图，无法判断，默认返回true
        return true;
    }
    
    // 检查节点是否存在于专家图中
    const expertNode = window.expertConceptMapData.nodes.find(n => n.id === node.id);
    if (!expertNode) {
        console.warn('节点不在专家图中:', node.id);
        return false;
    }
    
    // 检查节点标签是否匹配
    if (expertNode.label !== node.label) {
        console.warn('节点标签不匹配:', expertNode.label, 'vs', node.label);
        return false;
    }
    
    // 检查节点层级是否匹配
    if (expertNode.layer !== node.layer) {
        console.warn('节点层级不匹配:', expertNode.layer, 'vs', node.layer);
        return false;
    }
    
    // 节点基本信息匹配，返回true
    return true;
}

/**
 * 更新正确性统计
 */
function updateCorrectnessStats() {
    const candidateList = document.querySelector('.candidate-nodes-list');
    if (!candidateList) return;
    
    const allItems = candidateList.querySelectorAll('.candidate-node-item');
    let correctCount = 0;
    let incorrectCount = 0;
    let totalCount = allItems.length;
    
    allItems.forEach(item => {
        if (item.style.background.includes('d4edda')) {
            correctCount++;
        } else if (item.style.background.includes('f8d7da')) {
            incorrectCount++;
        }
    });
    
    // 更新统计显示
    let statsArea = document.querySelector('.scaffold-stats');
    if (!statsArea) {
        statsArea = document.createElement('div');
        statsArea.className = 'scaffold-stats';
        statsArea.style.cssText = `
            margin-top: 15px;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        `;
        const candidateArea = document.querySelector('.candidate-nodes-area');
        if (candidateArea) {
            candidateArea.appendChild(statsArea);
        }
    }
    
    const addedCount = correctCount + incorrectCount;
    const accuracy = addedCount > 0 ? ((correctCount / addedCount) * 100).toFixed(1) : 0;
    
    statsArea.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #2c3e50;">完成情况</div>
        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">
            已添加: ${addedCount} / ${totalCount}
        </div>
        <div style="font-size: 12px; color: #28a745; margin-bottom: 4px;">
            正确: ${correctCount}
        </div>
        <div style="font-size: 12px; color: #dc3545; margin-bottom: 4px;">
            错误: ${incorrectCount}
        </div>
        <div style="font-size: 12px; color: #667eea; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9ecef;">
            准确率: ${accuracy}%
        </div>
    `;
}

/**
 * 检查支架完成情况
 */
function checkScaffoldCompletion() {
    const candidateList = document.querySelector('.candidate-nodes-list');
    if (!candidateList) return;
    
    const allItems = candidateList.querySelectorAll('.candidate-node-item');
    const remainingNodes = Array.from(allItems).filter(item => 
        !item.style.background.includes('d4edda') && 
        !item.style.background.includes('f8d7da')
    );
    
    if (remainingNodes.length === 0 && allItems.length > 0) {
        // 计算最终统计
        let correctCount = 0;
        let incorrectCount = 0;
        allItems.forEach(item => {
            if (item.style.background.includes('d4edda')) {
                correctCount++;
            } else if (item.style.background.includes('f8d7da')) {
                incorrectCount++;
            }
        });
        
        const accuracy = allItems.length > 0 ? ((correctCount / allItems.length) * 100).toFixed(1) : 0;
        
        showMessage(
            `恭喜！您已完成所有概念的添加！正确: ${correctCount}, 错误: ${incorrectCount}, 准确率: ${accuracy}%`, 
            'success'
        );
        
        // 显示完成提示
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #28a745; margin-bottom: 10px;">✅ 支架概念图完成</h4>
                    <p style="margin: 5px 0;"><strong>完成情况：</strong>所有概念已添加</p>
                    <p style="margin: 5px 0;"><strong>正确数量：</strong>${correctCount}</p>
                    <p style="margin: 5px 0;"><strong>错误数量：</strong>${incorrectCount}</p>
                    <p style="margin: 5px 0; color: #667eea;"><strong>准确率：</strong>${accuracy}%</p>
                    <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                        可以点击"展示专家图"按钮查看完整的概念图进行比对
                    </p>
                </div>
            `;
        }
    }
}

/**
 * 显示专家图（完整概念图）
 */
function displayExpertConceptMap(expertData) {
    const svg = document.querySelector('.expert-concept-graph');
    if (!svg || !expertData) {
        console.error('找不到.expert-concept-graph SVG元素或expertData为空');
        return;
    }
    
    console.log('开始渲染专家图，数据:', expertData);
    
    // 清空SVG
    svg.innerHTML = '';
    
    // 先应用布局算法
    const selectedLayout = window.layoutSelect ? window.layoutSelect.value : 'hierarchical';
    let layoutAppliedData = expertData;
    
    try {
        if (selectedLayout === 'hierarchical' && typeof window.applySugiyamaLayout === 'function') {
            console.log('专家图：应用Sugiyama布局');
            layoutAppliedData = window.applySugiyamaLayout(expertData);
        } else if (selectedLayout === 'force' && typeof window.applyForceDirectedLayout === 'function') {
            console.log('专家图：应用力导向布局');
            layoutAppliedData = window.applyForceDirectedLayout(expertData, {
                width: 2400,
                height: 1200,
                iterations: 300,
                coolingFactor: 0.95,
                linkDistance: 100,
                nodeCharge: -300,
                nodeSpacing: 60
            });
        }
    } catch (error) {
        console.error('专家图布局算法应用失败:', error);
    }
    
    // 临时设置currentGraphData
    const originalData = window.currentGraphData;
    window.currentGraphData = layoutAppliedData;
    
    // 使用drawGraph函数直接渲染到指定的SVG
    if (window.drawGraph) {
        // 临时隐藏其他concept-graph SVG，确保drawGraph找到正确的SVG
        const otherSvg = document.querySelector('.scaffold-concept-graph');
        const otherDisplay = otherSvg ? otherSvg.style.display : null;
        if (otherSvg) {
            otherSvg.style.display = 'none';
        }
        
        // 保存原始类名
        const originalClass = svg.className.baseVal;
        
        // 临时将SVG添加到concept-graph类，以便drawGraph能找到它
        svg.classList.add('concept-graph');
        
        // 调用drawGraph渲染
        console.log('调用drawGraph渲染专家图');
        window.drawGraph(layoutAppliedData);
        
        // 恢复类名
        svg.className.baseVal = originalClass;
        svg.classList.add('expert-concept-graph');
        
        // 恢复其他SVG的显示
        if (otherSvg && otherDisplay !== null) {
            otherSvg.style.display = otherDisplay;
        }
        
        // 标记已渲染
        const g = svg.querySelector('g');
        if (g) {
            g.setAttribute('data-rendered', 'true');
        }
        
        // 调整viewBox以确保所有内容可见
        adjustExpertMapViewBox(svg, layoutAppliedData);
        
        // 恢复currentGraphData
        window.currentGraphData = originalData;
        
        console.log('专家图渲染完成');
    } else {
        console.error('drawGraph函数不存在');
    }
}

/**
 * 调整专家图的viewBox以确保所有内容可见
 */
function adjustExpertMapViewBox(svg, graphData) {
    if (!svg || !graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return;
    }
    
    // 计算所有节点的边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    graphData.nodes.forEach(node => {
        const x = node.x || 0;
        const y = node.y || 0;
        const width = node.width || 100;
        const height = node.height || 50;
        
        minX = Math.min(minX, x - width / 2);
        minY = Math.min(minY, y - height / 2);
        maxX = Math.max(maxX, x + width / 2);
        maxY = Math.max(maxY, y + height / 2);
    });
    
    // 添加边距
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // 设置viewBox
    const width = maxX - minX;
    const height = maxY - minY;
    svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    
    console.log('专家图viewBox已调整:', `${minX} ${minY} ${width} ${height}`);
}

/**
 * 从图片生成概念图
 * @param {string} imageData - Base64编码的图片数据
 * @param {string} fileName - 文件名
 */
async function generateConceptMapFromImage(imageData, fileName) {
    console.log('开始从图片生成概念图...');
    
    if (isGenerating) {
        console.log('正在生成中，忽略重复请求');
        return;
    }
    
    isGenerating = true;
    
    try {
        // 检查服务是否可用
        if (!window.ImageConceptMapService) {
            throw new Error('图片生成概念图服务未加载');
        }
        
        // 获取API基础URL
        let apiBaseUrl = 'http://localhost:5000/api'; // 默认值
        
        if (window.llmManager && window.llmManager.config && window.llmManager.config.API_BASE_URL) {
            apiBaseUrl = window.llmManager.config.API_BASE_URL;
        } else if (window.portChecker) {
            const currentPort = window.portChecker.getCurrentPort();
            apiBaseUrl = `http://localhost:${currentPort}/api`;
        }
        
        console.log('📍 使用API地址:', apiBaseUrl);
        
        // 清除之前的概念图内容
        clearPreviousConceptMap();
        
        // 先显示概念图展示区域
        const conceptMapDisplay = document.querySelector('.concept-map-display');
        if (conceptMapDisplay) {
            conceptMapDisplay.style.display = 'flex';
        }
        
        // 隐藏占位符
        if (window.graphPlaceholder) {
            window.graphPlaceholder.style.display = 'none';
        }
        
        // 显示加载状态
        showLoadingAnimation();
        
        // 更新流程状态
        if (window.processText) {
            window.processText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🖼️ 从图片生成概念图</h4>
                    <p style="margin: 5px 0;"><strong>当前操作：</strong>正在分析图片并提取概念...</p>
                    <p style="margin: 5px 0;"><strong>文件名：</strong>${fileName}</p>
                    <p style="margin: 5px 0; color: #667eea;">✨ AI正在识别图片中的文字并生成概念图...</p>
                </div>
            `;
        }
        
        // 显示文本内容区域
        if (window.aiIntroText) {
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">🤖 AI分析过程</h4>
                    <div style="text-align: center; padding: 30px 0;">
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 15px; color: #666;">正在分析图片，请稍候...</p>
                        <p style="margin-top: 5px; font-size: 12px; color: #999;">使用阿里云百炼 qwen3-vl-plus 模型</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        // 创建服务实例
        const imageService = new window.ImageConceptMapService(apiBaseUrl);
        
        // 初始化响应文本
        let fullResponseText = '';
        
        // 定义回调函数
        const onChunk = (content) => {
            // 累积内容
            fullResponseText += content;
            
            // 实时更新显示（可选，显示流式输出）
            if (window.aiIntroText) {
                const displayText = fullResponseText.length > 500 
                    ? fullResponseText.substring(0, 500) + '...' 
                    : fullResponseText;
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">🤖 AI分析过程 <span style="color: #28a745; font-size: 14px;">⚡ 生成中...</span></h4>
                        <div style="line-height: 1.8; color: #333; font-size: 14px;">
                            <pre style="white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">${displayText}</pre>
                        </div>
                    </div>
                `;
            }
        };
        
        const onComplete = (result) => {
            console.log('✅ 从图片生成概念图成功:', result);
            
            if (!result.success) {
                throw new Error(result.message || '生成失败');
            }
            
            // 更新流程状态
            if (window.processText) {
                window.processText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 10px;">🖼️ 从图片生成概念图</h4>
                        <p style="margin: 5px 0;"><strong>当前操作：</strong>概念图生成完成</p>
                        <p style="margin: 5px 0;"><strong>文件名：</strong>${fileName}</p>
                        <p style="margin: 5px 0; color: #28a745;">✅ 已成功提取 ${result.triples.length} 个三元组</p>
                    </div>
                `;
            }
            
            // 更新文本内容区域
            if (window.aiIntroText) {
                const focusQuestion = result.focusQuestion || '未提取到焦点问题';
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">📊 提取结果</h4>
                        <div style="line-height: 1.8; color: #333;">
                            <p><strong>焦点问题：</strong>${focusQuestion}</p>
                            <p><strong>三元组数量：</strong>${result.triples.length}</p>
                        </div>
                    </div>
                `;
            }
            
            // 设置焦点问题
            window.focusQuestion = `焦点问题：${result.focusQuestion}`;
            
            // 将三元组转换为概念图数据
            console.log('开始将三元组转换为概念图数据...');
            const conceptData = window.convertTriplesToConceptData(result.triples);
            console.log('概念图数据转换完成:', conceptData);
            
            const graphData = window.convertToD3Format(conceptData);
            console.log('D3格式数据转换完成:', graphData);
            
            // 渲染概念图
            displayConceptMap(graphData);
            
            // 隐藏加载状态
            hideLoadingState();
            
            showMessage('概念图生成完成！', 'success');
            isGenerating = false;
        };
        
        const onError = (error) => {
            console.error('❌ 从图片生成概念图失败:', error);
            
            // 显示错误信息
            if (window.aiIntroText) {
                // 处理多行错误信息，将换行符转换为HTML
                const errorMessage = (error.message || '未知错误').replace(/\n/g, '<br>');
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 生成失败</h4>
                        <p style="color: #666; margin: 10px 0; white-space: pre-line;">${errorMessage}</p>
                        <p style="color: #999; font-size: 14px; margin-top: 15px;">请检查：</p>
                        <ul style="color: #999; font-size: 14px; margin: 5px 0; padding-left: 20px;">
                            <li>后端服务是否正常运行</li>
                            <li>API密钥是否配置正确</li>
                            <li>网络连接是否正常</li>
                            <li>图片是否包含可识别的文字内容</li>
                        </ul>
                    </div>
                `;
            }
            
            // 更新流程状态
            if (window.processText) {
                // 处理多行错误信息，将换行符转换为HTML
                const errorMessage = (error.message || '生成失败').replace(/\n/g, '<br>');
                window.processText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #e74c3c; margin-bottom: 10px;">🖼️ 从图片生成概念图</h4>
                        <p style="margin: 5px 0;"><strong>当前操作：</strong>生成失败</p>
                        <p style="margin: 5px 0;"><strong>文件名：</strong>${fileName}</p>
                        <p style="margin: 5px 0; color: #e74c3c; white-space: pre-line;">❌ ${errorMessage}</p>
                    </div>
                `;
            }
            
            hideLoadingState();
            showMessage('从图片生成概念图失败: ' + (error.message || '未知错误'), 'error');
            isGenerating = false;
        };
        
        // 调用服务生成概念图
        await imageService.generate(imageData, onChunk, onComplete, onError);
        
    } catch (error) {
        console.error('❌ 调用图片生成概念图服务时发生错误:', error);
        
        // 显示错误信息
        if (window.aiIntroText) {
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 系统错误</h4>
                    <p style="color: #666; margin: 10px 0;">${error.message}</p>
                    <p style="color: #999; font-size: 14px; margin-top: 15px;">请确保后端服务正常运行。</p>
                </div>
            `;
        }
        
        hideLoadingState();
        showMessage('系统错误: ' + error.message, 'error');
        isGenerating = false;
    }
}

async function analyzeUploadedConceptMap(imageData, fileName) {
    console.log('开始调用概念图评价API...');
    
    try {
        // 检查评价服务是否可用
        if (!window.ConceptMapEvaluationService) {
            throw new Error('概念图评价服务未加载');
        }
        
        // 获取API基础URL（正确方式）
        let apiBaseUrl = 'http://localhost:5000/api'; // 默认值
        
        if (window.llmManager && window.llmManager.config && window.llmManager.config.API_BASE_URL) {
            apiBaseUrl = window.llmManager.config.API_BASE_URL;
        } else if (window.portChecker) {
            // 从 portChecker 获取当前端口
            const currentPort = window.portChecker.getCurrentPort();
            apiBaseUrl = `http://localhost:${currentPort}/api`;
        }
        
        console.log('📍 使用API地址:', apiBaseUrl);
        
        // 创建评价服务实例
        const evaluationService = new window.ConceptMapEvaluationService(apiBaseUrl);
        
        // 初始化评价结果容器
        let analysisText = '';
        
        // 定义回调函数
        const onChunk = (content) => {
            // 累积内容
            analysisText += content;
            
            // 实时更新显示
            if (window.aiIntroText) {
                // 将评价结果转换为HTML格式（保留换行和格式）
                const analysisHtml = analysisText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗体
                    .replace(/\n\n/g, '</p><p>')  // 段落
                    .replace(/\n/g, '<br>');  // 换行
                
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">🤖 AI评价分析结果 <span style="color: #28a745; font-size: 14px;">⚡ 生成中...</span></h4>
                        <div style="line-height: 1.8; color: #333;">
                            <p>${analysisHtml}</p>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
                            <p>评价模型：阿里云百炼 qwen3-vl-plus（流式输出）</p>
                            <p>文件名：${fileName}</p>
                        </div>
                    </div>
                `;
            }
        };
        
        const onComplete = () => {
            console.log('✅ 概念图评价成功（流式）');
            
            // 更新流程状态
            if (window.processText) {
                window.processText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 10px;">📤 概念图评价流程</h4>
                        <p style="margin: 5px 0;"><strong>当前操作：</strong>AI评价分析完成</p>
                        <p style="margin: 5px 0;"><strong>文件名：</strong>${fileName}</p>
                        <p style="margin: 5px 0; color: #28a745;">✅ 评价分析已完成，请查看下方结果</p>
                    </div>
                `;
            }
            
            // 显示最终结果（移除"生成中"标识）
            if (window.aiIntroText) {
                const analysisHtml = analysisText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗体
                    .replace(/\n\n/g, '</p><p>')  // 段落
                    .replace(/\n/g, '<br>');  // 换行
                
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #667eea; margin-bottom: 15px;">🤖 AI评价分析结果</h4>
                        <div style="line-height: 1.8; color: #333;">
                            <p>${analysisHtml}</p>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
                            <p>评价模型：阿里云百炼 qwen3-vl-plus</p>
                            <p>文件名：${fileName}</p>
                        </div>
                    </div>
                `;
            }
            
            showMessage('概念图评价完成', 'success');
        };
        
        const onError = (error) => {
            console.error('❌ 概念图评价失败:', error);
            
            // 显示错误信息
            if (window.aiIntroText) {
                window.aiIntroText.innerHTML = `
                    <div style="padding: 15px;">
                        <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 评价失败</h4>
                        <p style="color: #666; margin: 10px 0;">${error || '未知错误'}</p>
                        <p style="color: #999; font-size: 14px; margin-top: 15px;">请检查：</p>
                        <ul style="color: #999; font-size: 14px; margin: 5px 0; padding-left: 20px;">
                            <li>后端服务是否正常运行</li>
                            <li>API密钥是否配置正确</li>
                            <li>网络连接是否正常</li>
                        </ul>
                    </div>
                `;
            }
            
            showMessage('概念图评价失败: ' + error, 'error');
        };
        
        // 调用流式评价API
        await evaluationService.streamAnalyze(imageData, onChunk, onComplete, onError);
        
    } catch (error) {
        console.error('❌ 调用评价服务时发生错误:', error);
        
        // 显示错误信息
        if (window.aiIntroText) {
            window.aiIntroText.innerHTML = `
                <div style="padding: 15px;">
                    <h4 style="color: #e74c3c; margin-bottom: 10px;">❌ 系统错误</h4>
                    <p style="color: #666; margin: 10px 0;">${error.message}</p>
                    <p style="color: #999; font-size: 14px; margin-top: 15px;">请确保后端服务正常运行。</p>
                </div>
            `;
        }
        
        showMessage('系统错误: ' + error.message, 'error');
    }
}

function resetView() {
    // 显示确认弹窗
    if (!confirm('你确定要重置视图吗？未保存的内容将全部被清除')) {
        return;
    }
    
    // 清除所有生成的内容
    currentGraphData = null;
    window.currentGraphData = null;
    
    // 显示占位符
    window.graphPlaceholder.style.display = 'flex';
    
    // 隐藏概念图展示区域
    const conceptMapDisplay = document.querySelector('.concept-map-display');
    if (conceptMapDisplay) {
        conceptMapDisplay.style.display = 'none';
    }
    
    // 编辑工具栏现在在control-bar中，始终可见
    
    // 取消节点选中状态
    deselectNode();
    
    // 清空输入框
    if (window.keywordInput) {
        window.keywordInput.value = '';
    }
    if (window.descriptionTextarea) {
        window.descriptionTextarea.value = '';
    }
    
    // 清空AI介绍文字
    const aiIntroText = document.getElementById('aiIntroText');
    if (aiIntroText) {
        aiIntroText.innerHTML = '';
        aiIntroText.className = 'intro-text';
    }
    
    // 清空概念节点和关系连接列表区域
    const conceptListsArea = document.getElementById('conceptListsArea');
    if (conceptListsArea) {
        conceptListsArea.innerHTML = '';
        conceptListsArea.style.display = 'none';
    }
    
    // 恢复SVG画布（如果之前被上传图片替换了）
    const graphCanvas = document.querySelector('.graph-canvas-fullwidth') || document.querySelector('.graph-canvas');
    let svg = document.querySelector('.concept-graph');
    
    if (!svg && graphCanvas) {
        // SVG不存在，说明之前被上传图片替换了，需要重新创建
        console.log('检测到SVG被替换，正在恢复SVG画布...');
        graphCanvas.innerHTML = '';
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '1200');
        svg.setAttribute('class', 'concept-graph');
        svg.setAttribute('viewBox', '0 0 2400 1200');
        graphCanvas.appendChild(svg);
    }
    
    // 清空SVG画布内容
    if (svg) {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        // 默认显示文字
        const defaultText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        defaultText.setAttribute('x', '1200');
        defaultText.setAttribute('y', '600');
        defaultText.setAttribute('text-anchor', 'middle');
        defaultText.setAttribute('dominant-baseline', 'middle');
        defaultText.setAttribute('font-size', '16');
        defaultText.setAttribute('fill', '#666');
        defaultText.textContent = '概念图将在这里显示';
        svg.appendChild(defaultText);
    }
    
    // 清除焦点问题
    window.focusQuestion = null;
    
    // 禁用导出按钮
    if (window.exportBtn) {
        window.exportBtn.disabled = true;
    }
    
    // 重置状态栏
    updateStatusBar({ nodes: [], links: [] });
    
    // 清空历史记录
    clearHistory();
    
    // 重置所有相关状态
    selectedNodeId = null;
    selectedLinkId = null;
    window.isAllNodesSelected = false;
    isDragging = false;
    isLinkCreationMode = false;
    linkSourceNodeId = null;
    linkTargetNodeId = null;
    isGenerating = false;
    
    // 重置生成按钮状态
    resetGenerateButtons();
    
    // 重置全局调整大小状态
    if (window.isResizing !== undefined) {
        window.isResizing = false;
    }
    if (window.resizeStartX !== undefined) {
        window.resizeStartX = 0;
    }
    if (window.resizeStartY !== undefined) {
        window.resizeStartY = 0;
    }
    if (window.originalWidth !== undefined) {
        window.originalWidth = 0;
    }
    if (window.originalHeight !== undefined) {
        window.originalHeight = 0;
    }
    
    // 重置虚拟连接线状态
    if (window.virtualLine) {
        window.virtualLine = null;
    }
    
    // 移除可能存在的虚拟连接线
    const virtualLines = document.querySelectorAll('.virtual-connection-line');
    virtualLines.forEach(line => line.remove());
    
    // 移除可能存在的输入框
    const floatingInputs = document.querySelectorAll('input[style*="position: fixed"], input[style*="position: absolute"]');
    floatingInputs.forEach(input => {
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
    });
    
    // 移除可能存在的控制手柄
    const nodeHandles = document.querySelectorAll('.node-handle');
    nodeHandles.forEach(handle => handle.remove());
    
    showMessage('视图已重置，所有内容已清除，您可以重新开始创建概念图', 'success');
}

//=============================================================================
// 概念图生成函数
//=============================================================================

/**
 * 重置生成按钮状态
 */
function resetGenerateButtons() {
    if (window.keywordBtn) {
        window.keywordBtn.classList.remove('loading');
        window.keywordBtn.textContent = '生成';
        window.keywordBtn.disabled = false;
    }
    if (window.descriptionBtn) {
        window.descriptionBtn.classList.remove('loading');
        window.descriptionBtn.textContent = '分析生成';
        window.descriptionBtn.disabled = false;
    }
    // 启用布局下拉框
    if (window.layoutSelect) {
        window.layoutSelect.disabled = false;
    }
}

async function generateConceptMapWithLLM(type, data) {
    console.log('generateConceptMapWithLLM函数被调用，类型:', type, '数据:', data);
    
    if (isGenerating) {
        console.log('正在生成中，忽略重复请求');
        return;
    }
    
    isGenerating = true;
    console.log('开始生成概念图流程...');
    
    // 禁用布局下拉框，防止在生成过程中切换布局
    if (window.layoutSelect) {
        window.layoutSelect.disabled = true;
        console.log('布局下拉框已禁用');
    }
    
    // 清除之前的概念图内容
    console.log('清除之前的概念图内容...');
    clearPreviousConceptMap();
    
    // 清除之前的步骤用时记录
    window.stepDurations = {};
    
    // 记录总开始时间
    const totalStartTime = performance.now();
    
    try {
        // 先显示概念图展示区域
        const conceptMapDisplay = document.querySelector('.concept-map-display');
        conceptMapDisplay.style.display = 'flex';
        
        // 隐藏占位符
        graphPlaceholder.style.display = 'none';
        
        // 显示加载动画
        showLoadingAnimation();
        
        // 显示内容加载状态
        showContentLoadingState(type, data);
        
        // 生成焦点问题
        generateFocusQuestion(type, data);
        
        // 针对焦点问题模式，使用4步流程
        if (type === 'keyword') {
            // === 步骤1：生成介绍文本（流式输出） ===
            const step1Start = performance.now();
            updateProcessStatus(1, 'active', null, 'keyword');
            
            // 清空并准备文本内容展示区域
            const textDisplayArea = window.aiIntroText;
            if (textDisplayArea) {
                textDisplayArea.innerHTML = '<div class="streaming-text" style="padding: 10px; line-height: 1.8; color: #333; font-size: 14px;"></div>';
            }
            
            const streamingDiv = textDisplayArea ? textDisplayArea.querySelector('.streaming-text') : null;
            let introText = '';
            
            console.log('准备开始流式生成介绍文本，显示区域:', textDisplayArea);
            
            // 调用流式生成介绍文本
            const introResult = await window.llmManager.generateIntroduction(
                data.keyword,
                (chunk) => {
                    // 实时显示生成的文本
                    introText += chunk;
                    if (streamingDiv) {
                        streamingDiv.textContent = introText;
                    }
                }
            );
            
            console.log('==================== 步骤1完成检查 ====================');
            console.log('流式文本生成完成，总字数:', introText.length);
            console.log('introResult对象:', introResult);
            console.log('introResult.success:', introResult?.success);
            console.log('introResult.text:', introResult?.text ? '存在，长度:' + introResult.text.length : '不存在');
            console.log('=========================================================');
            
            const step1Duration = ((performance.now() - step1Start) / 1000).toFixed(2) + 's';
            
            if (!introResult) {
                console.error('❌ introResult为null或undefined');
                updateProcessStatus(1, 'error', null, 'keyword');
                showMessage('文本生成返回结果为空', 'warning');
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            if (!introResult.success) {
                console.error('❌ introResult.success为false，introResult:', introResult);
                updateProcessStatus(1, 'error', null, 'keyword');
                showMessage(introResult?.message || '文本生成失败', 'warning');
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            if (!introResult.text || introResult.text.length === 0) {
                console.error('❌ 生成的文本为空');
                updateProcessStatus(1, 'error', null, 'keyword');
                showMessage('生成的文本为空，请重试', 'warning');
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            console.log('✅ 介绍文本生成成功，文本长度:', introResult.text.length);
            console.log('准备进入步骤2：提取三元组');
            updateProcessStatus(1, 'completed', step1Duration, 'keyword');
            
            // 等待一小段时间，确保第一次流式连接完全释放
            console.log('⏳ 等待连接清理...');
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ 连接清理完成，开始步骤2');
            
            // === 步骤2：提取三元组 ===
            const step2Start = performance.now();
            updateProcessStatus(2, 'active', null, 'keyword');
            
            console.log('=== 步骤2开始：提取三元组 ===');
            console.log('开始从介绍文本提取三元组，文本长度:', introResult.text.length);
            console.log('文本前100字:', introResult.text.substring(0, 100));
            console.log('window.llmManager存在:', !!window.llmManager);
            console.log('extractTriples方法存在:', typeof window.llmManager?.extractTriples);
            
            // 在文本展示区域显示处理状态
            if (streamingDiv) {
                streamingDiv.innerHTML = introText + '<br><br><div style="color: #666; font-style: italic;">正在提取三元组...</div>';
            }
            
            let tripleResult;
            try {
                console.log('准备调用extractTriples...');
                tripleResult = await window.llmManager.extractTriples(introResult.text);
                console.log('extractTriples调用完成');
                console.log('三元组提取返回结果:', tripleResult);
            } catch (error) {
                console.error('三元组提取异常:', error);
                updateProcessStatus(2, 'error', null, 'keyword');
                showMessage('三元组提取异常：' + error.message, 'error');
                if (streamingDiv) {
                    streamingDiv.innerHTML = introText + '<br><br><div style="color: red;">三元组提取异常: ' + error.message + '</div>';
                }
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            const step2Duration = ((performance.now() - step2Start) / 1000).toFixed(2) + 's';
            
            if (!tripleResult || !tripleResult.success || !tripleResult.triples || tripleResult.triples.length === 0) {
                console.error('❌ 三元组提取失败，详细信息:', tripleResult);
                updateProcessStatus(2, 'error', null, 'keyword');
                const errorMsg = tripleResult?.message || tripleResult?.error || '未知错误';
                showMessage('三元组提取失败：' + errorMsg, 'error');
                if (streamingDiv) {
                    let errorHtml = introText + '<br><br><div style="color: #dc3545; background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545;">';
                    errorHtml += '<strong>❌ 三元组提取失败</strong><br><br>';
                    errorHtml += '<div style="color: #333;">' + errorMsg + '</div>';
                    
                    // 如果有原始响应，显示出来供调试
                    if (tripleResult?.rawResponse) {
                        errorHtml += '<br><details style="cursor: pointer;"><summary style="color: #666;">查看AI原始响应（用于调试）</summary>';
                        const escapedResponse = tripleResult.rawResponse
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                        errorHtml += '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px; font-size: 12px;">' + 
                                     escapedResponse + '</pre>';
                        errorHtml += '</details>';
                    }
                    
                    errorHtml += '</div>';
                    streamingDiv.innerHTML = errorHtml;
                }
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            console.log('三元组提取成功，数量:', tripleResult.triples.length, '三元组列表:', tripleResult.triples);
            updateProcessStatus(2, 'completed', step2Duration, 'keyword');
            
            // 恢复原始介绍文本，移除"正在提取三元组..."的提示
            if (streamingDiv) {
                streamingDiv.textContent = introText;
            }
            
            // === 步骤3：概念图的生成（数据处理+渲染） ===
            const step3Start = performance.now();
            updateProcessStatus(3, 'active', null, 'keyword');
            
            // 将三元组转换为概念图数据
            console.log('开始将三元组转换为概念图数据...');
            const conceptData = window.convertTriplesToConceptData(tripleResult.triples);
            console.log('概念图数据转换完成:', conceptData);
            
            const graphData = window.convertToD3Format(conceptData);
            console.log('D3格式数据转换完成:', graphData);
            
            // 渲染概念图
            displayConceptMap(graphData);
            
            // 更新显示信息
            updateGenerationInfo(type, data, conceptData, introResult.text, '');
            
            const step3Duration = ((performance.now() - step3Start) / 1000).toFixed(2) + 's';
            updateProcessStatus(3, 'completed', step3Duration, 'keyword');
            
            // === 步骤4：完成 ===
            const totalDuration = ((performance.now() - totalStartTime) / 1000).toFixed(2) + 's';
            updateProcessStatus(4, 'completed', totalDuration, 'keyword');
            
            showMessage('概念图生成完成！', 'success');
            
        } else {
            // 文本分析模式，流程：焦点问题分析 → 三元组提取 → 概念图渲染（4步）
            
            // === 步骤1：焦点问题分析 ===
            const step1Start = performance.now();
            updateProcessStatus(1, 'active', null, 'description');
            
            console.log('=== 步骤1开始：焦点问题分析 ===');
            console.log('输入文本长度:', data.description.length);
            console.log('输入文本前100字:', data.description.substring(0, 100));
            
            let focusQuestionResult;
            try {
                console.log('准备调用extractFocusQuestion...');
                focusQuestionResult = await window.llmManager.extractFocusQuestion(data.description);
                console.log('extractFocusQuestion调用完成');
                console.log('焦点问题提取返回结果:', focusQuestionResult);
            } catch (error) {
                console.error('焦点问题提取异常:', error);
                updateProcessStatus(1, 'error', null, 'description');
                showMessage('焦点问题提取异常：' + error.message, 'error');
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            const step1Duration = ((performance.now() - step1Start) / 1000).toFixed(2) + 's';
            
            if (!focusQuestionResult || !focusQuestionResult.success || !focusQuestionResult.focusQuestion) {
                console.error('❌ 焦点问题提取失败，详细信息:', focusQuestionResult);
                updateProcessStatus(1, 'error', null, 'description');
                const errorMsg = focusQuestionResult?.message || focusQuestionResult?.error || '未知错误';
                showMessage('焦点问题提取失败：' + errorMsg, 'error');
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            const extractedFocusQuestion = focusQuestionResult.focusQuestion;
            console.log('✅ 焦点问题提取成功:', extractedFocusQuestion);
            
            // 更新全局焦点问题变量（用于显示和导出）
            window.focusQuestion = `焦点问题：${extractedFocusQuestion}`;
            
            updateProcessStatus(1, 'completed', step1Duration, 'description');
            
            // 等待一小段时间
            console.log('⏳ 等待连接清理...');
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ 连接清理完成，开始步骤2');
            
            // 准备文本内容展示区域，显示用户输入的原始文本
            const textDisplayArea = window.aiIntroText;
            const streamingDiv = textDisplayArea ? textDisplayArea.querySelector('.streaming-text') : null;
            const userInputText = data.description;
            
            if (textDisplayArea) {
                textDisplayArea.innerHTML = '<div class="streaming-text" style="padding: 10px; line-height: 1.8; color: #333; font-size: 14px;"></div>';
                const newStreamingDiv = textDisplayArea.querySelector('.streaming-text');
                if (newStreamingDiv) {
                    newStreamingDiv.textContent = userInputText;
                }
            }
            
            // === 步骤2：提取三元组（直接从用户输入的文本） ===
            const step2Start = performance.now();
            updateProcessStatus(2, 'active', null, 'description');
            
            console.log('=== 步骤2开始：提取三元组 ===');
            console.log('开始从用户输入文本提取三元组，文本长度:', userInputText.length);
            console.log('文本前100字:', userInputText.substring(0, 100));
            
            // 在文本展示区域显示处理状态
            const newStreamingDiv = textDisplayArea ? textDisplayArea.querySelector('.streaming-text') : null;
            if (newStreamingDiv) {
                newStreamingDiv.innerHTML = userInputText + '<br><br><div style="color: #666; font-style: italic;">正在提取三元组...</div>';
            }
            
            let tripleResult;
            try {
                console.log('准备调用extractTriples...');
                tripleResult = await window.llmManager.extractTriples(userInputText);
                console.log('extractTriples调用完成');
                console.log('三元组提取返回结果:', tripleResult);
            } catch (error) {
                console.error('三元组提取异常:', error);
                updateProcessStatus(2, 'error', null, 'description');
                showMessage('三元组提取异常：' + error.message, 'error');
                if (newStreamingDiv) {
                    newStreamingDiv.innerHTML = userInputText + '<br><br><div style="color: red;">三元组提取异常: ' + error.message + '</div>';
                }
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            const step2Duration = ((performance.now() - step2Start) / 1000).toFixed(2) + 's';
            
            if (!tripleResult || !tripleResult.success || !tripleResult.triples || tripleResult.triples.length === 0) {
                console.error('❌ 三元组提取失败，详细信息:', tripleResult);
                updateProcessStatus(2, 'error', null, 'description');
                const errorMsg = tripleResult?.message || tripleResult?.error || '未知错误';
                showMessage('三元组提取失败：' + errorMsg, 'error');
                if (newStreamingDiv) {
                    let errorHtml = userInputText + '<br><br><div style="color: #dc3545; background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545;">';
                    errorHtml += '<strong>❌ 三元组提取失败</strong><br><br>';
                    errorHtml += '<div style="color: #333;">' + errorMsg + '</div>';
                    
                    // 如果有原始响应，显示出来供调试
                    if (tripleResult?.rawResponse) {
                        errorHtml += '<br><details style="cursor: pointer;"><summary style="color: #666;">查看AI原始响应（用于调试）</summary>';
                        const escapedResponse = tripleResult.rawResponse
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                        errorHtml += '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px; font-size: 12px;">' + 
                                     escapedResponse + '</pre>';
                        errorHtml += '</details>';
                    }
                    
                    errorHtml += '</div>';
                    newStreamingDiv.innerHTML = errorHtml;
                }
                isGenerating = false;
                resetGenerateButtons();
                return;
            }
            
            console.log('三元组提取成功，数量:', tripleResult.triples.length, '三元组列表:', tripleResult.triples);
            updateProcessStatus(2, 'completed', step2Duration, 'description');
            
            // 恢复原始文本，移除"正在提取三元组..."的提示
            if (newStreamingDiv) {
                newStreamingDiv.textContent = userInputText;
            }
            
            // === 步骤3：概念图的生成（数据处理+渲染） ===
            const step3Start = performance.now();
            updateProcessStatus(3, 'active', null, 'description');
            
            // 将三元组转换为概念图数据
            console.log('开始将三元组转换为概念图数据...');
            const conceptData = window.convertTriplesToConceptData(tripleResult.triples);
            console.log('概念图数据转换完成:', conceptData);
            
            const graphData = window.convertToD3Format(conceptData);
            console.log('D3格式数据转换完成:', graphData);
            
            // 渲染概念图
            displayConceptMap(graphData);
            
            // 更新显示信息（使用用户输入的文本）
            updateGenerationInfo('description', data, conceptData, userInputText, '');
            
            const step3Duration = ((performance.now() - step3Start) / 1000).toFixed(2) + 's';
            updateProcessStatus(3, 'completed', step3Duration, 'description');
            
            // === 步骤4：完成 ===
            const totalDuration = ((performance.now() - totalStartTime) / 1000).toFixed(2) + 's';
            updateProcessStatus(4, 'completed', totalDuration, 'description');
            
            showMessage('概念图生成完成！', 'success');
        }
        
    } catch (error) {
        console.error('生成过程出错:', error);
        updateProcessStatus(1, 'error'); // 标记为概念图文本内容生成阶段错误
        showMessage('生成失败，请稍后重试', 'warning');
    } finally {
        isGenerating = false;
        hideLoadingState();
        resetGenerateButtons();
        
        // 启用布局下拉框
        if (window.layoutSelect) {
            window.layoutSelect.disabled = false;
            console.log('布局下拉框已启用');
        }
        
        // 恢复迷思概念探查的生成按钮状态（如果存在）
        if (window.misconceptionGenerateBtn) {
            window.misconceptionGenerateBtn.disabled = false;
            window.misconceptionGenerateBtn.textContent = '🗺️ 一键生成思维导图';
            window.misconceptionGenerateBtn.classList.remove('loading');
            window.misconceptionGenerateBtn = null;
        }
    }
}

function generateFocusQuestion(type, data) {
    let focusQuestion = '';
    if (type === 'keyword') {
        // 焦点问题模式 - 直接使用用户输入的内容
        const keyword = data.keyword;
        focusQuestion = `焦点问题：${keyword}`;
    } else {
        // 文本分析模式
        const textContent = data.description;
        // 提取核心概念
        let coreConcept = '';
        if (textContent.length <= 6) {
            coreConcept = textContent;
        } else {
            // 尝试找到句子的主语或核心名词
            const sentences = textContent.split(/[。！？，；]/);
            const firstSentence = sentences[0].trim();
            if (firstSentence.length <= 6) {
                coreConcept = firstSentence;
            } else {
                // 提取前6个字符作为核心概念
                coreConcept = firstSentence.substring(0, 6) + '...';
            }
        }
        focusQuestion = `焦点问题：${coreConcept}`;
    }
    
    // 将焦点问题存储到全局变量中
    window.focusQuestion = focusQuestion;
}

function clearPreviousConceptMap() {
    console.log('开始清除之前的概念图内容...');
    
    // 清空AI介绍文字（现在在control-bar中）
    const aiIntroText = document.getElementById('aiIntroText');
    if (aiIntroText) {
        aiIntroText.innerHTML = '';
        aiIntroText.className = 'intro-text-compact';
    }
    
    // 清空当前流程文本（现在在control-bar中）
    const processText = document.getElementById('processText');
    if (processText) {
        processText.innerHTML = '';
        processText.className = 'process-text-compact';
    }
    
    // 清空概念节点和关系连接列表区域
    const conceptListsArea = document.getElementById('conceptListsArea');
    if (conceptListsArea) {
        conceptListsArea.innerHTML = '';
        conceptListsArea.style.display = 'none';
    }
    
    // 恢复SVG画布（如果之前被上传图片替换了）
    const graphCanvas = document.querySelector('.graph-canvas-fullwidth') || document.querySelector('.graph-canvas');
    let svg = document.querySelector('.concept-graph');
    
    if (!svg && graphCanvas) {
        // SVG不存在，说明之前被上传图片替换了，需要重新创建
        console.log('检测到SVG被替换，正在恢复SVG画布...');
        graphCanvas.innerHTML = '';
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '1200');
        svg.setAttribute('class', 'concept-graph');
        svg.setAttribute('viewBox', '0 0 2400 1200');
        graphCanvas.appendChild(svg);
    } else if (svg) {
        // SVG存在，只需清空内容
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }
    
    // 清除焦点问题
    window.focusQuestion = null;
    
    // 清空当前图数据
    currentGraphData = { nodes: [], links: [] };
    
    // 重置状态栏
    updateStatusBar({ nodes: [], links: [] });
    
    // 清空历史记录
    clearHistory();
    
    // 重置所有相关状态
    selectedNodeId = null;
    selectedLinkId = null;
    window.isAllNodesSelected = false;
    isDragging = false;
    isLinkCreationMode = false;
    linkSourceNodeId = null;
    linkTargetNodeId = null;
    
    console.log('概念图内容清除完成');
}

//=============================================================================
// DOM初始化和事件绑定
//=============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始获取元素...');
    
    // 初始化大模型交互模块
    if (window.llmManager) {
        window.llmManager.init();
        console.log('大模型交互模块已初始化');
    } else {
        console.error('大模型交互模块未找到');
    }
    
    // 获取DOM元素并设为全局变量（让所有模块都能访问）
    window.misconceptionTopicInput = document.getElementById('misconceptionTopic');
    window.exploreMisconceptionBtn = document.getElementById('exploreMisconceptionBtn');
    window.scaffoldFocusQuestionInput = document.getElementById('scaffoldFocusQuestion');
    window.generateScaffoldConceptMapBtn = document.getElementById('generateScaffoldConceptMapBtn');
    window.scaffoldTypeHigh = document.getElementById('scaffoldTypeHigh');
    window.scaffoldTypeLow = document.getElementById('scaffoldTypeLow');
    window.keywordInput = document.getElementById('keyword');
    window.descriptionTextarea = document.getElementById('description');
    window.keywordBtn = document.getElementById('generateKeywordBtn');
    window.descriptionBtn = document.getElementById('generateDescriptionBtn');
    window.uploadImageInput = document.getElementById('uploadImage');
    window.uploadImageBtn = document.getElementById('uploadImageBtn');
    window.uploadImageForGenerationInput = document.getElementById('uploadImageForGeneration');
    window.uploadImageForGenerationBtn = document.getElementById('uploadImageForGenerationBtn');
    window.resetBtn = document.getElementById('resetViewBtn');
    window.exportBtn = document.getElementById('exportImageBtn');
    window.graphPlaceholder = document.querySelector('.graph-placeholder');
    window.aiIntroText = document.getElementById('aiIntroText');
    
    console.log('基本元素获取结果:');
    console.log('keywordInput:', window.keywordInput);
    console.log('descriptionTextarea:', window.descriptionTextarea);
    console.log('keywordBtn:', window.keywordBtn);
    console.log('descriptionBtn:', window.descriptionBtn);
    console.log('resetBtn:', window.resetBtn);
    console.log('exportBtn:', window.exportBtn);
    console.log('graphPlaceholder:', window.graphPlaceholder);
    
    // 编辑工具栏元素（全局）- 现在在control-bar中
    window.addNodeBtn = document.getElementById('addNodeBtn');
    window.deleteNodeBtn = document.getElementById('deleteNodeBtn');
    window.editNodeBtn = document.getElementById('editNodeBtn');
    window.addLinkBtn = document.getElementById('addLinkBtn');
    window.deleteLinkBtn = document.getElementById('deleteLinkBtn');
    window.editLinkBtn = document.getElementById('editLinkBtn');
    window.layoutSelect = document.getElementById('layoutSelect');
    window.autoLayoutBtn = document.getElementById('autoLayoutBtn');
    
    console.log('编辑工具栏元素获取结果:');
    console.log('addNodeBtn:', window.addNodeBtn);
    console.log('deleteNodeBtn:', window.deleteNodeBtn);
    console.log('editNodeBtn:', window.editNodeBtn);
    console.log('addLinkBtn:', window.addLinkBtn);
    console.log('deleteLinkBtn:', window.deleteLinkBtn);
    console.log('editLinkBtn:', window.editLinkBtn);
    console.log('layoutSelect:', window.layoutSelect);
    console.log('autoLayoutBtn:', window.autoLayoutBtn);
    
    // 当前流程元素（全局）
    window.processText = document.getElementById('processText');
    
    console.log('当前流程元素获取结果:');
    console.log('processText:', window.processText);
    
    // 状态栏元素（全局）
    window.nodeCountSpan = document.getElementById('nodeCount');
    window.linkCountSpan = document.getElementById('linkCount');
    window.downloadBtn = document.getElementById('downloadBtn');
    window.loadBtn = document.getElementById('loadBtn');
    window.undoBtn = document.getElementById('undoBtn');
    window.redoBtn = document.getElementById('redoBtn');
    
    console.log('状态栏元素获取结果:');
    console.log('nodeCountSpan:', window.nodeCountSpan);
    console.log('linkCountSpan:', window.linkCountSpan);
    console.log('downloadBtn:', window.downloadBtn);
    console.log('loadBtn:', window.loadBtn);
    console.log('undoBtn:', window.undoBtn);
    console.log('redoBtn:', window.redoBtn);

    //=============================================================================
    // 事件监听器绑定
    //=============================================================================
    
    // 功能标签页切换事件
    const functionTabs = document.querySelectorAll('.function-tab');
    functionTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // 移除所有活动状态
            functionTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.function-module').forEach(m => m.classList.remove('active'));
            
            // 添加当前标签的活动状态
            this.classList.add('active');
            const targetModule = document.getElementById(`function-${tabId}`);
            if (targetModule) {
                targetModule.classList.add('active');
            }
            
            console.log('切换到功能标签:', tabId);
        });
    });
    
    // 迷思概念探查事件
    if (window.exploreMisconceptionBtn) {
        window.exploreMisconceptionBtn.addEventListener('click', function() {
            console.log('迷思概念探查按钮被点击');
            const topic = window.misconceptionTopicInput.value.trim();
            if (!topic) {
                showMessage('请输入知识点', 'warning');
                return;
            }
            
            // 设置按钮加载状态
            window.exploreMisconceptionBtn.classList.add('loading');
            window.exploreMisconceptionBtn.textContent = '探查中...';
            window.exploreMisconceptionBtn.disabled = true;
            
            console.log('开始探查迷思概念，知识点:', topic);
            
            // 调用迷思概念探查功能
            exploreMisconception(topic);
        });
    }
    
    // 焦点问题生成概念图事件
    if (window.keywordBtn) {
        window.keywordBtn.addEventListener('click', function() {
            console.log('焦点问题生成按钮被点击');
            const keyword = window.keywordInput.value.trim();
            if (!keyword) {
                showMessage('请输入焦点问题', 'warning');
                return;
            }
            
            // 设置按钮加载状态
            window.keywordBtn.classList.add('loading');
            window.keywordBtn.textContent = '生成中...';
            window.keywordBtn.disabled = true;
            
            console.log('开始生成概念图，焦点问题:', keyword);
            generateConceptMapWithLLM('keyword', { keyword: keyword });
        });
    }

    // 文本分析生成概念图事件
    if (window.descriptionBtn) {
        window.descriptionBtn.addEventListener('click', function() {
            console.log('文本分析按钮被点击');
            const description = window.descriptionTextarea.value.trim();
            if (!description) {
                showMessage('请输入描述文本', 'warning');
                return;
            }
            
            // 设置按钮加载状态
            window.descriptionBtn.classList.add('loading');
            window.descriptionBtn.textContent = '生成中...';
            window.descriptionBtn.disabled = true;
            
            console.log('开始生成概念图，描述:', description);
            generateConceptMapWithLLM('description', { description: description });
        });
    }
    
    // 支架概念图生成事件
    if (window.generateScaffoldConceptMapBtn) {
        window.generateScaffoldConceptMapBtn.addEventListener('click', function() {
            console.log('支架概念图生成按钮被点击');
            const focusQuestion = window.scaffoldFocusQuestionInput?.value.trim();
            if (!focusQuestion) {
                showMessage('请输入焦点问题', 'warning');
                return;
            }
            
            // 检查是否选择了支架类型
            const scaffoldType = window.scaffoldTypeHigh?.checked ? 'high' : 
                                window.scaffoldTypeLow?.checked ? 'low' : null;
            
            if (!scaffoldType) {
                showMessage('请选择支架类型（高支架或低支架）', 'warning');
                return;
            }
            
            // 设置按钮加载状态
            window.generateScaffoldConceptMapBtn.classList.add('loading');
            window.generateScaffoldConceptMapBtn.textContent = '生成中...';
            window.generateScaffoldConceptMapBtn.disabled = true;
            
            console.log('开始生成支架概念图，焦点问题:', focusQuestion, '支架类型:', scaffoldType);
            
            // 调用支架概念图生成功能
            if (scaffoldType === 'high') {
                generateHighScaffoldConceptMap(focusQuestion);
            } else {
                // 低支架功能待实现
                showMessage('低支架功能待实现', 'info');
                window.generateScaffoldConceptMapBtn.classList.remove('loading');
                window.generateScaffoldConceptMapBtn.textContent = '生成支架概念图';
                window.generateScaffoldConceptMapBtn.disabled = false;
            }
        });
    }

    // 从图片生成概念图按钮事件
    if (window.uploadImageForGenerationBtn && window.uploadImageForGenerationInput) {
        // 点击上传按钮触发文件选择
        window.uploadImageForGenerationBtn.addEventListener('click', function() {
            console.log('从图片生成概念图按钮被点击');
            window.uploadImageForGenerationInput.click();
        });
        
        // 文件选择后的处理
        window.uploadImageForGenerationInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                console.log('选择的文件:', file.name);
                
                // 验证文件类型
                if (!file.type.startsWith('image/')) {
                    showMessage('请选择图片文件', 'warning');
                    return;
                }
                
                // 验证文件大小（限制为10MB）
                if (file.size > 10 * 1024 * 1024) {
                    showMessage('图片文件大小不能超过10MB', 'warning');
                    return;
                }
                
                showMessage('图片上传中，准备生成概念图...', 'info');
                console.log('图片文件信息 - 名称:', file.name, '大小:', (file.size / 1024).toFixed(2) + 'KB', '类型:', file.type);
                
                // 读取并生成概念图
                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log('图片读取完成，开始生成概念图...');
                    
                    // 生成概念图
                    generateConceptMapFromImage(e.target.result, file.name);
                    
                    // 清空文件输入框，允许重新上传同一文件
                    window.uploadImageForGenerationInput.value = '';
                };
                reader.onerror = function() {
                    showMessage('图片读取失败，请重试', 'error');
                    // 清空文件输入框
                    window.uploadImageForGenerationInput.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 上传图片按钮事件（用于概念图评价）
    if (window.uploadImageBtn && window.uploadImageInput) {
        // 点击上传按钮触发文件选择
        window.uploadImageBtn.addEventListener('click', function() {
            console.log('上传图片按钮被点击');
            window.uploadImageInput.click();
        });
        
        // 文件选择后的处理
        window.uploadImageInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                console.log('选择的文件:', file.name);
                
                // 验证文件类型
                if (!file.type.startsWith('image/')) {
                    showMessage('请选择图片文件', 'warning');
                    return;
                }
                
                // 验证文件大小（限制为10MB）
                if (file.size > 10 * 1024 * 1024) {
                    showMessage('图片文件大小不能超过10MB', 'warning');
                    return;
                }
                
                showMessage('图片上传中...', 'info');
                console.log('图片文件信息 - 名称:', file.name, '大小:', (file.size / 1024).toFixed(2) + 'KB', '类型:', file.type);
                
                // 读取并显示图片
                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log('图片读取完成，开始显示...');
                    
                    // 显示上传的图片
                    displayUploadedImage(e.target.result, file.name);
                    
                    showMessage('图片上传成功: ' + file.name, 'success');
                    
                    // 清空文件输入框，允许重新上传同一文件
                    window.uploadImageInput.value = '';
                };
                reader.onerror = function() {
                    showMessage('图片读取失败，请重试', 'error');
                    // 清空文件输入框
                    window.uploadImageInput.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 重置视图按钮事件
    if (window.resetBtn) {
        window.resetBtn.addEventListener('click', function() {
            console.log('重置视图按钮被点击');
            resetView();
        });
    }

    // 导出图片按钮事件
    if (window.exportBtn) {
        window.exportBtn.addEventListener('click', function() {
            console.log('导出图片按钮被点击');
            exportConceptMap();
        });
    }

    // 编辑工具栏事件绑定
    if (window.addNodeBtn) {
        window.addNodeBtn.addEventListener('click', function() {
            console.log('添加节点按钮被点击');
            addNewNode();
        });
    }

    if (window.deleteNodeBtn) {
        window.deleteNodeBtn.addEventListener('click', function() {
            console.log('删除节点按钮被点击');
            deleteSelectedNode();
        });
    }

    if (window.editNodeBtn) {
        window.editNodeBtn.addEventListener('click', function() {
            console.log('编辑节点按钮被点击');
            editSelectedNode();
        });
    }

    if (window.addLinkBtn) {
        window.addLinkBtn.addEventListener('click', function() {
            console.log('添加连线按钮被点击');
            addNewLink();
        });
    }

    if (window.deleteLinkBtn) {
        window.deleteLinkBtn.addEventListener('click', function() {
            console.log('删除连线按钮被点击');
            deleteSelectedLink();
        });
    }

    if (window.editLinkBtn) {
        window.editLinkBtn.addEventListener('click', function() {
            console.log('编辑连线按钮被点击');
            editSelectedLink();
        });
    }

    if (window.layoutSelect) {
        window.layoutSelect.addEventListener('change', function() {
            console.log('布局选择改变:', window.layoutSelect.value);
            changeLayout(window.layoutSelect.value);
        });
    }

    if (window.autoLayoutBtn) {
        window.autoLayoutBtn.addEventListener('click', function() {
            console.log('自动布局按钮被点击');
            applyAutoLayout();
        });
    }

    // 状态栏按钮事件
    if (window.downloadBtn) {
        window.downloadBtn.addEventListener('click', function() {
            console.log('下载图片按钮被点击');
            downloadConceptMapImage();
        });
    }

    if (window.loadBtn) {
        window.loadBtn.addEventListener('click', function() {
            console.log('加载数据按钮被点击');
            loadConceptMap();
        });
    }

    if (window.undoBtn) {
        window.undoBtn.addEventListener('click', function() {
            console.log('撤销按钮被点击');
            undoOperation();
        });
    }

    if (window.redoBtn) {
        window.redoBtn.addEventListener('click', function() {
            console.log('重做按钮被点击');
            redoOperation();
        });
    }

    // 键盘快捷键事件监听
    document.addEventListener('keydown', function(e) {
        // 如果正在输入文本，不处理快捷键
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        )) {
            // 如果按的是 Delete 或 Backspace，且不在输入框中，可以删除
            if ((e.key === 'Delete' || e.key === 'Backspace') && 
                activeElement.tagName !== 'INPUT' && 
                activeElement.tagName !== 'TEXTAREA') {
                // 允许删除操作
            } else {
                return; // 其他快捷键在输入框中不处理
            }
        }
        
        // Ctrl+Z: 撤销
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            console.log('Ctrl+Z 被按下，执行撤销操作');
            if (typeof undoOperation === 'function') {
                undoOperation();
            }
            return;
        }
        
        // Ctrl+Shift+Z 或 Ctrl+Y: 重做
        if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            console.log('Ctrl+Shift+Z 或 Ctrl+Y 被按下，执行重做操作');
            if (typeof redoOperation === 'function') {
                redoOperation();
            }
            return;
        }
        
        // Ctrl+A: 全选节点
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            console.log('Ctrl+A 被按下，执行全选节点操作');
            if (typeof selectAllNodes === 'function') {
                selectAllNodes();
            }
            return;
        }
        
        // Delete 或 Backspace: 删除选中的节点或连线
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // 检查是否有选中的节点
            if (selectedNodeId) {
                e.preventDefault();
                console.log('Delete/Backspace 被按下，删除选中的节点:', selectedNodeId);
                if (typeof deleteSelectedNode === 'function') {
                    deleteSelectedNode();
                }
                return;
            }
            
            // 检查是否有选中的连线
            if (selectedLinkId) {
                e.preventDefault();
                console.log('Delete/Backspace 被按下，删除选中的连线:', selectedLinkId);
                if (typeof deleteSelectedLink === 'function') {
                    deleteSelectedLink();
                }
                return;
            }
        }
    });

    // 初始化页面
    initializePage();
});

