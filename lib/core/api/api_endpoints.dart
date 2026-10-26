/// API Endpoints and Network Configuration for RailForecastAI.
class ApiEndpoints {
  // Default to Android Emulator loopback; switch to localhost or custom IP as needed
  static String baseUrl = "http://10.0.2.2:8000";

  static void setBaseUrl(String url) {
    baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  static String get health => "$baseUrl/api/health";
  static String get trains => "$baseUrl/api/trains";
  static String get searchTrains => "$baseUrl/api/trains/search";
  static String trainDetails(String number) => "$baseUrl/api/trains/$number";
  static String trainSchedule(String number) => "$baseUrl/api/trains/$number/schedule";
  static String trainRoute(String number) => "$baseUrl/api/trains/$number/route";
  static String trainLive(String number) => "$baseUrl/api/trains/$number/live";
  static String trainPredictions(String number) => "$baseUrl/api/trains/$number/predictions";
  static String get networkStats => "$baseUrl/api/trains/network/live-stats";

  static String get stations => "$baseUrl/api/stations";
  static String get searchStations => "$baseUrl/api/stations/search";
  static String stationDetails(String code) => "$baseUrl/api/stations/$code";

  static String get predictEta => "$baseUrl/api/predictions/eta";
  static String get modelStatus => "$baseUrl/api/model/status";

  static String get savedTrains => "$baseUrl/api/saved/trains";
  static String savedTrainDelete(String number) => "$baseUrl/api/saved/trains/$number";

  static String get alerts => "$baseUrl/api/alerts";
  static String alertDelete(int id) => "$baseUrl/api/alerts/$id";

  static String get websocket => baseUrl.replaceFirst("http", "ws") + "/ws";
}
