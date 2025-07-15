import React, { useState } from 'react';

const WrittenTestEditor = ({ questions, testType, onSubmit, loading }) => {
  const [editedQuestions, setEditedQuestions] = useState(questions);

  const handleChange = (idx, value) => {
    const updated = [...editedQuestions];
    updated[idx] = value;
    setEditedQuestions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(editedQuestions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <h2 className="text-xl font-semibold mb-2">{testType === 'coding' ? '코딩테스트 문제' : '직무적합성 평가 문제'}</h2>
      {editedQuestions.map((q, idx) => (
        <div key={idx} className="mb-3">
          <label className="block mb-1 font-medium">문제 {idx + 1}</label>
          <textarea
            className="w-full border rounded p-2 min-h-[60px]"
            value={q}
            onChange={e => handleChange(idx, e.target.value)}
            disabled={loading}
          />
        </div>
      ))}
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        disabled={loading}
      >
        {loading ? '제출 중...' : '문제 제출'}
      </button>
    </form>
  );
};

export default WrittenTestEditor; 