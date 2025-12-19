import React from 'react';
import { CommonQuestionsPanelFull } from '../CommonQuestionsPanel';

const QuestionsTab = ({ questions, onQuestionsChange }) => {
  return (
    <CommonQuestionsPanelFull
      questions={questions}
      onQuestionsChange={onQuestionsChange}
    />
  );
};

export default QuestionsTab;

