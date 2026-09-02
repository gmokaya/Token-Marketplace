export type TeaOriginDetails = {
  regions: string[];
  varieties: string[];
  varietiesByRegion?: Record<string, string[]>;
};

export const TEA_ORIGIN_CATALOG: Record<string, TeaOriginDetails> = {
  Kenya: {
    regions: ["Kericho", "Nandi", "Bomet", "Nyamira", "Kiambu", "Murang'a", "Nyeri", "Embu", "Kakamega"],
    varieties: ["TRFK 6/8", "TRFK 7/3", "TRFK 11/4", "TRFK 12/12", "TRFK 31/27", "Other"],
    varietiesByRegion: {
      Kericho: ["TRFK 6/8", "TRFK 7/3", "TRFK 11/4", "Other"],
      Nandi: ["TRFK 6/8", "TRFK 12/12", "TRFK 31/27", "Other"],
      Bomet: ["TRFK 6/8", "TRFK 7/3", "TRFK 12/12", "Other"],
      Nyamira: ["TRFK 6/8", "TRFK 7/3", "TRFK 11/4", "Other"],
      Kiambu: ["TRFK 6/8", "TRFK 7/3", "Other"],
      "Murang'a": ["TRFK 6/8", "TRFK 7/3", "Other"],
      Nyeri: ["TRFK 6/8", "TRFK 7/3", "Other"],
      Embu: ["TRFK 6/8", "TRFK 7/3", "Other"],
      Kakamega: ["TRFK 6/8", "TRFK 7/3", "TRFK 11/4", "Other"],
    },
  },
  China: {
    regions: ["Yunnan", "Fujian", "Zhejiang", "Anhui", "Hunan", "Hubei", "Jiangxi", "Sichuan", "Guangdong", "Guangxi"],
    varieties: ["Assamica", "Sinensis", "Qing Xin", "Jin Xuan", "Other"],
    varietiesByRegion: {
      Yunnan: ["Assamica", "Sinensis", "Other"],
      Fujian: ["Sinensis", "Qing Xin", "Jin Xuan", "Other"],
      Zhejiang: ["Sinensis", "Other"],
      Anhui: ["Sinensis", "Other"],
      Hunan: ["Sinensis", "Other"],
      Hubei: ["Sinensis", "Other"],
      Jiangxi: ["Sinensis", "Other"],
      Sichuan: ["Assamica", "Sinensis", "Other"],
      Guangdong: ["Sinensis", "Jin Xuan", "Other"],
      Guangxi: ["Sinensis", "Other"],
    },
  },
  India: {
    regions: ["Assam", "Darjeeling", "Nilgiri", "Dooars-Terai", "Kangra", "Sikkim", "Tripura", "Himachal Pradesh", "Kerala", "Karnataka"],
    varieties: ["Assamica", "Sinensis", "Assam", "Darjeeling", "Other"],
    varietiesByRegion: {
      Assam: ["Assamica", "Assam", "Other"],
      Darjeeling: ["Darjeeling", "Sinensis", "Other"],
      Nilgiri: ["Sinensis", "Other"],
      "Dooars-Terai": ["Assamica", "Assam", "Other"],
      Kangra: ["Sinensis", "Other"],
      Sikkim: ["Sinensis", "Darjeeling", "Other"],
      Tripura: ["Assamica", "Assam", "Other"],
      "Himachal Pradesh": ["Sinensis", "Other"],
      Kerala: ["Assamica", "Other"],
      Karnataka: ["Assamica", "Sinensis", "Other"],
    },
  },
  "Sri Lanka": {
    regions: ["Uva", "Dimbula", "Nuwara Eliya", "Kandy", "Ruhuna", "Sabaragamuwa", "Uda Pussellawa"],
    varieties: ["Ceylon", "Sinensis", "Other"],
  },
  Japan: {
    regions: ["Shizuoka", "Kagoshima", "Mie", "Kyoto", "Uji", "Fukuoka", "Miyazaki", "Kumamoto", "Saga", "Nara"],
    varieties: ["Yabukita", "Saemidori", "Okumidori", "Sinensis", "Other"],
  },
  Taiwan: {
    regions: ["Alishan", "Lishan", "Nantou", "Yushan", "Wenshan", "Hsinchu", "Taoyuan", "Miaoli", "Pinglin"],
    varieties: ["Qing Xin", "Jin Xuan", "Sinensis", "Other"],
  },
  Vietnam: {
    regions: ["Thai Nguyen", "Lam Dong", "Ha Giang", "Yen Bai", "Son La", "Lai Chau", "Nghe An"],
    varieties: ["Shan Tuyet", "Sinensis", "Other"],
  },
  Rwanda: {
    regions: ["Northern Province", "Southern Province", "Western Province", "Eastern Province"],
    varieties: ["TRFK 6/8", "TRFK 7/3", "TRFK 11/4", "Other"],
  },
  Malawi: {
    regions: ["Thyolo", "Mulanje", "Nkhata Bay", "Viphya", "Nkhotakota", "Mzuzu"],
    varieties: ["TRFK 6/8", "TRFK 7/3", "Other"],
  },
  Tanzania: {
    regions: ["Mbeya", "Njombe", "Iringa", "Tanga", "Rungwe", "Usambara", "Lushoto", "Tukuyu"],
    varieties: ["TRFK 6/8", "TRFK 7/3", "Other"],
  },
  Uganda: {
    regions: ["Fort Portal", "Kabale", "Kisoro", "Bundibugyo", "Rwenzori", "Zombo", "Bushenyi", "Kigezi"],
    varieties: ["TRFK 6/8", "TRFK 7/3", "Other"],
  },
  Bangladesh: {
    regions: ["Sylhet", "Moulvibazar", "Habiganj", "Chattogram", "Panchagarh"],
    varieties: ["Assamica", "Sinensis", "Other"],
  },
  Nepal: {
    regions: ["Ilam", "Jhapa", "Panchthar", "Dhankuta", "Terhathum", "Taplejung"],
    varieties: ["Assamica", "Sinensis", "Darjeeling", "Other"],
  },
  Indonesia: {
    regions: ["West Java", "Central Java", "North Sumatra", "South Sumatra", "West Sumatra", "Bali", "East Java", "Sulawesi", "Papua"],
    varieties: ["Assamica", "Sinensis", "Other"],
  },
  Turkey: {
    regions: ["Rize", "Trabzon", "Artvin", "Giresun"],
    varieties: ["Sinensis", "Other"],
  },
  Other: {
    regions: ["Other"],
    varieties: ["Other"],
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

export function getTeaVarieties(country?: string, region?: string) {
  const origin = country ? TEA_ORIGIN_CATALOG[country] : undefined;
  if (!origin || !region) return [];
  return origin.varietiesByRegion?.[region] ?? origin.varieties;
}