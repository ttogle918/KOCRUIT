import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const BatchActionModal = ({ 
  isOpen, 
  onClose, 
  step, 
  setStep, 
  statistics, 
  batchModalData, 
  setBatchModalData, 
  paginatedApplicants, 
  handleConfirm,
  StageName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {step === 1 ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                <FaExclamationTriangle className="text-orange-600 text-xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">실무진 면접 마감 확인</h3>
              <p className="text-sm text-gray-500 mt-2">
                실무진 면접 단계를 마감하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="mt-4 bg-orange-50 p-3 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>영향 범위:</strong> {statistics.practical.total}명의 지원자
                </p>
                <p className="text-sm text-orange-800 mt-1">
                  <strong>처리 내용:</strong> 진행중 → 완료, 완료 → 합격
                </p>
              </div>
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    onChange={(e) => setBatchModalData({ ...batchModalData, confirmed: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    위 작업을 확인했습니다
                  </span>
                </label>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!batchModalData.confirmed}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">최종 확인</h3>
              <p className="text-sm text-gray-500 mt-2">
                다음 지원자들이 영향을 받습니다:
              </p>
              <div className="mt-4 max-h-32 overflow-y-auto">
                {paginatedApplicants
                  .filter(a => a.current_stage === StageName.PRACTICAL_INTERVIEW)
                  .slice(0, 5)
                  .map(applicant => (
                    <div key={applicant.application_id} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-700">{applicant.name}</span>
                      <span className="text-xs text-gray-500">{applicant.stage_status}</span>
                    </div>
                  ))}
                {paginatedApplicants.filter(a => a.current_stage === StageName.PRACTICAL_INTERVIEW).length > 5 && (
                  <p className="text-xs text-gray-500 text-center">... 외 {paginatedApplicants.filter(a => a.current_stage === StageName.PRACTICAL_INTERVIEW).length - 5}명</p>
                )}
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  뒤로
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  마감 실행
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchActionModal;

