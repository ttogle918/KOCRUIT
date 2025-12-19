import React from 'react';
import { MdOutlineVideoLibrary, MdOutlineAnalytics } from 'react-icons/md';
import { FiTarget } from 'react-icons/fi';
import { FaChevronDown } from 'react-icons/fa';

/**
 * AI 면접 동영상 탭 컴포넌트
 * @param {Object} props
 * @param {string} props.videoUrl - 비디오 URL
 * @param {boolean} props.isLoading - 로딩 상태
 * @param {Object} props.applicant - 지원자 정보
 */
const InterviewVideoTab = ({ videoUrl, isLoading, applicant }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">영상을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <MdOutlineVideoLibrary className="text-slate-400 text-4xl" />
        </div>
        <h4 className="text-xl font-black text-slate-800 mb-2">동영상을 찾을 수 없습니다</h4>
        <p className="text-slate-500 max-w-sm mx-auto">
          이 지원자의 AI 면접 영상이 아직 업로드되지 않았거나 <br/>
          경로가 올바르지 않습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MdOutlineVideoLibrary className="text-blue-600" />
          AI 면접 동영상
        </h3>
      </div>

      <div className="space-y-6">
        {/* 비디오 플레이어 영역 */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-video relative group">
          {videoUrl.includes('drive.google.com') ? (
            <iframe
              src={videoUrl.replace('/file/d/', '/embed/').replace('/preview', '')}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              title="AI 면접 동영상"
            />
          ) : (
            <video
              controls
              className="w-full h-full object-contain"
              poster="/video-poster.png"
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl.replace('.mp4', '.webm')} type="video/webm" />
              브라우저가 비디오를 지원하지 않습니다.
            </video>
          )}
        </div>

        {/* 정보 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center">
              <FiTarget className="mr-2" /> 영상 소스 정보
            </h4>
            <p className="text-xs text-blue-600 break-all bg-white/50 p-2 rounded-lg">
              {videoUrl}
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center">
              <MdOutlineAnalytics className="mr-2" /> 시청 안내
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• 구글 드라이브 영상은 권한에 따라 재생이 제한될 수 있습니다.</li>
              <li>• 재생이 안될 경우 우측 하단의 '직접 링크'를 활용하세요.</li>
              <li>• 전체 화면 모드로 더 선명하게 확인하실 수 있습니다.</li>
            </ul>
          </div>
        </div>

        {/* 상세 디버그 정보 (접이식) */}
        <details className="group border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 transition-colors">
            <span className="text-sm font-bold text-slate-700 flex items-center">
              <MdOutlineAnalytics className="mr-2 text-slate-400" /> 고급 디버그 정보
            </span>
            <FaChevronDown className="w-3 h-3 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-6 pb-6 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 mb-1">지원자 ID</p>
                <p className="font-mono font-bold text-slate-700">{applicant?.application_id || applicant?.id}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">URL 타입</p>
                <p className="font-bold text-slate-700">
                  {videoUrl.includes('drive.google.com') ? 'Google Drive' : 
                   videoUrl.startsWith('/static/') ? 'Internal Static' : 'External URL'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 mb-1">Raw URL</p>
                <code className="block bg-slate-50 p-2 rounded border border-slate-100 break-all text-[10px]">
                  {videoUrl}
                </code>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default InterviewVideoTab;

