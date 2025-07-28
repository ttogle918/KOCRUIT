-- orange_highlights 컬럼 추가 (기존 gray_highlights를 orange_highlights로 변경)
USE kocruit;

-- 기존 gray_highlights 컬럼을 orange_highlights로 이름 변경
ALTER TABLE highlight_result 
CHANGE COLUMN gray_highlights orange_highlights JSON;

-- 컬럼 변경 확인
DESCRIBE highlight_result;

-- 기존 데이터가 있다면 orange_highlights 컬럼이 제대로 생성되었는지 확인
SELECT 'orange_highlights column added successfully' as status; 