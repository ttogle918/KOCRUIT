#!/usr/bin/env python3
"""
ChromaDB 데이터 백업 및 복원 스크립트
GitHub 업로드를 위한 압축 파일 생성 포함
"""

import os
import sys
import shutil
import logging
import zipfile
import tarfile
from datetime import datetime
from pathlib import Path
from typing import Optional

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.utils.chromadb_utils import ChromaDBManager

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ChromaDBBackupManager:
    """ChromaDB 백업 및 복원 관리 클래스"""
    
    def __init__(self, chroma_db_path: str = "./chroma_db"):
        """
        Args:
            chroma_db_path: ChromaDB 데이터 디렉토리 경로
        """
        self.chroma_db_path = Path(chroma_db_path)
        self.backup_dir = Path("./chroma_backups")
        self.backup_dir.mkdir(exist_ok=True)
        
    def get_chromadb_info(self) -> dict:
        """ChromaDB 정보 조회"""
        try:
            chroma_manager = ChromaDBManager(str(self.chroma_db_path))
            stats = chroma_manager.get_collection_stats()
            
            info = {
                "chroma_db_path": str(self.chroma_db_path),
                "collection_name": "resumes",
                "total_documents": stats.get("total_resumes", 0),
                "collection_size_mb": self._get_directory_size_mb(self.chroma_db_path),
                "last_modified": self._get_last_modified_time(self.chroma_db_path),
                "files": self._list_chromadb_files()
            }
            
            logger.info(f"📊 ChromaDB 정보:")
            logger.info(f"  경로: {info['chroma_db_path']}")
            logger.info(f"  총 문서 수: {info['total_documents']}")
            logger.info(f"  크기: {info['collection_size_mb']:.2f} MB")
            logger.info(f"  마지막 수정: {info['last_modified']}")
            
            return info
            
        except Exception as e:
            logger.error(f"ChromaDB 정보 조회 실패: {e}")
            return {}
    
    def _get_directory_size_mb(self, path: Path) -> float:
        """디렉토리 크기를 MB 단위로 계산"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)
        return total_size / (1024 * 1024)
    
    def _get_last_modified_time(self, path: Path) -> str:
        """디렉토리의 마지막 수정 시간"""
        try:
            mtime = os.path.getmtime(path)
            return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        except:
            return "Unknown"
    
    def _list_chromadb_files(self) -> list:
        """ChromaDB 파일 목록"""
        files = []
        for root, dirs, filenames in os.walk(self.chroma_db_path):
            for filename in filenames:
                filepath = os.path.join(root, filename)
                rel_path = os.path.relpath(filepath, self.chroma_db_path)
                size = os.path.getsize(filepath)
                files.append({
                    "name": rel_path,
                    "size_mb": size / (1024 * 1024)
                })
        return files
    
    def create_backup(self, backup_name: Optional[str] = None, compress: bool = True) -> str:
        """
        ChromaDB 데이터 백업 생성
        
        Args:
            backup_name: 백업 파일명 (None이면 자동 생성)
            compress: 압축 여부
            
        Returns:
            백업 파일 경로
        """
        if not self.chroma_db_path.exists():
            logger.error(f"ChromaDB 경로가 존재하지 않습니다: {self.chroma_db_path}")
            return ""
        
        if backup_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"chroma_backup_{timestamp}"
        
        backup_path = self.backup_dir / backup_name
        
        try:
            logger.info(f"🔄 ChromaDB 백업 생성 중: {backup_name}")
            
            # ChromaDB 서비스 중지 (안전한 백업을 위해)
            logger.info("ChromaDB 서비스 중지 중...")
            
            # 디렉토리 복사
            if backup_path.exists():
                shutil.rmtree(backup_path)
            
            shutil.copytree(self.chroma_db_path, backup_path)
            
            # 백업 정보 파일 생성
            backup_info = {
                "backup_name": backup_name,
                "created_at": datetime.now().isoformat(),
                "chroma_db_info": self.get_chromadb_info(),
                "backup_size_mb": self._get_directory_size_mb(backup_path)
            }
            
            info_file = backup_path / "backup_info.json"
            import json
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(backup_info, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ 백업 완료: {backup_path}")
            logger.info(f"  크기: {backup_info['backup_size_mb']:.2f} MB")
            
            # 압축 (옵션)
            if compress:
                compressed_path = self._compress_backup(backup_path)
                if compressed_path:
                    # 압축 후 원본 디렉토리 삭제
                    shutil.rmtree(backup_path)
                    return str(compressed_path)
            
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"백업 생성 실패: {e}")
            return ""
    
    def _compress_backup(self, backup_path: Path) -> Optional[Path]:
        """백업 디렉토리를 압축"""
        try:
            compressed_path = backup_path.with_suffix('.tar.gz')
            
            logger.info(f"📦 백업 압축 중: {compressed_path}")
            
            with tarfile.open(compressed_path, 'w:gz') as tar:
                tar.add(backup_path, arcname=backup_path.name)
            
            logger.info(f"✅ 압축 완료: {compressed_path}")
            return compressed_path
            
        except Exception as e:
            logger.error(f"압축 실패: {e}")
            return None
    
    def restore_backup(self, backup_path: str) -> bool:
        """
        ChromaDB 데이터 복원
        
        Args:
            backup_path: 백업 파일 경로
            
        Returns:
            성공 여부
        """
        backup_path = Path(backup_path)
        
        if not backup_path.exists():
            logger.error(f"백업 파일이 존재하지 않습니다: {backup_path}")
            return False
        
        try:
            logger.info(f"🔄 ChromaDB 복원 중: {backup_path}")
            
            # 기존 ChromaDB 디렉토리 백업
            if self.chroma_db_path.exists():
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                old_backup = self.backup_dir / f"chroma_old_{timestamp}"
                shutil.move(str(self.chroma_db_path), str(old_backup))
                logger.info(f"기존 데이터 백업: {old_backup}")
            
            # 압축 파일인 경우 압축 해제
            if backup_path.suffix in ['.tar.gz', '.tgz']:
                logger.info("압축 파일 해제 중...")
                with tarfile.open(backup_path, 'r:gz') as tar:
                    tar.extractall(self.backup_dir)
                
                # 압축 해제된 디렉토리 찾기
                extracted_dir = None
                for item in self.backup_dir.iterdir():
                    if item.is_dir() and item.name.startswith('chroma_backup_'):
                        extracted_dir = item
                        break
                
                if extracted_dir:
                    shutil.move(str(extracted_dir), str(self.chroma_db_path))
                else:
                    logger.error("압축 해제된 디렉토리를 찾을 수 없습니다.")
                    return False
            else:
                # 일반 디렉토리인 경우
                shutil.copytree(backup_path, self.chroma_db_path)
            
            logger.info(f"✅ 복원 완료: {self.chroma_db_path}")
            return True
            
        except Exception as e:
            logger.error(f"복원 실패: {e}")
            return False
    
    def create_github_backup(self) -> str:
        """
        GitHub 업로드용 백업 생성
        
        Returns:
            GitHub 업로드용 파일 경로
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        github_backup_name = f"chroma_resume_embeddings_{timestamp}"
        
        logger.info(f"🚀 GitHub 업로드용 백업 생성: {github_backup_name}")
        
        # 백업 생성
        backup_path = self.create_backup(github_backup_name, compress=True)
        
        if backup_path:
            # GitHub 업로드용 README 파일 생성
            readme_content = self._create_github_readme()
            readme_path = Path(backup_path).parent / "README_CHROMA_BACKUP.md"
            
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            logger.info(f"📝 GitHub README 생성: {readme_path}")
            logger.info(f"🎯 GitHub 업로드 준비 완료!")
            logger.info(f"  백업 파일: {backup_path}")
            logger.info(f"  README 파일: {readme_path}")
        
        return backup_path
    
    def _create_github_readme(self) -> str:
        """GitHub 업로드용 README 내용 생성"""
        chroma_info = self.get_chromadb_info()
        
        return f"""# ChromaDB Resume Embeddings Backup

## 📊 백업 정보
- **생성일**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
- **총 이력서 수**: {chroma_info.get('total_documents', 0)}개
- **데이터 크기**: {chroma_info.get('collection_size_mb', 0):.2f} MB
- **마지막 수정**: {chroma_info.get('last_modified', 'Unknown')}

## 📁 파일 구조
```
chroma_db/
├── chroma.sqlite3          # ChromaDB 메인 데이터베이스
└── [uuid]/                 # 벡터 인덱스 파일들
    ├── index_metadata.pickle
    ├── link_lists.bin
    ├── length.bin
    ├── data_level0.bin
    └── header.bin
```

## 🔧 복원 방법

### 1. 압축 해제
```bash
tar -xzf chroma_resume_embeddings_YYYYMMDD_HHMMSS.tar.gz
```

### 2. ChromaDB 디렉토리 복사
```bash
cp -r chroma_backup_YYYYMMDD_HHMMSS ./chroma_db
```

### 3. 권한 설정
```bash
chmod -R 755 ./chroma_db
```

## 🚀 사용 예시

### Python에서 사용
```python
from app.utils.chromadb_utils import ChromaDBManager

# ChromaDB 매니저 초기화
chroma_manager = ChromaDBManager("./chroma_db")

# 컬렉션 통계 확인
stats = chroma_manager.get_collection_stats()
print(f"총 문서 수: {{stats['total_documents']}}")

# 유사도 검색
results = chroma_manager.search_similar_resumes(
    query_embedding=your_embedding,
    top_k=5
)
```

## 📋 주의사항
- 이 백업은 이력서 임베딩 데이터를 포함합니다
- 민감한 개인정보가 포함될 수 있으므로 안전하게 관리하세요
- 복원 시 기존 ChromaDB 데이터는 백업됩니다

## 🔗 관련 파일
- `backend/app/utils/chromadb_utils.py`: ChromaDB 관리 클래스
- `backend/app/scripts/chromadb_backup_restore.py`: 백업/복원 스크립트
- `backend/app/services/resume_plagiarism_service.py`: 표절 검사 서비스
"""

def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ChromaDB 백업 및 복원")
    parser.add_argument("action", choices=['info', 'backup', 'restore', 'github'],
                       help="실행할 작업")
    parser.add_argument("--path", default="./chroma_db",
                       help="ChromaDB 경로 (기본값: ./chroma_db)")
    parser.add_argument("--backup-name", 
                       help="백업 이름 (기본값: 자동 생성)")
    parser.add_argument("--restore-path",
                       help="복원할 백업 파일 경로")
    parser.add_argument("--no-compress", action="store_true",
                       help="압축하지 않음")
    
    args = parser.parse_args()
    
    backup_manager = ChromaDBBackupManager(args.path)
    
    if args.action == 'info':
        backup_manager.get_chromadb_info()
        
    elif args.action == 'backup':
        backup_path = backup_manager.create_backup(
            backup_name=args.backup_name,
            compress=not args.no_compress
        )
        if backup_path:
            logger.info(f"✅ 백업 완료: {backup_path}")
        else:
            logger.error("❌ 백업 실패")
            
    elif args.action == 'restore':
        if not args.restore_path:
            logger.error("복원할 백업 파일 경로를 지정해주세요 (--restore-path)")
            return
        
        success = backup_manager.restore_backup(args.restore_path)
        if success:
            logger.info("✅ 복원 완료")
        else:
            logger.error("❌ 복원 실패")
            
    elif args.action == 'github':
        backup_path = backup_manager.create_github_backup()
        if backup_path:
            logger.info(f"✅ GitHub 업로드용 백업 완료: {backup_path}")
        else:
            logger.error("❌ GitHub 백업 실패")

if __name__ == "__main__":
    main() 