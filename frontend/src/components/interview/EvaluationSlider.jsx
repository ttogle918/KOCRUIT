import React from 'react';
import { Typography, Slider, Paper } from '@mui/material';

const EvaluationSlider = ({ 
  category, 
  label, 
  value, 
  onChange, 
  max = 10, 
  step = 1,
  marks = true,
  valueLabelDisplay = "auto"
}) => {
  return (
    <div className="w-full md:w-1/2 p-2">
      <div className="mb-3">
        <Typography variant="body2" className="text-gray-700 dark:text-gray-300 mb-1">
          {label}: {value}/{max}
        </Typography>
        <Slider
          value={value}
          onChange={(e, newValue) => onChange(category, newValue)}
          min={0}
          max={max}
          step={step}
          marks={marks}
          valueLabelDisplay={valueLabelDisplay}
          color="primary"
        />
      </div>
    </div>
  );
};

export default EvaluationSlider;
