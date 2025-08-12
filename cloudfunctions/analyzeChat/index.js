const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const axios = require('axios');

// 检查依赖是否正确加载
console.log('开始初始化云函数');
console.log('wx-server-sdk版本：', cloud.version);
console.log('tencentcloud-sdk-nodejs版本：', tencentcloud.version);
console.log('axios版本：', axios.version);

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 初始化腾讯云OCR客户端
const OcrClient = tencentcloud.ocr.v20181119.Client;
const clientConfig = {
  credential: {
    secretId: process.env.OCR_SECRET_ID,
    secretKey: process.env.OCR_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "ocr.tencentcloudapi.com",
    },
  },
};

console.log('初始化OCR客户端，使用环境变量中的密钥');
const client = new OcrClient(clientConfig);

// DeepSeek API配置
const DEEPSEEK_API_KEY = "sk-";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// 生成AI回复建议
async function generateSuggestion(text) {
  try {
    console.log('开始调用DeepSeek API，文本长度：', text.length);
    
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个专业的恋爱顾问。请直接给出3-5个具体的回复建议，每个建议都要是可以直接复制使用的完整句子。不要包含分析性的话语，只提供实际的回复内容。建议之间用句号分隔。"
        },
        {
          role: "user",
          content: `请分析以下聊天记录，直接给出3-5个具体的回复建议。每个回复要自然、有趣，能促进关系发展。只提供实际的回复内容，不要分析。聊天记录如下：\n\n${text}`
        }
      ],
      temperature: 0.8,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 设置30秒超时
    });

    console.log('DeepSeek API响应状态码：', response.status);
    console.log('DeepSeek API响应数据：', JSON.stringify(response.data));
    
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error('AI返回数据格式错误：', JSON.stringify(response.data));
      throw new Error('AI返回数据格式错误');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败：', error);
    if (error.response) {
      console.error('API响应错误：', error.response.data);
      throw new Error(`AI分析失败：${error.response.data.error?.message || '未知错误'}`);
    } else if (error.request) {
      console.error('请求错误：', error.request);
      throw new Error('AI服务连接失败，请重试');
    } else {
      throw new Error('AI分析失败，请重试');
    }
  }
}

exports.main = async (event, context) => {
  console.log('云函数开始执行，参数：', JSON.stringify(event));
  
  try {
    // 检查OCR密钥配置
    if (!process.env.OCR_SECRET_ID || !process.env.OCR_SECRET_KEY) {
      console.error('OCR密钥未配置');
      throw new Error('OCR服务配置错误，请联系管理员');
    }

    // 1. 下载图片
    const { fileID } = event;
    if (!fileID) {
      throw new Error('未提供文件ID');
    }

    console.log('开始下载文件：', fileID);
    const { fileContent } = await cloud.downloadFile({
      fileID: fileID,
    });
    console.log('文件下载成功，文件大小：', fileContent.length);

    // 2. 调用腾讯云OCR识别文字
    console.log('开始OCR识别');
    const base64Image = fileContent.toString('base64');
    console.log('图片Base64长度：', base64Image.length);
    
    const params = {
      ImageBase64: base64Image,
      LanguageType: "auto" // 自动识别语言
    };
    
    let ocrResult;
    try {
      console.log('发送OCR请求，参数：', JSON.stringify(params));
      ocrResult = await client.GeneralBasicOCR(params);
      console.log('OCR识别结果：', JSON.stringify(ocrResult));
    } catch (error) {
      console.error('OCR识别失败，错误详情：', error);
      if (error.code) {
        console.error('错误代码：', error.code);
        console.error('错误信息：', error.message);
      }
      throw new Error(`图片文字识别失败：${error.message || '请确保图片清晰且包含文字'}`);
    }
    
    if (!ocrResult || !ocrResult.TextDetections || ocrResult.TextDetections.length === 0) {
      console.error('OCR返回结果为空或无效');
      throw new Error('未能识别出文字内容，请确保图片清晰且包含文字');
    }

    const text = ocrResult.TextDetections.map(item => item.DetectedText).join('\n');
    console.log('OCR文本内容：', text);

    if (!text || text.trim() === '') {
      throw new Error('识别出的文字内容为空，请确保图片包含清晰的文字');
    }

    // 3. 生成AI回复建议
    console.log('开始生成AI回复建议');
    const suggestion = await generateSuggestion(text);
    console.log('AI回复建议生成成功：', suggestion);

    if (!suggestion || suggestion.trim() === '') {
      throw new Error('AI未能生成有效的回复建议');
    }

    // 4. 返回结果
    const result = {
      success: true,
      suggestion: suggestion,
      originalText: text
    };
    console.log('云函数执行成功，返回结果：', JSON.stringify(result));
    return result;

  } catch (error) {
    console.error('云函数执行出错：', error);
    const errorResult = {
      success: false,
      error: error.message || '未知错误'
    };
    console.error('返回错误结果：', JSON.stringify(errorResult));
    return errorResult;
  }
}; 