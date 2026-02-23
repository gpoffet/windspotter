export interface AlplakesLake {
  /** Identifiant Alplakes (slug URL, ex. "geneva") */
  key: string;
  /** Nom affiché */
  name: string;
  /** Latitude du centre */
  lat: number;
  /** Longitude du centre */
  lng: number;
}

/** Liste statique des lacs supportés par Alplakes (source : metadata.json du repo GitHub). */
export const ALPLAKES_LAKES: AlplakesLake[] = [
  { key: 'ageri', name: 'Lake Aegeri', lat: 47.125, lng: 8.620 },
  { key: 'allensteig', name: 'Allentsteig', lat: 48.690, lng: 15.327 },
  { key: 'alpnachersee', name: 'Lake Alpnach', lat: 46.968, lng: 8.321 },
  { key: 'amsoldingersee', name: 'Amsoldingersee', lat: 46.725, lng: 7.576 },
  { key: 'annecy', name: 'Lake Annecy', lat: 45.854, lng: 6.176 },
  { key: 'attersee', name: 'Attersee', lat: 47.880, lng: 13.550 },
  { key: 'baldegg', name: 'Lake Baldegg', lat: 47.197, lng: 8.261 },
  { key: 'barchetsee', name: 'Barchetsee', lat: 47.615, lng: 8.753 },
  { key: 'barone', name: 'Lago Barone', lat: 46.402, lng: 8.752 },
  { key: 'bichelsee', name: 'Bichelsee', lat: 47.457, lng: 8.900 },
  { key: 'biel', name: 'Lake Biel', lat: 47.080, lng: 7.170 },
  { key: 'bled', name: 'Lake Bled', lat: 46.364, lng: 14.095 },
  { key: 'bourget', name: 'Lake Bourget', lat: 45.742, lng: 5.862 },
  { key: 'brenet', name: 'Lake Brenet', lat: 46.673, lng: 6.323 },
  { key: 'bret', name: 'Lac de Bret', lat: 46.514, lng: 6.773 },
  { key: 'bretaye', name: 'Lac de Bretaye', lat: 46.326, lng: 7.072 },
  { key: 'brienz', name: 'Lake Brienz', lat: 46.718, lng: 7.952 },
  { key: 'burgaschisee', name: 'Burgäschisee', lat: 47.169, lng: 7.669 },
  { key: 'burgseeli', name: 'Burgseeli', lat: 46.697, lng: 7.886 },
  { key: 'cadagno', name: 'Lake Cadagno', lat: 46.550, lng: 8.712 },
  { key: 'caldaro', name: 'Lake Caldaro', lat: 46.380, lng: 11.264 },
  { key: 'caldonazzo', name: 'Lake Caldonazzo', lat: 46.020, lng: 11.240 },
  { key: 'champfer', name: 'Lake Champfèr', lat: 46.469, lng: 9.806 },
  { key: 'chavonnes', name: 'Lac des Chavonnes', lat: 46.333, lng: 7.086 },
  { key: 'chlimoossee', name: 'Chli Moossee', lat: 47.026, lng: 7.469 },
  { key: 'como', name: 'Lake Como', lat: 46.022, lng: 9.266 },
  { key: 'constance', name: 'Lake Constance', lat: 47.629, lng: 9.374 },
  { key: 'dittligsee', name: 'Dittligsee', lat: 46.756, lng: 7.534 },
  { key: 'edlerseeteich', name: 'Edlerseeteich', lat: 48.750, lng: 15.660 },
  { key: 'egelsee', name: 'Egelsee', lat: 47.257, lng: 8.818 },
  { key: 'faaker', name: 'Faaker See', lat: 46.580, lng: 13.930 },
  { key: 'frauenwieserteich', name: 'Frauenwieserteich', lat: 48.577, lng: 14.834 },
  { key: 'fuschlsee', name: 'Fuschlsee', lat: 47.800, lng: 13.280 },
  { key: 'gajsevsko', name: 'Lake Gajševsko', lat: 46.536, lng: 16.115 },
  { key: 'garda', name: 'Lake Garda', lat: 45.580, lng: 10.630 },
  { key: 'geistsee', name: 'Geistsee', lat: 46.761, lng: 7.535 },
  { key: 'geneva', name: 'Lake Geneva', lat: 46.450, lng: 6.500 },
  { key: 'gerzensee', name: 'Gerzensee', lat: 46.830, lng: 7.547 },
  { key: 'grabensee', name: 'Grabensee', lat: 47.990, lng: 13.090 },
  { key: 'greifensee', name: 'Lake Greifen', lat: 47.360, lng: 8.680 },
  { key: 'gruyere', name: 'Lake of Gruyère', lat: 46.708, lng: 7.095 },
  { key: 'hallstatter', name: 'Lake Hallstätter', lat: 47.575, lng: 13.662 },
  { key: 'hallwil', name: 'Lake Hallwil', lat: 47.280, lng: 8.220 },
  { key: 'hasenseeost', name: 'Hasensee Ost', lat: 47.607, lng: 8.832 },
  { key: 'hasenseewest', name: 'Hasensee West', lat: 47.608, lng: 8.827 },
  { key: 'hauptwilerweiher', name: 'Hauptwiler Weiher', lat: 47.480, lng: 9.256 },
  { key: 'herrensee', name: 'Herrensee', lat: 48.953, lng: 15.044 },
  { key: 'hugiweiher', name: 'Hugiweiher', lat: 47.572, lng: 8.861 },
  { key: 'husemersee', name: 'Husemersee', lat: 47.622, lng: 8.705 },
  { key: 'huttnersee', name: 'Hüttnersee', lat: 47.183, lng: 8.675 },
  { key: 'huttwilersee', name: 'Hüttwilersee', lat: 47.610, lng: 8.844 },
  { key: 'idro', name: 'Lake Idro', lat: 45.780, lng: 10.513 },
  { key: 'inkwilersee', name: 'Inkwilersee', lat: 47.198, lng: 7.664 },
  { key: 'irrsee', name: 'Irrsee', lat: 47.910, lng: 13.307 },
  { key: 'iseo', name: 'Lake Iseo', lat: 45.730, lng: 10.070 },
  { key: 'joux', name: 'Lac de Joux', lat: 46.640, lng: 6.290 },
  { key: 'katzen', name: 'Oberer Katzensee', lat: 47.434, lng: 8.498 },
  { key: 'klontalersee', name: 'Lake Klöntal', lat: 47.032, lng: 8.994 },
  { key: 'lauerz', name: 'Lake Lauerz', lat: 47.030, lng: 8.607 },
  { key: 'ledavsko', name: 'Lake Ledava', lat: 46.751, lng: 16.040 },
  { key: 'lenkerseeli', name: 'Lenkerseeli', lat: 46.449, lng: 7.442 },
  { key: 'lioson', name: 'Lac Lioson', lat: 46.386, lng: 7.129 },
  { key: 'lobsigensee', name: 'Lobsigensee', lat: 47.031, lng: 7.298 },
  { key: 'lucerne', name: 'Lake Lucerne', lat: 47.016, lng: 8.429 },
  { key: 'lugano', name: 'Lake Lugano', lat: 45.990, lng: 8.970 },
  { key: 'lungern', name: 'Lake Lungern', lat: 46.799, lng: 8.161 },
  { key: 'lutzelsee', name: 'Lützelsee', lat: 47.260, lng: 8.773 },
  { key: 'maggiore', name: 'Lake Maggiore', lat: 45.964, lng: 8.645 },
  { key: 'marwilermoos', name: 'Märwiler Moos', lat: 47.539, lng: 9.075 },
  { key: 'mattsee', name: 'Mattsee', lat: 47.983, lng: 13.122 },
  { key: 'mauensee', name: 'Mauensee', lat: 47.171, lng: 8.075 },
  { key: 'mettmenhaslisee', name: 'Mettmenhaslisee', lat: 47.474, lng: 8.492 },
  { key: 'millstaetter', name: 'Millstätter See', lat: 46.794, lng: 13.584 },
  { key: 'mondsee', name: 'Mondsee', lat: 47.827, lng: 13.380 },
  { key: 'moossee', name: 'Moossee', lat: 47.022, lng: 7.480 },
  { key: 'murten', name: 'Lake Murten', lat: 46.930, lng: 7.080 },
  { key: 'neuchatel', name: 'Lake Neuchâtel', lat: 46.904, lng: 6.843 },
  { key: 'nussbommersee', name: 'Nussbommersee', lat: 47.615, lng: 8.814 },
  { key: 'oberesbanzlauiseeli', name: 'Oberes Bänzlauiseeli', lat: 46.693, lng: 8.286 },
  { key: 'obererbommerweiher', name: 'Oberer Bommerweiher', lat: 47.618, lng: 9.156 },
  { key: 'obertrumer', name: 'Obertrumer', lat: 47.964, lng: 13.087 },
  { key: 'oeschinensee', name: 'Lake Oeschinen', lat: 46.498, lng: 7.727 },
  { key: 'ossiacher', name: 'Ossiacher See', lat: 46.666, lng: 13.956 },
  { key: 'ottenstein', name: 'Ottenstein Reservoir', lat: 48.593, lng: 15.323 },
  { key: 'pernisko', name: 'Lake Pernica', lat: 46.593, lng: 15.725 },
  { key: 'pfaffikon', name: 'Lake Pfäffikon', lat: 47.352, lng: 8.784 },
  { key: 'poschiavo', name: 'Lago di Poschiavo', lat: 46.279, lng: 10.098 },
  { key: 'poysdorf', name: 'Poysdorf', lat: 48.666, lng: 16.610 },
  { key: 'rotsee', name: 'Rotsee', lat: 47.070, lng: 8.316 },
  { key: 'saemtiser', name: 'Sämtisersee', lat: 47.271, lng: 9.458 },
  { key: 'sarnen', name: 'Lake Sarnen', lat: 46.865, lng: 8.204 },
  { key: 'sassolo', name: 'Lago di Sassolo', lat: 46.476, lng: 8.593 },
  { key: 'seealp', name: 'Seealpsee', lat: 47.268, lng: 9.401 },
  { key: 'seeweidsee', name: 'Seeweidsee', lat: 47.257, lng: 8.746 },
  { key: 'sempach', name: 'Lake Sempach', lat: 47.140, lng: 8.159 },
  { key: 'sihlsee', name: 'Lake Sihl', lat: 47.148, lng: 8.782 },
  { key: 'sils', name: 'Lake Sils', lat: 46.423, lng: 9.739 },
  { key: 'silvaplana', name: 'Lake Silvaplana', lat: 46.449, lng: 9.792 },
  { key: 'slivnisko', name: 'Lake Slivnica', lat: 46.189, lng: 15.444 },
  { key: 'smartinsko', name: 'Lake Šmartno', lat: 46.281, lng: 15.268 },
  { key: 'soppensee', name: 'Soppensee', lat: 47.091, lng: 8.081 },
  { key: 'stmoritz', name: 'Lake St Moritz', lat: 46.495, lng: 9.845 },
  { key: 'stockseewli', name: 'Stockseewli', lat: 46.600, lng: 8.325 },
  { key: 'superiore', name: 'Lago Superiore', lat: 46.476, lng: 8.585 },
  { key: 'thun', name: 'Lake Thun', lat: 46.682, lng: 7.733 },
  { key: 'tome', name: 'Lago di Tome', lat: 46.363, lng: 8.690 },
  { key: 'traunsee', name: 'Traunsee', lat: 47.868, lng: 13.796 },
  { key: 'turlersee', name: 'Türlersee', lat: 47.270, lng: 8.500 },
  { key: 'uebeschisee', name: 'Uebeschisee', lat: 46.734, lng: 7.565 },
  { key: 'untererchatzensee', name: 'Unterer Chatzensee', lat: 47.431, lng: 8.489 },
  { key: 'vagoweiher', name: 'Vago Weiher', lat: 47.586, lng: 9.029 },
  { key: 'walensee', name: 'Lake Walen', lat: 47.123, lng: 9.223 },
  { key: 'wallersee', name: 'Wallersee', lat: 47.912, lng: 13.169 },
  { key: 'wilemersee', name: 'Wilemersee', lat: 47.600, lng: 8.799 },
  { key: 'wistererweiher', name: 'Wisterer Weiher', lat: 47.582, lng: 9.055 },
  { key: 'wolfgangsee', name: 'Wolfgangsee', lat: 47.750, lng: 13.390 },
  { key: 'worthersee', name: 'Wörthersee', lat: 46.627, lng: 14.110 },
  { key: 'zeller', name: 'Zeller', lat: 47.322, lng: 12.807 },
  { key: 'zug', name: 'Lake Zug', lat: 47.098, lng: 8.492 },
  { key: 'zurich', name: 'Lake Zurich', lat: 47.240, lng: 8.680 },
];

/** Distance Haversine entre deux coordonnées, en kilomètres. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Trouve le lac Alplakes le plus proche (< 50 km). Retourne null si aucun n'est assez proche. */
export function findNearestAlplakesLake(
  lat: number,
  lng: number,
): { lake: AlplakesLake; distance: number } | null {
  let nearest: { lake: AlplakesLake; distance: number } | null = null;
  for (const lake of ALPLAKES_LAKES) {
    const d = haversineKm(lat, lng, lake.lat, lake.lng);
    if (!nearest || d < nearest.distance) {
      nearest = { lake, distance: d };
    }
  }
  return nearest && nearest.distance < 50 ? nearest : null;
}
