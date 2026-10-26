import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => "ApiException: $message (status: $statusCode)";
}

class ApiClient {
  static const Duration timeoutDuration = Duration(seconds: 15);

  static Future<dynamic> get(String url) async {
    try {
      final uri = Uri.parse(url);
      final response = await http.get(uri).timeout(timeoutDuration);
      return _processResponse(response);
    } on TimeoutException {
      throw ApiException("Connection timed out. Server unreachable.");
    } on http.ClientException catch (e) {
      throw ApiException("Network error: ${e.message}");
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException("Unexpected error: $e");
    }
  }

  static Future<dynamic> post(String url, {Map<String, dynamic>? body}) async {
    try {
      final uri = Uri.parse(url);
      final response = await http.post(
        uri,
        headers: {"Content-Type": "application/json"},
        body: body != null ? jsonEncode(body) : null,
      ).timeout(timeoutDuration);
      return _processResponse(response);
    } on TimeoutException {
      throw ApiException("Connection timed out. Server unreachable.");
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException("Unexpected error: $e");
    }
  }

  static Future<dynamic> delete(String url) async {
    try {
      final uri = Uri.parse(url);
      final response = await http.delete(uri).timeout(timeoutDuration);
      return _processResponse(response);
    } on TimeoutException {
      throw ApiException("Connection timed out. Server unreachable.");
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException("Unexpected error: $e");
    }
  }

  static dynamic _processResponse(http.Response response) {
    final status = response.statusCode;
    if (status >= 200 && status < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(utf8.decode(response.bodyBytes));
    } else if (status == 404) {
      throw ApiException("Resource not found", statusCode: 404);
    } else if (status >= 500) {
      throw ApiException("Server error (${response.statusCode})", statusCode: status);
    } else {
      String msg = "Request failed with code $status";
      try {
        final err = jsonDecode(response.body);
        if (err is Map && err.containsKey("detail")) {
          msg = err["detail"].toString();
        }
      } catch (_) {}
      throw ApiException(msg, statusCode: status);
    }
  }
}
