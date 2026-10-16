import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase 설정 (본인의 프로젝트 키로 수정하세요)
const firebaseConfig = {
  apiKey: "AIzaSyAgQ8774AWrgX8a5HMDZzlIk29842mm6CQ",
  authDomain: "my-first-app-21578.firebaseapp.com",
  databaseURL: "https://my-first-app-21578-default-rtdb.firebaseio.com",
  projectId: "my-first-app-21578",
  storageBucket: "my-first-app-21578.firebasestorage.app",
  messagingSenderId: "201358884999",
  appId: "1:201358884999:web:5233ff347f2f2dc337b822"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. TourAPI 설정 (디코딩된 원문 인증키 그대로 입력)
const TOUR_API_KEY = "ccb365c1b74b195ab9e40e0e1b33f1e3cfecc4a493866b744863644ce55c023d"; 

const areaSelect = document.getElementById("areaSelect");
const cardContainer = document.getElementById("cardContainer");

// 3. TourAPI 4.0 지역 기반 관광정보 조회 함수
async function fetchTravelData(areaCode) {
  const url = `http://apis.data.go.kr/B551011/KorService2/areaBasedList2?serviceKey=${TOUR_API_KEY}&numOfRows=12&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&areaCode=${areaCode}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      alert(`API 호출 실패: [${response.status}] ${errorText}`);
      return [];
    }

    const data = await response.json();
    
    if (data.response?.header?.resultCode !== "0000") {
      alert(`TourAPI 에러 발생: ${data.response?.header?.resultMsg}`);
      return [];
    }

    return data.response.body.items?.item || [];
  } catch (error) {
    console.error("API 호출 중 예외 발생:", error);
    alert(`네트워크 또는 데이터 처리 오류가 발생했습니다: ${error.message}`);
    return [];
  }
}

// 4. 화면에 카드 목록 표출 함수
function renderCards(items) {
  cardContainer.innerHTML = "";

  if (!items || items.length === 0) {
    cardContainer.innerHTML = "<p>표시할 관광지 정보가 없습니다.</p>";
    return;
  }

  items.forEach(item => {
    // 이미지가 없는 경우 기본 이미지 대체
    const imageSrc = item.firstimage || "https://via.placeholder.com/300x180?text=No+Image";
    
    const cardHtml = `
      <div class="card">
        <img src="${imageSrc}" alt="${item.title}">
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-text">${item.addr1 || "주소 정보 없음"}</div>
        </div>
      </div>
    `;
    cardContainer.insertAdjacentHTML("beforeend", cardHtml);
  });
}

// 5. Firebase Firestore에 최신 선택 지역 저장
async function saveSelectedAreaToFirestore(areaCode) {
  try {
    await setDoc(doc(db, "userSettings", "lastSelection"), {
      areaCode: areaCode,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Firestore 저장 실패:", error);
  }
}

// 6. 페이지 최초 로딩 시 Firestore 데이터 복원
async function loadSavedAreaFromFirestore() {
  try {
    const docRef = doc(db, "userSettings", "lastSelection");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const savedAreaCode = docSnap.data().areaCode;
      
      if (savedAreaCode) {
        areaSelect.value = savedAreaCode;
        const items = await fetchTravelData(savedAreaCode);
        renderCards(items);
        return;
      }
    }
    
    // 저장된 데이터가 없을 경우 시각화 목록 미표출
    cardContainer.innerHTML = "";
  } catch (error) {
    console.error("Firestore 불러오기 실패:", error);
    cardContainer.innerHTML = "";
  }
}

// 7. 이벤트 리스너 등록
areaSelect.addEventListener("change", async (e) => {
  const selectedArea = e.target.value;

  if (!selectedArea) {
    cardContainer.innerHTML = "";
    return;
  }

  // 1) API 데이터 조회 및 화면 표시
  const items = await fetchTravelData(selectedArea);
  renderCards(items);

  // 2) 선택 지역 정보 Firestore 업데이트
  await saveSelectedAreaToFirestore(selectedArea);
});

// 초기화 실행
window.addEventListener("DOMContentLoaded", loadSavedAreaFromFirestore);
