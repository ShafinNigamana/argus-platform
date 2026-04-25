package com.argus.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.HashMap;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, String> index() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Argus Backend API is running");
        response.put("version", "0.0.1-SNAPSHOT");
        return response;
    }

    @GetMapping("/api/v1")
    public Map<String, String> apiIndex() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("api_version", "v1");
        response.put("endpoints", "/session/start, /session/{id}/result, /verify/{id}");
        return response;
    }
}
