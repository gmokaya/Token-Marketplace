export type CoffeeOriginDetails = {
  regions: string[];
  varieties: string[];
};

export const COFFEE_ORIGIN_CATALOG: Record<string, CoffeeOriginDetails> = {
  Kenya: {
    regions: ["Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Embu", "Meru", "Machakos", "Nakuru", "Kericho", "Nandi", "Bungoma", "Kisii"],
    varieties: ["SL28", "SL34", "Batian", "Ruiru 11", "K7", "French Mission Bourbon", "Blue Mountain", "Other"],
  },
  Ethiopia: {
    regions: ["Yirgacheffe", "Sidama", "Guji", "Limu", "Jimma", "Harrar", "Kaffa", "Bench Maji", "Nekemte / Wellega"],
    varieties: ["Ethiopian Heirloom", "Landrace", "74110", "74112", "74158", "Other"],
  },
  Colombia: {
    regions: ["Huila", "Nariño", "Antioquia", "Tolima", "Cauca", "Caldas", "Risaralda", "Quindío", "Santander", "Sierra Nevada"],
    varieties: ["Castillo", "Caturra", "Colombia", "Bourbon", "Pink Bourbon", "Typica", "Geisha", "Pacamara", "Tabi", "Other"],
  },
  Brazil: {
    regions: ["Minas Gerais", "Sul de Minas", "Cerrado Mineiro", "Mogiana", "Chapada Diamantina", "Espírito Santo"],
    varieties: ["Bourbon", "Yellow Bourbon", "Mundo Novo", "Catuai", "Caturra", "Typica", "Geisha", "Other"],
  },
  Guatemala: {
    regions: ["Antigua", "Huehuetenango", "Atitlán", "Cobán", "Acatenango", "Fraijanes", "Nuevo Oriente", "San Marcos"],
    varieties: ["Bourbon", "Caturra", "Catuai", "Typica", "Pacamara", "Geisha", "Other"],
  },
  "Costa Rica": {
    regions: ["Tarrazú", "West Valley", "Central Valley", "Brunca", "Turrialba", "Orosi"],
    varieties: ["Caturra", "Catuai", "Bourbon", "Villa Sarchi", "Geisha", "SL28", "Other"],
  },
  Panama: {
    regions: ["Boquete", "Volcán", "Renacimiento", "Chiriquí"],
    varieties: ["Geisha / Gesha", "Caturra", "Catuai", "Typica", "Pacamara", "Other"],
  },
  Rwanda: {
    regions: ["Western Province", "Southern Province", "Northern Province", "Eastern Province"],
    varieties: ["Red Bourbon", "Bourbon", "Jackson", "Mibirizi", "Other"],
  },
  Burundi: {
    regions: ["Kayanza", "Ngozi", "Muyinga", "Kirundo", "Gitega", "Karusi"],
    varieties: ["Red Bourbon", "Bourbon", "Jackson", "Mibirizi", "Other"],
  },
  Uganda: {
    regions: ["Mount Elgon", "Bugisu", "Rwenzori", "West Nile", "Central Region", "Central"],
    varieties: ["SL14", "SL28", "Nyasaland", "Kent", "Robusta", "Other"],
  },
  Tanzania: {
    regions: ["Kilimanjaro", "Arusha", "Mbeya", "Mbinga", "Ruvuma", "Kigoma", "Kagera"],
    varieties: ["Kent", "Bourbon", "Typica", "N39", "Robusta", "Other"],
  },
};

export const COFFEE_PROCESSING_TYPES = [
  "Washed / Fully Washed",
  "Natural / Dry Process",
  "Honey",
  "Pulped Natural",
  "Semi-Washed",
  "Wet-Hulled",
  "Anaerobic",
  "Carbonic Maceration",
  "Lactic Fermentation",
  "Yeast Fermentation",
  "Extended Fermentation",
  "Co-Fermentation",
  "Double Fermentation",
  "Experimental",
  "Other",
];