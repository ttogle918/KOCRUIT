import React from 'react';

export default function ResumeCard({ resume }) {
  if (!resume) return null;
  
  const safeArray = v => Array.isArray(v) ? v : [];

  // 안전하게 값 추출
  const {
    applicantName:name = '',
    gender = '',
    birthDate = '',
    email = '',
    address = '',
    phone = '',
    educations = [],
    awards = [],
    certificates = [],
    content = '', // 자기소개서
  } = resume || {};

  // 표에서 빈칸을 위한 함수
  const safe = v => v || '';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8 space-y-8 w-full">
      {/* 개인정보 */}
      <section>
        <h3 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-300">개인정보</h3>
        <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <tbody>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 w-24 px-2 py-1">이름</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(name)}</td>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 w-24 px-2 py-1">성별</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(gender)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">생년월일</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(birthDate)}</td>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">이메일</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(email)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">주소</td>
              <td className="border dark:border-gray-700 px-2 py-1" colSpan={3}>{safe(address)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">전화번호</td>
              <td className="border dark:border-gray-700 px-2 py-1" colSpan={3}>{safe(phone)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 학력사항 */}
      <section>
        <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">학력사항</h3>
        <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <tbody>
            {(safeArray(educations).length > 0 ? educations : [{ period: '', schoolName: '', major: '', graduated: false }]).map((edu, idx) => (
              <tr key={idx}>
                <td className="border dark:border-gray-700 px-2 py-1 w-32">{safe(edu.period)}</td>
                <td className="border dark:border-gray-700 px-2 py-1">{safe(edu.schoolName)} {edu.graduated ? '졸업' : ''}</td>
                <td className="border dark:border-gray-700 px-2 py-1">{safe(edu.major)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 수상내역 & 자격증 */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 수상내역 */}
        <section className="flex-1">
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">수상내역</h3>
          <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <tbody>
              {(safeArray(awards).length > 0 ? awards : [{ year: '', name: '', detail: '' }]).map((award, idx) => (
                <tr key={idx}>
                  <td className="border dark:border-gray-700 px-2 py-1 w-20">{safe(award.year)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(award.name)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(award.detail)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {/* 자격증 */}
        <section className="flex-1">
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">자격증</h3>
          <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <tbody>
              {(safeArray(certificates).length > 0 ? certificates : [{ year: '', name: '' }]).map((cert, idx) => (
                <tr key={idx}>
                  <td className="border dark:border-gray-700 px-2 py-1 w-20">{safe(cert.year)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(cert.name)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* 자기소개서 */}
      <section>
        <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">자기소개서</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 text-gray-800 dark:text-gray-100 whitespace-pre-line border dark:border-gray-700 min-h-[80px]">
          {content || ''}
        </div>
      </section>
    </div>
  );
}