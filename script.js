// script.js

// Script'in en başındaki sabitler ve değişkenler
let patchVersion = null;
const championListEl = document.getElementById('championList');
const skinsList = document.getElementById('skinsList');
const skinsHeaderEl = document.getElementById('skinsHeaderEl'); 
const searchBox = document.getElementById('searchBox');
const loadingOverlay = document.getElementById('loadingOverlay');
const championsHeaderToggle = document.getElementById('championsHeader'); 
const searchContainer = document.getElementById('searchContainer');

const chromaModal = document.getElementById('chromaModal');
const chromaModalClose = document.getElementById('chromaModalClose');
const chromaModalTitle = document.getElementById('chromaModalTitle');
const chromaModalSplash = document.getElementById('chromaModalSplash');
const chromaListEl = document.getElementById('chromaListEl'); 

const openSettingsModalButton = document.getElementById('openSettingsModalButton'); 
const settingsModal = document.getElementById('settingsModal');                   
const settingsModalClose = document.getElementById('settingsModalClose');         
const themeSelectorModal = document.getElementById('themeSelectorModal'); // Orijinal (gizli) select
const patchSelectorModal = document.getElementById('patchSelectorModal');         
const applyPatchButtonModal = document.getElementById('applyPatchButtonModal'); 

// YENİ: Custom Select elementleri
const customSelectContainer = document.getElementById('customSelectContainer');
const customSelectTrigger = document.getElementById('customSelectTrigger');
const customOptions = document.getElementById('customOptions');
  
let selectedChampionData = null; 
let allChampions = [];
let allSkinsData = null; 
let isListCollapsed = false;
let activeThemeLinkElement = null; 
let availablePatches = []; 
let currentSelectedPatch = 'latest'; 

const CDRAGON_BASE_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';
const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com/cdn';
const WIKI_REDIRECT_BASE_URL = 'https://leagueoflegends.fandom.com/wiki/Special:Redirect/file';
const CDRAGON_CHROMA_IMAGES_BASE_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-chroma-images';

// --- BU SATIR EKLENEREK HATA DÜZELTİLDİ ---
const REPOSITORY_NAME = 'SkinExplorer'; // TIRNAK İÇİNE KENDİ GITHUB REPO ADINIZI YAZIN
// ------------------------------------------

const AVAILABLE_THEMES = [
  { file: "default-purple.css", name: "Default Purple", previewColor: "#bb86fc" },
  { file: "ocean-blue.css", name: "Ocean Blue", previewColor: "#4364F7" },
  { file: "matrix-green.css", name: "Matrix Green", previewColor: "#00ff00" },
  { file: "golden.css", name: "Golden", previewColor: "#FFD700" },
  // Yeni temalarını buraya ekle:
  { file: "demon-red.css", name: "Demon Red", previewColor: "#DC143C" }, 
  { file: "arctic-white.css", name: "Arctic White", previewColor: "#F0F8FF" },
  { file: "bronze-copper.css", name: "Bronze Copper", previewColor: "#CD7F32" },
  { file: "midnight-silver.css", name: "Midnight Silver", previewColor: "#C0C0C0" }
  // { file: "tema-dosya-adi.css", name: "Görünen Tema Adı", previewColor: "#anaRenkKodu" }
];


// --- YARDIMCI FONKSİYONLAR ---
function getCdragonThumbnailUrl(championKey, chromaId) { // championKey parametresi eklendi
    if (!chromaId || !championKey) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1iPC90ZXh0Pjwvc3ZnPg==';
    return `${CDRAGON_CHROMA_IMAGES_BASE_URL}/${championKey}/${chromaId}.png`;
}


// --- TEMA YÖNETİMİ (CUSTOM SELECT İÇİN GÜNCELLENDİ) ---
function populateThemeSelector() {
  themeSelectorModal.innerHTML = ''; 
  customOptions.innerHTML = '';
  AVAILABLE_THEMES.forEach(theme => {
    // 1. Orijinal (gizli) select'i doldur
    const originalOption = document.createElement('option');
    originalOption.value = theme.file;
    originalOption.textContent = theme.name;
    themeSelectorModal.appendChild(originalOption);

    // 2. Görsel custom option'ı oluştur
    const customOption = document.createElement('div');
    customOption.classList.add('custom-option');
    customOption.dataset.value = theme.file;
    customOption.style.setProperty('--preview-color', theme.previewColor);
    
    const optionText = document.createElement('span');
    optionText.textContent = theme.name;
    customOption.appendChild(optionText);

    customOption.addEventListener('click', (e) => {
      e.stopPropagation(); // Olayın window'a yayılmasını engelle
      if (themeSelectorModal.value !== theme.file) {
        themeSelectorModal.value = theme.file;
        applyTheme(theme.file);
        updateCustomSelectTrigger(theme.file);
      }
      customSelectContainer.classList.remove('open');
    });

    customOptions.appendChild(customOption);
  });
  console.log("Tema seçenekleri hem orijinal hem de custom select için yüklendi.");
}

function updateCustomSelectTrigger(themeFile) {
    const selectedTheme = AVAILABLE_THEMES.find(t => t.file === themeFile);
    if(selectedTheme) {
        // Görünen tetikleyiciye hem renkli daireyi hem de ismi içeren bir yapı ekle
        customSelectTrigger.innerHTML = `<div class="custom-select-option-content" style="--preview-color: ${selectedTheme.previewColor};">${selectedTheme.name}</div>`;
    }
}

function applyTheme(themeFileName) {
  if (activeThemeLinkElement) {
    activeThemeLinkElement.remove(); 
    activeThemeLinkElement = null;
  }
  // Varsayılan tema dosya adını kontrol et
  if (themeFileName && themeFileName !== AVAILABLE_THEMES[0].file) { 
    const themeUrl = `/${REPOSITORY_NAME}/themes/${themeFileName}`; // BAŞINA / EKLENDİ
    const newThemeLink = document.createElement('link');
    newThemeLink.rel = 'stylesheet';
    newThemeLink.href = themeUrl;
    newThemeLink.id = 'dynamic-theme-style'; 
    document.head.appendChild(newThemeLink);
    activeThemeLinkElement = newThemeLink;
    console.log(`Tema CSS uygulandı: ${themeUrl}`);
  } else {
    console.log("Varsayılan tema (ana style.css) uygulandı / Ek tema yüklenmedi.");
  }
  localStorage.setItem('selectedThemeFile', themeFileName);
}

function loadSavedTheme() {
  const defaultThemeFile = AVAILABLE_THEMES[0].file; 
  let savedThemeFile = localStorage.getItem('selectedThemeFile') || defaultThemeFile; 
  
  if (!AVAILABLE_THEMES.some(theme => theme.file === savedThemeFile)) {
    console.warn(`Kaydedilmiş tema "${savedThemeFile}" artık mevcut değil. Varsayılana dönülüyor.`);
    savedThemeFile = defaultThemeFile;
    localStorage.setItem('selectedThemeFile', savedThemeFile);
  }
  
  themeSelectorModal.value = savedThemeFile; 
  updateCustomSelectTrigger(savedThemeFile);
  applyTheme(savedThemeFile);
}

// YENİ: Custom select tetikleyici için olay dinleyici
customSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation(); // Olayın window'a yayılmasını engelle
    customSelectContainer.classList.toggle('open');
});

// ESKİ themeSelectorModal event listener'ı kaldırıldı, çünkü artık custom option'lar işi yapıyor.

// --- PATCH SÜRÜMÜ YÖNETİMİ ---
async function populatePatchSelector() {
  try {
    if (availablePatches && availablePatches.length > 0) {
      const patchesToShow = availablePatches.slice(0, 30); 
      Array.from(patchSelectorModal.options).forEach(option => { 
        if (option.value !== "latest") {
          option.remove();
        }
      });
      patchesToShow.forEach(p => {
          const option = document.createElement('option');
          option.value = p;
          option.textContent = p;
          patchSelectorModal.appendChild(option); 
      });
      
      const savedPatch = localStorage.getItem('selectedPatch');
      if (savedPatch && (savedPatch === "latest" || patchesToShow.includes(savedPatch))) {
        patchSelectorModal.value = savedPatch; 
        currentSelectedPatch = savedPatch;
      } else {
         patchSelectorModal.value = "latest"; 
         currentSelectedPatch = "latest";
         localStorage.setItem('selectedPatch', 'latest'); 
      }
      console.log("Patch selector dolduruldu. Seçili: ", patchSelectorModal.value);
    } else {
        console.warn("populatePatchSelector: availablePatches boş veya tanımsız.")
    }
  } catch (error) {
    console.error("Patch sürümleri çekilemedi veya dropdown doldurulamadı:", error);
  }
}

applyPatchButtonModal.addEventListener('click', async () => { 
  const selectedPatchValue = patchSelectorModal.value; 
  console.log(`Patch uygulanıyor: ${selectedPatchValue}`);
  
  if (selectedPatchValue === currentSelectedPatch && patchVersion) { 
    console.log(`Patch zaten ${selectedPatchValue} olarak ayarlı.`);
    settingsModal.classList.remove('visible'); 
    return;
  }

  loadingOverlay.style.display = 'flex';
  setTimeout(() => loadingOverlay.style.opacity = '1', 10);
  document.querySelector('.loading-text').textContent = `Veriler yükleniyor...`;
  document.querySelector('.loading-subtext').textContent = `Patch: ${selectedPatchValue === 'latest' ? (availablePatches[0] || 'En son') : selectedPatchValue}`;

  if (selectedPatchValue === 'latest') {
    patchVersion = await getLatestPatch(); 
  } else {
    patchVersion = selectedPatchValue;
  }
  currentSelectedPatch = selectedPatchValue;
  localStorage.setItem('selectedPatch', currentSelectedPatch);

  championListEl.innerHTML = '<div class="loading">Şampiyonlar yükleniyor...</div>';
  skinsList.innerHTML = '';
  skinsHeaderEl.style.display = 'none';
  selectedChampionData = null; 

  await loadChampions(); 
  
  setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
        document.querySelector('.loading-text').textContent = 'We are getting latest info...';
        document.querySelector('.loading-subtext').textContent = 'Fetching current patch data';
      }, 300);
  }, 500);
  settingsModal.classList.remove('visible'); 
});


// --- AYARLAR MODALI AÇMA/KAPAMA ---
openSettingsModalButton.addEventListener('click', () => {
  settingsModal.classList.add('visible');
});

settingsModalClose.addEventListener('click', () => {
  settingsModal.classList.remove('visible');
});

// --- ANA FONKSİYONLAR ---
championsHeaderToggle.addEventListener('click', () => {
  isListCollapsed = !isListCollapsed;
  championsHeaderToggle.classList.toggle('collapsed', isListCollapsed);
  searchContainer.classList.toggle('collapsed', isListCollapsed);
  championListEl.classList.toggle('collapsed', isListCollapsed);
});

async function getLatestPatch() {
  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await response.json(); 
    if(versions && versions.length > 0) {
        availablePatches = versions; 
        console.log("Latest patch version fetched:", versions[0]);
        return versions[0];
    }
    throw new Error("No versions found in API response");
  } catch (error) {
    console.error('Could not fetch latest patch:', error);
    availablePatches = ['14.11.1']; 
    return '14.11.1'; 
  }
}

async function fetchAllSkinsData() {
  console.log("%cAttempting to fetch CDragon skins.json...", "color: yellow; font-weight: bold;");
  try {
    const response = await fetch(`${CDRAGON_BASE_URL}/v1/skins.json`);
    if (!response.ok) {
      console.error(`%cCDragon skins.json fetch FAILED! Status: ${response.status}`, "color: red; font-weight: bold;");
      const errorText = await response.text();
      console.error("CDragon error response text:", errorText);
      alert(`HATA: Chroma verisi (skins.json) yüklenemedi. Sunucu durumu: ${response.status}. Yanıt: ${errorText}.`);
      return new Map();
    }
    const rawSkinsObject = await response.json(); 
    let cdragonSkinsArrayToProcess;
    if (typeof rawSkinsObject === 'object' && rawSkinsObject !== null && !Array.isArray(rawSkinsObject)) {
        cdragonSkinsArrayToProcess = Object.values(rawSkinsObject);
    } else if (Array.isArray(rawSkinsObject)) {
        cdragonSkinsArrayToProcess = rawSkinsObject;
    } else {
        alert("KRİTİK HATA: skins.json verisi beklenmedik bir formatta.");
        return new Map();
    }
    if (!Array.isArray(cdragonSkinsArrayToProcess)) {
        alert("FATAL HATA: Chroma verisi düzgün bir diziye dönüştürülemedi.");
        return new Map();
    }
    const skinsMap = new Map();
    cdragonSkinsArrayToProcess.forEach(skin => {
      if (skin && typeof skin.id === 'number' && skin.chromas && skin.chromas.length > 0) {
        skinsMap.set(skin.id, skin.chromas);
      }
    });
    console.log(`%cProcessed CDragon data. Found ${skinsMap.size} skins with defined chromas.`, "color: lightgreen; font-weight: bold;");
    if (skinsMap.size === 0 && cdragonSkinsArrayToProcess.length > 0) {
        console.warn("%cWARNING: CDragon skins.json was processed, but no skins with chromas identified in it.", "color: orange;");
    }
    return skinsMap;
  } catch (error) {
    console.error('%cCritial error during fetchAllSkinsData:', "color: red; font-weight: bold;", error);
    alert(`KRİTİK HATA: Chroma verisi işlenirken sorun oluştu: ${error.message}.`);
    return new Map(); 
  }
}

async function initializeApp() {
  document.querySelector('.loading-subtext').textContent = 'Initializing settings...'; // Ayarlar için
  populateThemeSelector(); 
  loadSavedTheme();      

  document.querySelector('.loading-subtext').textContent = 'Getting latest patch version...';
  patchVersion = await getLatestPatch(); 
  const savedPatch = localStorage.getItem('selectedPatch');

  if (savedPatch && savedPatch !== "latest" && availablePatches.includes(savedPatch)) {
      patchVersion = savedPatch;
      currentSelectedPatch = savedPatch;
      console.log(`Kaydedilmiş patch kullanılıyor: ${patchVersion}`);
  } else {
      if (availablePatches && availablePatches.length > 0) {
        patchVersion = availablePatches[0]; 
      } 
      currentSelectedPatch = "latest";
      localStorage.setItem('selectedPatch', 'latest'); 
  }
  
  await populatePatchSelector(); 
  
  document.querySelector('.loading-subtext').textContent = 'Fetching all skin & chroma data (CDragon)...';
  allSkinsData = await fetchAllSkinsData(); 
  if (allSkinsData.size === 0) {
      console.warn('%cWARNING: allSkinsData map is empty after fetch. Chroma features will likely not work.', "color: orange; font-size: 1.2em;");
  } else {
      console.log(`%cSUCCESS: allSkinsData map populated with ${allSkinsData.size} entries.`, "color: green; font-size: 1.2em;");
  }

  document.querySelector('.loading-subtext').textContent = `Loading champions for patch ${patchVersion}...`;
  await loadChampions();
  
  setTimeout(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        document.querySelector('.loading-text').textContent = 'We are getting latest info...';
        document.querySelector('.loading-subtext').textContent = 'Fetching current patch data';
    }, 300);
  }, 500);
}

async function loadChampions() {
  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/${patchVersion}/data/en_US/champion.json`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    championListEl.innerHTML = '';
    const champions = data.data;
    if (!champions || Object.keys(champions).length === 0) throw new Error('No champions data found');
    allChampions = Object.values(champions).sort((a, b) => a.name.localeCompare(b.name));
    allChampions.forEach(champ => {
      const div = document.createElement('div');
      div.className = 'champion-item';
      div.title = champ.title;
      div.dataset.championId = champ.id; 
      div.dataset.championName = champ.name.toLowerCase();
      const img = document.createElement('img');
      img.src = `${DDRAGON_BASE_URL}/${patchVersion}/img/champion/${champ.image.full}`;
      img.alt = champ.name;
      img.onerror = function() { this.src = `${DDRAGON_BASE_URL}/14.1.1/img/champion/${champ.image.full}`; };
      const nameDiv = document.createElement('div');
      nameDiv.className = 'champion-name';
      nameDiv.textContent = champ.name;
      div.appendChild(img);
      div.appendChild(nameDiv);
      div.addEventListener('click', () => {
        document.querySelectorAll('.champion-item.selected').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        selectedChampionData = champ; 
        console.log(`%cChampion selected: ${champ.name} (Key: ${champ.key}, ID: ${champ.id})`, "color: blue;");
        loadSkins(champ.id, champ.name, parseInt(champ.key)); 
      });
      championListEl.appendChild(div);
    });
  } catch (error) {
    console.error('Champion loading error:', error);
    championListEl.innerHTML = '<div class="loading">Failed to load champions. Please refresh.</div>';
  }
}

searchBox.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  document.querySelectorAll('.champion-item').forEach(item => {
    const championName = item.dataset.championName;
    item.classList.toggle('hidden', !(championName && championName.includes(searchTerm)));
  });
});

async function loadSkins(championStringId, championName, championNumericKey) { 
  console.log(`%cLoading skins for ${championName} (Numeric Key: ${championNumericKey})`, "color: purple;");
  skinsList.innerHTML = '<div class="loading">Loading skins...</div>';
  skinsHeaderEl.style.display = 'block';
  skinsHeaderEl.textContent = `${championName} Skins`;
  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/${patchVersion}/data/en_US/champion/${championStringId}.json`);
    if (!response.ok) throw new Error(`HTTP error loading champion details for ${championStringId}: ${response.status}`);
    const data = await response.json();
    skinsList.innerHTML = '';
    const ddragonSkins = data.data[championStringId].skins;
    if (!ddragonSkins || ddragonSkins.length === 0) {
      skinsList.innerHTML = '<div class="loading">No skins found for this champion.</div>';
      return;
    }
    console.log(`Found ${ddragonSkins.length} skins for ${championName} from DDragon.`);
    ddragonSkins.forEach((skin, index) => {
      const skinNum = skin.num; 
      const ddragonSkinId = parseInt(skin.id); 
      const skinName = skin.name === 'default' ? `${championName} Classic` : skin.name;
      console.log(`Processing DDragon Skin: Name: "${skinName}", DDragon Full ID: ${ddragonSkinId}, Num: ${skinNum}`);
      const card = document.createElement('div');
      card.className = 'skin-card';
      card.style.animationDelay = `${index * 0.05}s`;
      const skinImg = document.createElement('img');
      skinImg.alt = `${skinName} splash`;
      skinImg.src = `${DDRAGON_BASE_URL}/img/champion/splash/${championStringId}_${skinNum}.jpg`;
      skinImg.onerror = function() { 
        this.src = `${CDRAGON_BASE_URL}/v1/champion-splashes/${championNumericKey}/${ddragonSkinId}.jpg`;
        this.onerror = function() { 
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
        }
      };
      const title = document.createElement('h3');
      title.textContent = skinName;
      const skinInfo = document.createElement('p');
      skinInfo.textContent = `Skin Num: ${skinNum}`;
      card.appendChild(skinImg);
      card.appendChild(title);
      card.appendChild(skinInfo);
      if (!allSkinsData) {
          console.error("CRITICAL: allSkinsData is null or undefined when trying to lookup chromas for skin: " + skinName);
      } else {
          const cdragonChromasForThisSkin = allSkinsData.get(ddragonSkinId); 
          if (cdragonChromasForThisSkin && cdragonChromasForThisSkin.length > 0) {
            const chromaIconSpan = document.createElement('span');
            chromaIconSpan.className = 'chroma-indicator-icon';
            chromaIconSpan.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" viewBox="0 0 940.466 940.467" xml:space="preserve">
                <g>
                  <g>
                    <path d="M120.269,930.855c14.171,14.17,38.842,12.477,55.103-3.785l172.059-172.059l125.145,125.145    c16.262,16.26,42.626,16.26,58.889,0l48.765-48.766c16.261-16.26,16.261-42.625,0-58.887l-412.26-412.261    c-16.261-16.261-42.626-16.261-58.888,0l-48.765,48.765c-16.261,16.261-16.261,42.626,0,58.888l125.145,125.145L13.402,765.102    c-16.261,16.26-17.956,40.932-3.785,55.102L120.269,930.855z M104.553,774.85c16.864-16.865,44.207-16.865,61.071,0    c16.865,16.863,16.865,44.207,0,61.07c-16.864,16.863-44.207,16.863-61.071,0C87.688,819.057,87.688,791.713,104.553,774.85z"/>
                    <path d="M182.89,308.062c0.087,0.604,0.189,1.206,0.305,1.806c0.141,0.727,0.31,1.45,0.494,2.17    c1.633,6.404,4.948,12.467,9.959,17.479l104.327,104.327l312.982,312.982c2.788,2.787,5.899,5.053,9.215,6.795    c1.104,0.58,2.232,1.104,3.378,1.568c1.719,0.697,3.478,1.262,5.262,1.699c1.261,0.307,2.535,0.545,3.816,0.723    c1.055,0.146,2.114,0.246,3.177,0.305c0.11,0.006,0.22,0.014,0.331,0.02c0.58,0.027,1.159,0.043,1.739,0.043    c0.019,0,0.037-0.002,0.055-0.002c0.791-0.002,1.581-0.035,2.371-0.086c0.21-0.014,0.42-0.029,0.629-0.045    c0.805-0.064,1.609-0.145,2.409-0.26c3.019-0.436,5.996-1.234,8.859-2.396c1.146-0.465,2.273-0.986,3.378-1.568    c0.553-0.289,1.101-0.594,1.641-0.914c2.028-1.197,3.968-2.6,5.792-4.207c0.607-0.533,1.203-1.092,1.783-1.674l122.313-122.312    L909.42,502.199l19.898-19.898c0.602-0.602,1.177-1.217,1.729-1.846c3.861-4.404,6.528-9.49,8.016-14.834    c3.562-12.799,0.32-27.095-9.744-37.16l-4.789-4.788L548.13,47.267L512.013,11.15c-0.929-0.929-1.896-1.8-2.891-2.613    c-0.996-0.813-2.025-1.568-3.081-2.265c-1.583-1.045-3.228-1.96-4.917-2.744c-1.126-0.523-2.273-0.987-3.437-1.394    c-1.163-0.407-2.341-0.755-3.531-1.045c-1.783-0.436-3.594-0.74-5.414-0.915c-0.571-0.055-1.144-0.094-1.717-0.123    c-0.188-0.01-0.376-0.012-0.563-0.018c-0.388-0.014-0.774-0.026-1.162-0.028c-0.069,0-0.138-0.005-0.207-0.005    c-0.108,0-0.216,0.009-0.324,0.01c-0.545,0.005-1.09,0.021-1.634,0.049c-0.166,0.009-0.332,0.015-0.498,0.025    c-0.671,0.043-1.342,0.102-2.011,0.18c-0.12,0.014-0.24,0.034-0.361,0.049c-0.565,0.072-1.129,0.157-1.691,0.254    c-0.182,0.031-0.362,0.063-0.545,0.097c-0.669,0.126-1.337,0.263-2,0.425c-0.435,0.106-0.866,0.229-1.299,0.351    c-6.062,1.709-11.786,4.94-16.557,9.711l-4.731,4.731L193.648,275.677c-3.576,3.576-6.283,7.69-8.138,12.077    c-0.164,0.388-0.32,0.778-0.471,1.17c-0.521,1.356-0.963,2.734-1.323,4.13c-0.364,1.41-0.65,2.836-0.85,4.272    c-0.159,1.144-0.27,2.293-0.325,3.444c-0.029,0.608-0.044,1.217-0.044,1.826c0,0.609,0.014,1.218,0.044,1.826    C182.599,305.639,182.715,306.854,182.89,308.062z M479.388,32.363c1.954-1.953,4.181-2.363,5.706-2.363s3.753,0.41,5.706,2.363    l417.309,417.31c1.954,1.952,2.364,4.181,2.364,5.706c0,1.524-0.41,3.752-2.364,5.705l-35.76,35.76    c-22.289-2.576-45.004-2.17-66.333,4.598c-17.153,5.443-30.652,15.387-44.135,27.033c-14.211,12.273-29.746,25.285-48.874,28.549    c-16.185,2.76-34.984,0.664-46.476-12.539c-12.03-13.824-15.919-32.877-11.342-50.598c4.674-18.094,15.435-33.299,26.217-48.233    c11.19-15.497,22.867-30.812,32.259-47.503c9.07-16.121,29.632-47.116,18.218-65.91c-11.97-19.703-41.84-11.31-57.961-2.262    c-33.237,18.693-57.012,48.939-79.784,78.753c-6.471,8.472-12.824,17.068-19.581,25.316c-6.124,7.476-13.219,14.29-22.527,17.516    c-19.011,6.59-37.264-4.955-39.798-24.721c-2.48-19.355,12.443-34.246,25.229-46.51c14.409-13.819,29.678-26.718,43.984-40.645    c13.527-13.168,26.93-27.273,36.038-43.971c3.133-5.744,6.147-12.423,7.196-19.151c-27.065,0.615-54.272,1.188-79.893-9.117    c-16.372-6.585-31.188-17.422-40.014-33.036c-7.671-13.571-10.892-28.956-11.21-44.451c-0.637-30.967,7.706-61.689,1.901-92.569    c-3.923-20.872-11.735-40.511-23.14-57.968L479.388,32.363z"/>
                  </g>
                </g>
              </svg>
            `;
            card.appendChild(chromaIconSpan);
            card.classList.add('has-chromas'); 
            
            console.log(`%cAttaching chroma modal listener to "${skinName}" (ID: ${ddragonSkinId}) because ${cdragonChromasForThisSkin.length} chromas were found.`, "color: green;");
            card.addEventListener('click', () => {
                console.log(`%cSkin card for "${skinName}" clicked, opening chroma modal.`, "color: cyan;");
                openChromaModal(championNumericKey, skin, skinName, cdragonChromasForThisSkin);
            });
          } else {
            console.log(`%cNo chromas found or empty array for "${skinName}" (ID: ${ddragonSkinId}). NOT attaching listener.`, "color: orange;");
          }
      }
      skinsList.appendChild(card);
    });
  } catch (err) {
    console.error(`Skin loading error for ${championName}:`, err);
    skinsList.innerHTML = `<div class="loading">Failed to load skins for ${championName}. Error: ${err.message}</div>`;
  }
}

function openChromaModal(championNumericKey, ddragonSkinData, baseSkinName, cdragonChromasArray) {
  console.log(`%c--- Opening Chroma Modal for: ${baseSkinName} ---`, "background-color: #4CAF50; color: white; padding: 2px; font-weight: bold;");
  console.log("Champion Numeric Key:", championNumericKey);
  console.log("DDragon Skin Data (for base skin context):", JSON.parse(JSON.stringify(ddragonSkinData)));
  console.log("CDragon Chromas Array (raw from skins.json processing):", JSON.parse(JSON.stringify(cdragonChromasArray)));

  chromaModalTitle.textContent = `${baseSkinName} - Chromas`;
  chromaListEl.innerHTML = '';

  const mainSkinDDragonSplashUrlForFallback = `${DDRAGON_BASE_URL}/img/champion/splash/${selectedChampionData.id}_${ddragonSkinData.num}.jpg`;
  chromaModalSplash.dataset.mainSplashFallback = mainSkinDDragonSplashUrlForFallback;

  const baseChromaDDragonSkinId = parseInt(ddragonSkinData.id);
  const wikiFormattedChampName = selectedChampionData.id.replace(/ /g, '_').replace(/'/g, '%27').replace(/\./g, '');

  let baseSkinWikiThumbTry1_Filename = `${wikiFormattedChampName}_OriginalSkin.png`;
  let baseSkinWikiThumbTry2_Filename = `${wikiFormattedChampName}_OriginalSkin.jpg`;

  if (!baseSkinName.toLowerCase().includes("classic")) {
      let skinNameOnly = baseSkinName.replace(selectedChampionData.name, '').trim().replace(/ /g, '_');
      if (skinNameOnly) {
        baseSkinWikiThumbTry1_Filename = `${wikiFormattedChampName}_${skinNameOnly}_(Base).png`;
        baseSkinWikiThumbTry2_Filename = `${wikiFormattedChampName}_${skinNameOnly}_(Base).jpg`;
      }
  }

  const baseChromaEntry = {
    id: baseChromaDDragonSkinId,
    name: "Base Skin", 
    isBase: true,
    primaryCdragonThumbnailUrl: `${CDRAGON_CHROMA_IMAGES_BASE_URL}/${championNumericKey}/${baseChromaDDragonSkinId}.png`,
    secondaryWikiThumbnailUrlPng: `${WIKI_REDIRECT_BASE_URL}/${baseSkinWikiThumbTry1_Filename}`,
    tertiaryWikiThumbnailUrlJpg: `${WIKI_REDIRECT_BASE_URL}/${baseSkinWikiThumbTry2_Filename}`,
    quaternaryDdragonLoadingUrl: `${DDRAGON_BASE_URL}/img/champion/loading/${selectedChampionData.id}_${ddragonSkinData.num}.jpg`,
    quinaryDdragonSquareUrl: `${DDRAGON_BASE_URL}/${patchVersion}/img/champion/${selectedChampionData.image.full}`,
    chromaNameForDisplay: "Base",
    actualDisplayUrl: '' 
  };
  console.log("Oluşturulan BaseChromaEntry:", JSON.parse(JSON.stringify(baseChromaEntry)));
  
  chromaModalSplash.src = baseChromaEntry.primaryCdragonThumbnailUrl; 
  baseChromaEntry.actualDisplayUrl = baseChromaEntry.primaryCdragonThumbnailUrl; 

  chromaModalSplash.onerror = function() { 
    console.warn(`İlk Ana Splash (deneme: ${this.src}) yüklenemedi. Sonraki deneniyor.`);
    let nextAttemptForInitialSplash = null;
    if (this.src === baseChromaEntry.primaryCdragonThumbnailUrl) { 
        nextAttemptForInitialSplash = baseChromaEntry.secondaryWikiThumbnailUrlPng;
    } else if (this.src === baseChromaEntry.secondaryWikiThumbnailUrlPng) {
        nextAttemptForInitialSplash = baseChromaEntry.tertiaryWikiThumbnailUrlJpg;
    } else if (this.src === baseChromaEntry.tertiaryWikiThumbnailUrlJpg) { 
        nextAttemptForInitialSplash = chromaModalSplash.dataset.mainSplashFallback; 
    } else if (this.src === chromaModalSplash.dataset.mainSplashFallback) { 
        console.error(`DDragon ana splash da yüklenemedi. Placeholder gösteriliyor.`);
        nextAttemptForInitialSplash = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNwbGFzaCBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
        this.onerror = null; 
    }
    if(nextAttemptForInitialSplash) this.src = nextAttemptForInitialSplash;
    baseChromaEntry.actualDisplayUrl = this.src; 
  };
  console.log(`Modal için ilk Ana Splash denemesi ayarlandı: ${chromaModalSplash.src}`);


  const allDisplayableChromas = [baseChromaEntry, ...cdragonChromasArray];

  allDisplayableChromas.forEach((chromaLoopItem, loopIndex) => {
    const chromaItem = document.createElement('div');
    chromaItem.className = 'chroma-item';
    if (loopIndex === 0) chromaItem.classList.add('active');

    const chromaImg = document.createElement('img');
    let currentChromaNameForDisplay = "Bilinmeyen Chroma";
    let currentThumbnailUrlToTry = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1iPC90ZXh0Pjwvc3ZnPg==';
    chromaLoopItem.actualDisplayUrl = ''; 

    if (chromaLoopItem.isBase) {
        currentChromaNameForDisplay = chromaLoopItem.chromaNameForDisplay; 
        currentThumbnailUrlToTry = chromaLoopItem.primaryCdragonThumbnailUrl; 
        chromaLoopItem.actualDisplayUrl = currentThumbnailUrlToTry;
        console.log(`    Base Skin - İsim: "${currentChromaNameForDisplay}"`);
        console.log(`    Base Skin - Attempting CDragon Thumbnail for small icon: "${currentThumbnailUrlToTry}"`);
    } else { 
        const rawCdragonChroma = chromaLoopItem;
        const chromaArrayIndex = loopIndex - 1; 

        console.log(`%cProcessing CDragon Chroma (array index ${chromaArrayIndex} / display index ${loopIndex}):`, "color: green; font-weight:bold;");
        console.log("  Raw CDragon Chroma Object:", JSON.parse(JSON.stringify(rawCdragonChroma)));
        
        let displayChromaNamePart = "";
        let displayChromaIdSuffix = "";
        let simpleChromaId = "";

        let chromaIdString = String(rawCdragonChroma.id); 
        let championKeyString = String(championNumericKey);

        if (chromaIdString.startsWith(championKeyString) && chromaIdString.length > championKeyString.length) {
            simpleChromaId = chromaIdString.substring(championKeyString.length); 
            simpleChromaId = String(parseInt(simpleChromaId, 10)); 
            displayChromaIdSuffix = `(ID: ${simpleChromaId})`;
        } else {
            simpleChromaId = chromaIdString; 
            displayChromaIdSuffix = `(Full ID: ${simpleChromaId})`;
        }

        // DOKUNULMADI: "Elite" isimlendirmesi için olan orijinal kodunuz korunuyor.
        displayChromaNamePart = `Chroma ${chromaArrayIndex + 1}`;
        currentChromaNameForDisplay = `${baseSkinName} - ${displayChromaNamePart} ${displayChromaIdSuffix}`;
        console.log(`    CDragon Chroma - Belirlenen İsim: "${currentChromaNameForDisplay}"`);

        if (rawCdragonChroma.id) { 
            currentThumbnailUrlToTry = `${CDRAGON_CHROMA_IMAGES_BASE_URL}/${championNumericKey}/${rawCdragonChroma.id}.png`;
            chromaLoopItem.actualDisplayUrl = currentThumbnailUrlToTry; 
            console.log(`    DENENEN CDRAGON Thumbnail URL (yeni path): "${currentThumbnailUrlToTry}"`);
        } else {
            console.warn(`    CDragon Thumbnail oluşturulamadı (chroma.id eksik):`, rawCdragonChroma);
            const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1iPC90ZXh0Pjwvc3ZnPg==';
            currentThumbnailUrlToTry = placeholderSvg;
            chromaLoopItem.actualDisplayUrl = placeholderSvg;
        }
    }

    chromaImg.src = currentThumbnailUrlToTry;
    chromaImg.alt = currentChromaNameForDisplay;

    chromaImg.onload = function() {
        chromaLoopItem.actualDisplayUrl = this.src;
        console.log(`Thumbnail yüklendi: ${this.src}. Büyük gösterim için saklanan URL: ${chromaLoopItem.actualDisplayUrl}`);
        if (loopIndex === 0 && chromaModalSplash.src !== this.src ) { 
             if (this.src && !this.src.includes('data:image/svg+xml') && this.src !== chromaModalSplash.dataset.mainSplashFallback) { 
                chromaModalSplash.src = this.src;
                console.log(`Başlangıç Ana Splash, base skin thumbnail onload ile güncellendi: ${this.src}`);
             }
        }
    };

    chromaImg.onerror = function() {
        console.warn(`Küçük resim yüklenemedi (onerror) - Denenen URL: ${this.src}`);
        let nextAttemptUrl = null;
        const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1iPC90ZXh0Pjwvc3ZnPg==';
        chromaLoopItem.actualDisplayUrl = placeholderSvg;

        if (chromaLoopItem.isBase) { 
            if (this.src === chromaLoopItem.primaryCdragonThumbnailUrl) { 
                console.log(`    Base Skin - CDragon Thumbnail failed. Trying Wiki PNG: ${chromaLoopItem.secondaryWikiThumbnailUrlPng}`);
                nextAttemptUrl = chromaLoopItem.secondaryWikiThumbnailUrlPng;
            } else if (this.src === chromaLoopItem.secondaryWikiThumbnailUrlPng) { 
                nextAttemptUrl = chromaLoopItem.tertiaryWikiThumbnailUrlJpg;
            } else if (this.src === chromaLoopItem.tertiaryWikiThumbnailUrlJpg) { 
                nextAttemptUrl = chromaLoopItem.quaternaryDdragonLoadingUrl;
            } else if (this.src === chromaLoopItem.quaternaryDdragonLoadingUrl) {
                nextAttemptUrl = chromaLoopItem.quinaryDdragonSquareUrl;
            }
        }
        if (nextAttemptUrl) {
            console.log(`    Fallback deneniyor: ${nextAttemptUrl}`);
            this.src = nextAttemptUrl;
        } else { 
            console.error(`Resim yüklenemedi (onerror) - Başka fallback yok (${chromaLoopItem.name}). Son deneme: ${this.src}. Placeholder gösteriliyor.`);
            this.src = placeholderSvg;
            chromaLoopItem.actualDisplayUrl = placeholderSvg;
            this.onerror = null; 
        }
    };
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chroma-item-name';
    nameSpan.textContent = currentChromaNameForDisplay;

    chromaItem.appendChild(chromaImg);
    chromaItem.appendChild(nameSpan);

    chromaItem.addEventListener('click', () => {
      console.log(`Chroma thumbnail seçildi: ${currentChromaNameForDisplay}`);
      const displayUrlForSplash = chromaLoopItem.actualDisplayUrl || chromaImg.src; 
      
      console.log(`Büyük resim için kullanılacak URL: ${displayUrlForSplash}`);
      if (displayUrlForSplash && !displayUrlForSplash.includes('data:image/svg+xml')) {
        chromaModalSplash.src = displayUrlForSplash; 
        chromaModalSplash.onerror = function() {
            console.warn(`Büyük resim (Splash Alanı) yüklenemedi (onerror): ${this.src}`);
            const mainSplashFallbackFromDataset = chromaModalSplash.dataset.mainSplashFallback;
            if (mainSplashFallbackFromDataset) {
                this.src = mainSplashFallbackFromDataset; 
                this.onerror = function() { 
                    console.error(`Büyük resim için ana kostüm splash'ı da BAŞARISIZ: ${this.src}`);
                    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNwbGFzaCBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                    this.onerror = null;
                }
            } else { 
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNwbGFzaCBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                this.onerror = null;
            }
        };
      } else {
          console.warn("Büyük resim için geçerli bir URL bulunamadı, ana kostüm DDragon splash'ına fallback yapılıyor.");
          chromaModalSplash.src = chromaModalSplash.dataset.mainSplashFallback || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNwbGFzaCBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
      }
      
      document.querySelectorAll('.chroma-item.active').forEach(i => i.classList.remove('active'));
      chromaItem.classList.add('active');
    });
    chromaListEl.appendChild(chromaItem);

  }); // End of forEach

  chromaModal.classList.add('visible');
}

// Kapanma Butonu ve ESC tuşu event listener'ları
chromaModalClose.addEventListener('click', () => {
  console.log("Chroma modal close button clicked.");
  chromaModal.classList.remove('visible');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (settingsModal.classList.contains('visible')) {
        console.log("Escape key pressed, closing settings modal.");
        settingsModal.classList.remove('visible');
    } else if (chromaModal.classList.contains('visible')) {
        console.log("Escape key pressed, closing chroma modal.");
        chromaModal.classList.remove('visible');
    }
  }
});

chromaModal.addEventListener('click', (e) => {
    if (e.target === chromaModal) { 
        console.log("Clicked outside chroma modal content, closing.");
        chromaModal.classList.remove('visible');
    }
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) { 
        console.log("Clicked outside settings modal content, closing.");
        settingsModal.classList.remove('visible');
    }
});

// YENİ: Global click listener (custom select dışına tıklandığında kapatmak için)
window.addEventListener('click', (e) => {
  if (!customSelectContainer.contains(e.target)) {
    customSelectContainer.classList.remove('open');
  }
});


initializeApp();
