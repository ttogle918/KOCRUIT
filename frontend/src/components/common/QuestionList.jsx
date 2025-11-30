import React from 'react';

const QuestionList = ({ questions, currentQuestion, onQuestionSelect, questionNotes, onNoteChange, onSaveNote }) => {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={index} className={`p-4 rounded-lg border-2 transition-colors ${
          currentQuestion === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-sm font-medium text-gray-600">질문 {index + 1}</span>
            <button
              onClick={() => onQuestionSelect(index)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                currentQuestion === index 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              선택
            </button>
          </div>
          
          <p className="text-gray-900 mb-3">{question}</p>
          
          {/* 질문별 메모 */}
          <div className="space-y-2">
            <textarea
              placeholder="이 질문에 대한 메모를 입력하세요..."
              value={questionNotes[index] || ''}
              onChange={(e) => onNoteChange(index, e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
            />
            <button
              onClick={() => onSaveNote(index)}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              메모 저장
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionList;

