Page({
  data: {
    tempImagePath: '',
    suggestions: [],
    loading: false,
    error: ''
  },

  onLoad: function() {
    // 检查用户授权状态
    wx.getSetting({
      success: res => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              console.log('授权成功')
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          })
        }
      }
    })
  },

  chooseImage: function() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: function(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({
          tempImagePath: tempFilePath,
          error: '',
          suggestions: []
        });
        that.uploadImage(tempFilePath);
      },
      fail: function(err) {
        console.error('选择图片失败：', err);
        that.setData({
          error: '选择图片失败，请重试'
        });
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  uploadImage: function(filePath) {
    const that = this;
    that.setData({ 
      loading: true,
      error: ''
    });

    // 先检查云开发环境是否初始化
    if (!wx.cloud) {
      that.setData({
        loading: false,
        error: '请使用 2.2.3 或以上的基础库以使用云能力'
      });
      wx.showToast({
        title: '请使用 2.2.3 或以上的基础库以使用云能力',
        icon: 'none'
      });
      return;
    }

    wx.cloud.uploadFile({
      cloudPath: 'chat_images/' + Date.now() + '.jpg',
      filePath: filePath,
      success: res => {
        console.log('上传成功：', res);
        if (!res.fileID) {
          console.error('上传成功但未返回fileID');
          that.setData({
            loading: false,
            error: '上传失败，请重试'
          });
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none'
          });
          return;
        }
        that.analyzeImage(res.fileID);
      },
      fail: err => {
        console.error('上传失败：', err);
        that.setData({
          loading: false,
          error: '上传失败，请重试'
        });
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  analyzeImage: function(fileID) {
    const that = this;
    console.log('开始分析图片，fileID：', fileID);
    
    wx.cloud.callFunction({
      name: 'analyzeChat',
      data: {
        fileID: fileID
      },
      success: res => {
        console.log('云函数调用成功，完整响应：', res);
        
        if (!res.result) {
          console.error('云函数返回结果为空');
          that.handleError('分析失败，请重试');
          return;
        }

        if (res.result.success) {
          console.log('分析成功，建议：', res.result.suggestion);
          // 将建议按句号分割成多个建议
          const suggestions = that.parseSuggestions(res.result.suggestion);
          that.setData({
            suggestions: suggestions,
            loading: false,
            error: ''
          });
        } else {
          const errorMsg = res.result.error || '分析失败，请重试';
          console.error('分析失败，错误信息：', errorMsg);
          that.handleError(errorMsg);
        }
      },
      fail: err => {
        console.error('云函数调用失败：', err);
        that.handleError('请检查网络连接后重试');
      }
    });
  },

  parseSuggestions: function(suggestion) {
    // 按句号、问号、感叹号分割
    const sentences = suggestion.split(/[。！？?\n]/).filter(item => {
      return item.trim().length > 0;
    }).map(item => item.trim());
    
    // 过滤出真正的回复建议
    const realSuggestions = sentences.filter(item => {
      // 过滤掉太短的片段
      if (item.length < 10) return false;
      
      // 过滤掉分析性的话语（包含这些关键词的句子）
      const analysisKeywords = [
        '根据', '分析', '建议', '推荐', '可以', '应该', '考虑', '选择',
        '这种', '那种', '方式', '方法', '策略', '技巧', '注意', '避免',
        '如果', '假设', '当', '在', '对于', '关于', '总结', '总之',
        '首先', '其次', '最后', '另外', '此外', '同时', '而且', '但是',
        '不过', '然而', '因此', '所以', '因为', '由于', '既然', '虽然'
      ];
      
      // 检查是否包含分析性关键词
      const hasAnalysisKeyword = analysisKeywords.some(keyword => 
        item.includes(keyword)
      );
      
      // 检查是否是直接的回复（包含引号、或者看起来像对话）
      const isDirectReply = item.includes('"') || 
                           item.includes('"') || 
                           item.includes('：') ||
                           item.includes(':') ||
                           item.startsWith('你可以') ||
                           item.startsWith('我建议') ||
                           item.startsWith('试试') ||
                           item.startsWith('不如') ||
                           item.startsWith('可以');
      
      // 如果包含分析性关键词且不是直接回复，则过滤掉
      if (hasAnalysisKeyword && !isDirectReply) {
        return false;
      }
      
      return true;
    });
    
    return realSuggestions;
  },

  handleError: function(errorMsg) {
    this.setData({
      loading: false,
      error: errorMsg
    });
    wx.showModal({
      title: '分析失败',
      content: errorMsg,
      showCancel: false
    });
  },

  copySuggestion: function(e) {
    const index = e.currentTarget.dataset.index;
    const suggestion = this.data.suggestions[index];
    
    if (!suggestion) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: suggestion,
      success: function() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  }
}); 