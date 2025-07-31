import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiSave, FiX, FiTarget, FiStar } from 'react-icons/fi';
import api from '../api/api';

const EvaluationCriteriaManager = ({ 
  applicationId, 
  interviewStage, 
  onCriteriaChange,
  initialCriteria = null 
}) => {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItems, setEditingItems] = useState([]);

  // 평가항목 로딩
  useEffect(() => {
    if (applicationId && interviewStage) {
      loadEvaluationCriteria();
    }
  }, [applicationId, interviewStage]);

  const loadEvaluationCriteria = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = interviewStage === 'practical' 
        ? `/ai-interview/practical-evaluation-criteria/${applicationId}`
        : `/ai-interview/executive-evaluation-criteria/${applicationId}`;
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setCriteria(response.data.evaluation_criteria);
        setEditingItems(response.data.evaluation_criteria.evaluation_items || []);
        onCriteriaChange?.(response.data.evaluation_criteria);
      }
    } catch (error) {
      console.error('평가항목 로딩 실패:', error);
      setError('평가항목을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 평가항목 추가
  const addEvaluationItem = () => {
    const newItem = {
      item_name: '',
      description: '',
      max_score: 10,
      weight: 0.2,
      scoring_criteria: {
        "9-10점": "우수한 역량",
        "7-8점": "양호한 역량",
        "5-6점": "보통 수준의 역량",
        "3-4점": "미흡한 역량",
        "1-2점": "부족한 역량"
      },
      evaluation_questions: []
    };
    
    setEditingItems([...editingItems, newItem]);
  };

  // 평가항목 수정
  const updateEvaluationItem = (index, field, value) => {
    const updatedItems = [...editingItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditingItems(updatedItems);
  };

  // 평가항목 삭제
  const removeEvaluationItem = (index) => {
    const updatedItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(updatedItems);
  };

  // 평가 질문 추가
  const addEvaluationQuestion = (itemIndex) => {
    const updatedItems = [...editingItems];
    if (!updatedItems[itemIndex].evaluation_questions) {
      updatedItems[itemIndex].evaluation_questions = [];
    }
    updatedItems[itemIndex].evaluation_questions.push('');
    setEditingItems(updatedItems);
  };

  // 평가 질문 수정
  const updateEvaluationQuestion = (itemIndex, questionIndex, value) => {
    const updatedItems = [...editingItems];
    updatedItems[itemIndex].evaluation_questions[questionIndex] = value;
    setEditingItems(updatedItems);
  };

  // 평가 질문 삭제
  const removeEvaluationQuestion = (itemIndex, questionIndex) => {
    const updatedItems = [...editingItems];
    updatedItems[itemIndex].evaluation_questions.splice(questionIndex, 1);
    setEditingItems(updatedItems);
  };

  // 저장
  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 가중치 합계 검증
      const totalWeight = editingItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        setError('가중치의 합계가 1.0이 되어야 합니다. (현재: ' + totalWeight.toFixed(2) + ')');
        setIsLoading(false);
        return;
      }

      const criteriaData = {
        resume_id: criteria?.resume_id || 1, // 임시값
        interview_stage: interviewStage,
        company_name: criteria?.company_name || '회사명',
        evaluation_type: 'resume_based',
        evaluation_items: editingItems
      };

      if (criteria?.id) {
        // 수정
        await api.put(`/ai-interview/evaluation-criteria/${criteria.id}`, criteriaData);
      } else {
        // 생성
        await api.post('/ai-interview/evaluation-criteria', criteriaData);
      }

      setIsEditing(false);
      await loadEvaluationCriteria();
      
    } catch (error) {
      console.error('평가항목 저장 실패:', error);
      setError('평가항목 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 취소
  const handleCancel = () => {
    setIsEditing(false);
    setEditingItems(criteria?.evaluation_items || []);
    setError(null);
  };

  if (isLoading && !criteria) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">평가항목을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FiTarget className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {interviewStage === 'practical' ? '실무진' : '임원진'} 면접 평가항목 관리
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiEdit className="w-4 h-4 mr-1" />
              수정
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <FiSave className="w-4 h-4 mr-1" />
                {isLoading ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FiX className="w-4 h-4 mr-1" />
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!isEditing ? (
        // 읽기 모드
        <div className="space-y-4">
          {criteria?.evaluation_items?.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>가중치: {(item.weight * 100).toFixed(0)}%</span>
                  <span>최대점수: {item.max_score}점</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
              
              {item.evaluation_questions && item.evaluation_questions.length > 0 && (
                <div className="text-xs text-gray-500">
                  <strong>평가 질문:</strong>
                  <ul className="mt-1 space-y-1">
                    {item.evaluation_questions.map((question, qIndex) => (
                      <li key={qIndex} className="pl-2">• {question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // 편집 모드
        <div className="space-y-6">
          {editingItems.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">평가항목 {index + 1}</h4>
                <button
                  onClick={() => removeEvaluationItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    항목명 *
                  </label>
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => updateEvaluationItem(index, 'item_name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 기술적 전문성"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 점수
                  </label>
                  <input
                    type="number"
                    value={item.max_score}
                    onChange={(e) => updateEvaluationItem(index, 'max_score', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가중치 (0.0 ~ 1.0) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={item.weight}
                    onChange={(e) => updateEvaluationItem(index, 'weight', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateEvaluationItem(index, 'description', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="평가항목에 대한 설명을 입력하세요"
                />
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    평가 질문
                  </label>
                  <button
                    onClick={() => addEvaluationQuestion(index)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <FiPlus className="w-3 h-3 mr-1" />
                    질문 추가
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(item.evaluation_questions || []).map((question, qIndex) => (
                    <div key={qIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => updateEvaluationQuestion(index, qIndex, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="평가 질문을 입력하세요"
                      />
                      <button
                        onClick={() => removeEvaluationQuestion(index, qIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addEvaluationItem}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4 mr-1" />
            평가항목 추가
          </button>
        </div>
      )}
    </div>
  );
};

export default EvaluationCriteriaManager; 