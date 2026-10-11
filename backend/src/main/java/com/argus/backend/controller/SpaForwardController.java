package com.argus.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to forward HTML5 SPA client-side routes to index.html,
 * ensuring direct URL entry, browser refresh, and bookmarking work seamlessly
 * across all client application views.
 */
@Controller
public class SpaForwardController {

    @GetMapping({
        "/overview",
        "/verify",
        "/history",
        "/records",
        "/sessions",
        "/certificate",
        "/certificate/{id}",
        "/policies",
        "/audit",
        "/trust",
        "/architecture",
        "/demo",
        "/profile",
        "/account",
        "/login",
        "/register",
        "/signup",
        "/how-it-works",
        "/privacy",
        "/limits",
        "/capabilities"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
