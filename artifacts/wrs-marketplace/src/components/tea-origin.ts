export type TeaOriginDetails = {
  regions: string[];
};

export const TEA_ORIGIN_CATALOG: Record<string, TeaOriginDetails> = {
  Kenya: {
    regions: ["Kericho", "Nandi", "Bomet", "Nyamira", "Kiambu", "Murang'a", "Nyeri", "Embu", "Kakamega"],
  },
  China: {
    regions: ["Yunnan", "Fujian", "Zhejiang", "Anhui", "Hunan", "Hubei", "Jiangxi", "Sichuan", "Guangdong", "Guangxi"],
  },
  India: {
    regions: ["Assam", "Darjeeling", "Nilgiri", "Dooars-Terai", "Kangra", "Sikkim", "Tripura", "Himachal Pradesh", "Kerala", "Karnataka"],
  },
  "Sri Lanka": {
    regions: ["Uva", "Dimbula", "Nuwara Eliya", "Kandy", "Ruhuna", "Sabaragamuwa", "Uda Pussellawa"],
  },
  Japan: {
    regions: ["Shizuoka", "Kagoshima", "Mie", "Kyoto", "Uji", "Fukuoka", "Miyazaki", "Kumamoto", "Saga", "Nara"],
  },
  Taiwan: {
    regions: ["Alishan", "Lishan", "Nantou", "Yushan", "Wenshan", "Hsinchu", "Taoyuan", "Miaoli", "Pinglin"],
  },
  Vietnam: {
    regions: ["Thai Nguyen", "Lam Dong", "Ha Giang", "Yen Bai", "Son La", "Lai Chau", "Nghe An"],
  },
  Rwanda: {
    regions: ["Northern Province", "Southern Province", "Western Province", "Eastern Province"],
  },
  Malawi: {
    regions: ["Thyolo", "Mulanje", "Nkhata Bay", "Viphya", "Nkhotakota", "Mzuzu"],
  },
  Tanzania: {
    regions: ["Mbeya", "Njombe", "Iringa", "Tanga", "Rungwe", "Usambara", "Lushoto", "Tukuyu"],
  },
  Uganda: {
    regions: ["Fort Portal", "Kabale", "Kisoro", "Bundibugyo", "Rwenzori", "Zombo", "Bushenyi", "Kigezi"],
  },
  Bangladesh: {
    regions: ["Sylhet", "Moulvibazar", "Habiganj", "Chattogram", "Panchagarh"],
  },
  Nepal: {
    regions: ["Ilam", "Jhapa", "Panchthar", "Dhankuta", "Terhathum", "Taplejung"],
  },
  Indonesia: {
    regions: ["West Java", "Central Java", "North Sumatra", "South Sumatra", "West Sumatra", "Bali", "East Java", "Sulawesi", "Papua"],
  },
  Turkey: {
    regions: ["Rize", "Trabzon", "Artvin", "Giresun"],
  },
  Other: {
    regions: ["Other"],
  },
};

export const TEA_VARIETIES = [
  "Assamica",
  "Sinensis",
  "Assam",
  "Ceylon",
  "Darjeeling",
  "Yabukita",
  "Saemidori",
  "Okumidori",
  "Qing Xin",
  "Jin Xuan",
  "TRFK 6/8",
  "TRFK 7/3",
  "TRFK 11/4",
  "TRFK 12/12",
  "TRFK 31/27",
  "TRFK 108",
  "TRFK 303/152",
  "TRFK 338",
  "TRFK 340",
  "TRFK 357",
  "Shan Tuyet",
  "Other",
];

export const TEA_TYPES = [
  "Black Tea",
  "Green Tea",
  "White Tea",
  "Oolong Tea",
  "Yellow Tea",
  "Dark Tea",
  "Purple Tea",
  "Matcha",
  "Herbal / Tisane",
  "Flavoured Tea",
  "Blended Tea",
  "Other",
];

export const TEA_PROCESSING_METHODS = [
  "CTC",
  "Orthodox",
  "Hand-Processed",
  "Steamed",
  "Pan-Fired",
  "Sun-Dried",
  "Withered",
  "Semi-Oxidized",
  "Fully Oxidized",
  "Unoxidized",
  "Fermented",
  "Post-Fermented",
  "Smoked",
  "Scented",
  "Blended",
  "Other",
];

export const TEA_GRADES = [
  "Whole Leaf",
  "Broken Leaf",
  "Fannings",
  "Dust",
  "Premium",
  "Specialty",
  "Conventional",
  "Other",
];