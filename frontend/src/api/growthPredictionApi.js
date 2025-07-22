import axios from './axiosInstance';

export const fetchGrowthPrediction = async (applicationId) => {
  try {
    const res = await axios.post('/growth-prediction/predict', {
      application_id: applicationId
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}; 