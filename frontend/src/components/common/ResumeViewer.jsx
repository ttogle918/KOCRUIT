import React from 'react';
import { FaFileAlt, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGraduationCap, FaBriefcase } from 'react-icons/fa';

const ResumeViewer = ({ resumeInfo, applicantName }) => {
  if (!resumeInfo) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FaFileAlt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>이력서 정보를 불러오는 중...</p>
      </div>
    );
  }

  try {
    const parsedResume = typeof resumeInfo === 'string' ? JSON.parse(resumeInfo) : resumeInfo;
    
    return (
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FaUser className="w-4 h-4 mr-2" />
            기본 정보
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <FaUser className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">이름:</span>
              <span className="ml-2">{parsedResume.name || applicantName}</span>
            </div>
            <div className="flex items-center">
              <FaPhone className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">연락처:</span>
              <span className="ml-2">{parsedResume.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <FaEnvelope className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">이메일:</span>
              <span className="ml-2">{parsedResume.email || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">주소:</span>
              <span className="ml-2">{parsedResume.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* 학력 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FaGraduationCap className="w-4 h-4 mr-2" />
            학력
          </h3>
          <div className="space-y-2 text-sm">
            {parsedResume.education?.map((edu, index) => (
              <div key={index} className="border-l-2 border-blue-500 pl-3">
                <div className="font-medium">{edu.school}</div>
                <div className="text-gray-600">{edu.major} • {edu.degree}</div>
                <div className="text-gray-500">{edu.period}</div>
              </div>
            )) || <p className="text-gray-500">학력 정보가 없습니다</p>}
          </div>
        </div>

        {/* 경력 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FaBriefcase className="w-4 h-4 mr-2" />
            경력
          </h3>
          <div className="space-y-2 text-sm">
            {parsedResume.experience?.map((exp, index) => (
              <div key={index} className="border-l-2 border-green-500 pl-3">
                <div className="font-medium">{exp.company}</div>
                <div className="text-gray-600">{exp.position}</div>
                <div className="text-gray-500">{exp.period}</div>
                <div className="text-gray-700 mt-1">{exp.description}</div>
              </div>
            )) || <p className="text-gray-500">경력 정보가 없습니다</p>}
          </div>
        </div>

        {/* 기술 스택 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">기술 스택</h3>
          <div className="flex flex-wrap gap-2">
            {parsedResume.skills?.map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {skill}
              </span>
            )) || <p className="text-gray-500">기술 스택 정보가 없습니다</p>}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('이력서 정보 파싱 오류:', error);
    return (
      <div className="text-center py-8 text-gray-500">
        <FaFileAlt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>이력서 정보를 불러오는 중...</p>
      </div>
    );
  }
};

export default ResumeViewer;

