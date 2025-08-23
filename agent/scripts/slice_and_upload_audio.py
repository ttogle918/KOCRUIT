#!/usr/bin/env python3
"""
Slice audio by diarized applicant segments and upload chunks to Google Drive.

Usage examples:
  python agent/scripts/slice_and_upload_audio.py \
    --audio /tmp/audio.wav \
    --drive-folder-id <FOLDER_ID> \
    --service-account-json /path/to/service_account.json \
    --max-chunk-seconds 60

Optional (use interview question logs to cut by question ranges):
  --question-logs /path/to/question_logs.json

Notes:
- Upload requires a service account JSON or OAuth credentials. API keys are not sufficient for uploads.
- If no Drive credentials are provided, the script will still slice locally and print file paths.
"""

import argparse
import os
import sys
import json
import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import librosa
import soundfile as sf

# Ensure repository root is on path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.tools.speech_recognition_tool import SpeechRecognitionTool  # noqa: E402

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.service_account import Credentials as SACredentials
except Exception:
    build = None  # type: ignore
    MediaFileUpload = None  # type: ignore
    SACredentials = None  # type: ignore


def load_audio(audio_path: str, target_sr: int = 16000) -> Tuple[np.ndarray, int]:
    audio, sr = librosa.load(audio_path, sr=target_sr)
    return audio, sr


def choose_applicant_speaker(segments: List[Dict[str, Any]]) -> Optional[str]:
    if not segments:
        return None
    duration_by_speaker: Dict[str, float] = {}
    for seg in segments:
        sid = str(seg.get("speaker", "unknown"))
        dur = float(seg.get("end", 0) - seg.get("start", 0))
        duration_by_speaker[sid] = duration_by_speaker.get(sid, 0.0) + max(dur, 0)
    # Pick the longest speaking speaker as applicant
    return max(duration_by_speaker.items(), key=lambda kv: kv[1])[0] if duration_by_speaker else None


def merge_segments(segments: List[Dict[str, Any]], gap_threshold: float = 0.5) -> List[Dict[str, float]]:
    if not segments:
        return []
    # Sort by start
    segs = sorted(segments, key=lambda s: s["start"])  # type: ignore
    merged: List[Dict[str, float]] = []
    cur_start = segs[0]["start"]
    cur_end = segs[0]["end"]
    for seg in segs[1:]:
        if seg["start"] <= cur_end + gap_threshold:
            cur_end = max(cur_end, seg["end"])
        else:
            merged.append({"start": float(cur_start), "end": float(cur_end)})
            cur_start, cur_end = seg["start"], seg["end"]
    merged.append({"start": float(cur_start), "end": float(cur_end)})
    return merged


def limit_chunk_length(ranges: List[Dict[str, float]], max_seconds: Optional[int]) -> List[Dict[str, float]]:
    if not max_seconds or max_seconds <= 0:
        return ranges
    limited: List[Dict[str, float]] = []
    for r in ranges:
        length = r["end"] - r["start"]
        if length <= max_seconds:
            limited.append(r)
            continue
        # Split into sub-chunks
        num_parts = math.ceil(length / max_seconds)
        for i in range(num_parts):
            s = r["start"] + i * max_seconds
            e = min(r["start"] + (i + 1) * max_seconds, r["end"])
            limited.append({"start": float(s), "end": float(e)})
    return limited


def slice_audio(audio: np.ndarray, sr: int, ranges: List[Dict[str, float]], out_dir: str, base_name: str) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths: List[str] = []
    for idx, r in enumerate(ranges, 1):
        s_idx = int(max(0, r["start"]) * sr)
        e_idx = int(min(len(audio) / sr, r["end"]) * sr)
        chunk = audio[s_idx:e_idx]
        out_path = os.path.join(out_dir, f"{base_name}_slice_{idx:02d}_{int(r['start'])}-{int(r['end'])}s.wav")
        sf.write(out_path, chunk, sr)
        paths.append(out_path)
    return paths


def read_question_logs(path: str) -> List[Dict[str, float]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Expect list of {start, end} in seconds; adapt if structure differs
    ranges: List[Dict[str, float]] = []
    for item in data:
        start = float(item.get("start", 0))
        end = float(item.get("end", 0))
        if end > start:
            ranges.append({"start": start, "end": end})
    return ranges


def build_drive_service(service_account_json: Optional[str]):
    if not service_account_json:
        return None
    if SACredentials is None or build is None or MediaFileUpload is None:
        return None
    scopes = ["https://www.googleapis.com/auth/drive.file"]
    creds = SACredentials.from_service_account_file(service_account_json, scopes=scopes)
    return build("drive", "v3", credentials=creds)


def upload_file_to_drive(service, file_path: str, filename: Optional[str], folder_id: Optional[str]) -> Optional[str]:
    if service is None or MediaFileUpload is None:
        return None
    name = filename or os.path.basename(file_path)
    metadata = {"name": name}
    if folder_id:
        metadata["parents"] = [folder_id]
    media = MediaFileUpload(file_path, resumable=True)
    file = service.files().create(body=metadata, media_body=media, fields="id").execute()
    file_id = file.get("id")
    # Make link shareable (anyone with the link)
    try:
        service.permissions().create(fileId=file_id, body={"type": "anyone", "role": "reader"}).execute()
    except Exception:
        pass
    return file_id


def main():
    parser = argparse.ArgumentParser(description="Slice diarized applicant audio and upload to Google Drive")
    parser.add_argument("--audio", required=True, help="Path to input audio (wav/mp3)")
    parser.add_argument("--out-dir", default="./slices", help="Local output directory for slices")
    parser.add_argument("--drive-folder-id", default=None, help="Google Drive folder ID to upload into")
    parser.add_argument("--service-account-json", default=os.environ.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE"), help="Path to service account JSON for Drive upload")
    parser.add_argument("--max-chunk-seconds", type=int, default=60, help="Max seconds per slice after merging applicant ranges")
    parser.add_argument("--gap-threshold", type=float, default=0.5, help="Merge applicant ranges if gap <= threshold seconds")
    parser.add_argument("--question-logs", default=None, help="Optional JSON file with question start/end ranges (seconds)")
    parser.add_argument("--target-sr", type=int, default=16000, help="Target sampling rate")
    args = parser.parse_args()

    audio, sr = load_audio(args.audio, target_sr=args.target_sr)

    # If question logs provided, slice by questions immediately (no diarization)
    if args.question_logs and os.path.exists(args.question_logs):
        q_ranges = read_question_logs(args.question_logs)
        ranges = limit_chunk_length(q_ranges, args.max_chunk_seconds)
        base_name = os.path.splitext(os.path.basename(args.audio))[0]
        paths = slice_audio(audio, sr, ranges, args.out_dir, base_name)
    else:
        # Diarize and pick applicant speaker
        speech_tool = SpeechRecognitionTool()
        diar = speech_tool.detect_speakers(args.audio)
        segments = diar.get("speakers", [])
        applicant_id = choose_applicant_speaker(segments)
        if not applicant_id:
            print("No applicant speaker detected; aborting.")
            return
        applicant_segments = [
            {"start": float(s["start"]), "end": float(s["end"])}
            for s in segments
            if str(s.get("speaker")) == str(applicant_id)
        ]
        merged = merge_segments(applicant_segments, gap_threshold=args.gap_threshold)
        ranges = limit_chunk_length(merged, args.max_chunk_seconds)
        base_name = os.path.splitext(os.path.basename(args.audio))[0] + f"_applicant_{applicant_id}"
        paths = slice_audio(audio, sr, ranges, args.out_dir, base_name)

    print(f"Created {len(paths)} slice(s):")
    for p in paths:
        print(f" - {p}")

    # Upload (optional)
    service = build_drive_service(args.service_account_json)
    if service and args.drive_folder_id:
        print("Uploading slices to Google Drive...")
        for p in paths:
            fid = upload_file_to_drive(service, p, None, args.drive_folder_id)
            print(f"Uploaded: {p} -> fileId={fid}")
    else:
        print("Skipping Drive upload (no service account JSON or folder ID provided)")


if __name__ == "__main__":
    main()


