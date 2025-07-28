import api from './api';

// 성장가능성 예측 API
export const fetchGrowthPrediction = async (applicationId) => {
  try {
    const response = await api.post('/ai/growth-prediction/predict', {
      application_id: applicationId
    }, {
      timeout: 300000 // 5분으로 증가 (AI 분석 시간 고려)
    });
    return response.data;
  } catch (error) {
    console.error('성장가능성 예측 실패:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('성장가능성 예측 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  }
};

// 저장된 성장가능성 예측 결과 조회
export const fetchGrowthPredictionResults = async (applicationId) => {
  try {
    const response = await api.get(`/ai/growth-prediction/results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('성장가능성 예측 결과 조회 실패:', error);
    throw error;
  }
};

// 성장가능성 예측 결과 삭제
export const deleteGrowthPredictionResults = async (applicationId) => {
  try {
    const response = await api.delete(`/ai/growth-prediction/results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('성장가능성 예측 결과 삭제 실패:', error);
    throw error;
  }
}; 