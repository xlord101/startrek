export interface LocationCityData {
  city: string;
  state: string;
  towns: string[];
}

export const LOCATION_DATABASE: LocationCityData[] = [
  {
    city: "Solapur",
    state: "Maharashtra",
    towns: [
      "Kandar",
      "Bittergaon",
      "Karmala",
      "Barshi",
      "Pandharpur",
      "Sangola",
      "Mohol",
      "Akkalkot",
      "Madha",
      "Malshiras",
      "Bhacharwada",
      "North Solapur",
      "South Solapur",
    ],
  },
  {
    city: "Kanyakumari",
    state: "Tamil Nadu",
    towns: [
      "Thovalai",
      "Agastheeswaram",
      "Marthandam",
      "Colachel",
      "Nagercoil",
      "Padmanabhapuram",
      "Radhapuram",
      "Vallioor",
      "Kanyakumari Town",
    ],
  },
  {
    city: "Jalgaon",
    state: "Maharashtra",
    towns: [
      "Raver",
      "Yawal",
      "Muktainagar",
      "Bhusawal",
      "Chopda",
      "Jamner",
      "Pachora",
      "Jalgaon City",
    ],
  },
  {
    city: "Pune",
    state: "Maharashtra",
    towns: ["Indapur", "Baramati", "Juri", "Shirur", "Daund", "Purandar"],
  },
  {
    city: "Sangli",
    state: "Maharashtra",
    towns: ["Walwa", "Miraj", "Shirala", "Palus", "Kadegaon"],
  },
  {
    city: "Theni",
    state: "Tamil Nadu",
    towns: ["Cumbum", "Uthamapalayam", "Bodinayakanur", "Periyakulam", "Andipatti"],
  },
  {
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    towns: ["Lalgudi", "Musiri", "Thottiyam", "Manachanallur", "Srirangam"],
  },
  {
    city: "Anantapur",
    state: "Andhra Pradesh",
    towns: ["Tadpatri", "Gooty", "Singanamala", "Dharmavaram", "Kalyandurg"],
  },
  {
    city: "Bharuch",
    state: "Gujarat",
    towns: ["Ankleshwar", "Jambusar", "Jhagadia", "Vagra", "Hansot"],
  },
];

export function getCityData(cityName: string): LocationCityData | undefined {
  return LOCATION_DATABASE.find(
    (c) => c.city.toLowerCase() === cityName.toLowerCase()
  );
}

export function parseStructuredAddress(addressStr: string) {
  if (!addressStr) return { lane: "", town: "", city: "", state: "" };
  const parts = addressStr.split(",").map((p) => p.trim());
  if (parts.length >= 4) {
    return {
      lane: parts[0],
      town: parts[1],
      city: parts[2],
      state: parts[3],
    };
  } else if (parts.length === 3) {
    return {
      lane: parts[0],
      town: parts[1],
      city: parts[2],
      state: getCityData(parts[2])?.state || "Maharashtra",
    };
  } else if (parts.length === 2) {
    return {
      lane: parts[0],
      town: parts[1],
      city: "Solapur",
      state: "Maharashtra",
    };
  }
  return {
    lane: addressStr,
    town: "Kandar",
    city: "Solapur",
    state: "Maharashtra",
  };
}
