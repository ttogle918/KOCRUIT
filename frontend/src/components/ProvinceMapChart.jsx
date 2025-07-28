import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// props: provinceStats [{name, value}]
const geoUrl = "/skorea-provinces-geo.json";

const COLOR_SCALE = [
  "#e0f7fa", // 0
  "#b2ebf2", // 1
  "#80deea", // 2~3
  "#4dd0e1", // 4~6
  "#00bcd4", // 7~15
  "#0097a7"  // 16+
];
function getColor(value, max) {
  if (value === 0) return "#f5f5f5";
  if (value === 1) return COLOR_SCALE[1];
  if (value <= 3) return COLOR_SCALE[2];
  if (value <= 6) return COLOR_SCALE[3];
  if (value <= 15) return COLOR_SCALE[4];
  return COLOR_SCALE[5];
}

// GeoJSON의 name이 "Gyeonggi-do" 등 영문일 경우 한글로 변환 필요
const GEOJSON_NAME_MAP = {
  "Seoul": "서울특별시",
  "Busan": "부산광역시",
  "Daegu": "대구광역시",
  "Incheon": "인천광역시",
  "Gwangju": "광주광역시",
  "Daejeon": "대전광역시",
  "Ulsan": "울산광역시",
  "Sejong": "세종특별자치시",
  "Gyeonggi-do": "경기도",
  "Gangwon-do": "강원도",
  "Chungcheongbuk-do": "충청북도",
  "Chungcheongnam-do": "충청남도",
  "Jeollabuk-do": "전라북도",
  "Jeollanam-do": "전라남도",
  "Gyeongsangbuk-do": "경상북도",
  "Gyeongsangnam-do": "경상남도",
  "Jeju-do": "제주특별자치도"
};

export default function ProvinceMapChart({ provinceStats, onProvinceClick }) {
  const [geoData, setGeoData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch(geoUrl)
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
      });
  }, []);

  useEffect(() => {
    // 디버깅용
    console.log("provinceStats in ProvinceMapChart", provinceStats);
  }, [provinceStats]);

  if (!geoData) return <div>지도 불러오는 중...</div>;

  const maxValue = Math.max(...provinceStats.map(p => p.name !== "기타" ? p.value : 0));
  const etcStat = provinceStats.find(p => p.name === "기타");
  const totalApplicants = provinceStats.reduce((sum, p) => sum + p.value, 0);

  return (
    <div style={{ width: 600, height: 500, margin: '0 auto', position: 'relative' }}>
      <ComposableMap
        projection="geoMercator"
        width={600}
        height={420}
        projectionConfig={{
          center: [127.7669, 35.9078],
          scale: 4500
        }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map(geo => {
              const provName = GEOJSON_NAME_MAP[geo.properties.NAME_1] || geo.properties.NAME_1;
              const stat = provinceStats.find(p => p.name === provName);
              const value = stat ? stat.value : 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(value, maxValue)}
                  stroke="#888"
                  style={{
                    default: { outline: "none", cursor: "pointer" },
                    hover: { fill: "#ffb300", outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" }
                  }}
                  onMouseEnter={e => {
                    // e.nativeEvent.offsetX, offsetY는 컨테이너 기준 좌표
                    setTooltip({
                      x: e.nativeEvent.offsetX,
                      y: e.nativeEvent.offsetY,
                      name: provName,
                      value: value
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    if (onProvinceClick && value > 0) {
                      onProvinceClick(provName);
                    }
                  }}
                />
              );
            })
          }
        </Geographies>
        {/* 범례 */}
        <g>
          {COLOR_SCALE.map((color, i) => (
            <rect key={i} x={20 + i * 30} y={370} width={30} height={20} fill={color} />
          ))}
          {/* 각 구간별 숫자 표시 */}
          {COLOR_SCALE.map((_, i) => {
            let value = 0;
            if (i === 1) value = 1;
            else if (i === 2) value = 3;
            else if (i === 3) value = 6;
            else if (i === 4) value = 15;
            else if (i === 5) value = maxValue; // 한 도의 최대 지원자 수로 복원
            return (
              <text
                key={i}
                x={20 + i * 30 + 15}
                y={410}
                fontSize={12}
                textAnchor="middle"
                fill="#333"
              >
                {i === 0 ? 0 : value}
              </text>
            );
          })}
          <text x={20} y={360} fontSize={14} fontWeight="bold">지원자 수</text>
        </g>
      </ComposableMap>
      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 10,
          top: tooltip.y + 10,
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #888',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 14,
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          {tooltip.name}: {tooltip.value}명
        </div>
      )}
      {/* 기타 안내 메시지 */}
      {etcStat && etcStat.value > 0 && (
        <div style={{ marginTop: 8, color: '#888', fontSize: 14, textAlign: 'center' }}>
          기타: {etcStat.value}명 &ndash; 주소에서 도/광역시를 추출할 수 없는 지원자
        </div>
      )}
      {/* 전체 지원자 수 안내 - 범례 아래 왼쪽 하단에 배치 */}
      <div style={{ marginTop: 32, marginLeft: 20, color: '#333', fontSize: 15, textAlign: 'left', fontWeight: 500 }}>
        전체 지원자 수: {totalApplicants}명
      </div>
    </div>
  );
} 