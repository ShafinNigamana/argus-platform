import 'package:flutter/material.dart';

import 'capture/capture_screen.dart';
import 'screens/home_screen.dart';
import 'screens/processing_screen.dart';
import 'screens/result_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ArgusApp());
}

class ArgusApp extends StatelessWidget {
  const ArgusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Argus',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/',
      onGenerateRoute: (settings) {
        Widget page;
        switch (settings.name) {
          case '/':
            page = const HomeScreen();
          case '/capture':
            page = const CaptureScreen();
          case '/processing':
            page = const ProcessingScreen();
          case '/result':
            page = const ResultScreen();
          default:
            page = const HomeScreen();
        }

        return PageRouteBuilder(
          settings: settings,
          transitionDuration: const Duration(milliseconds: 400),
          reverseTransitionDuration: const Duration(milliseconds: 300),
          pageBuilder: (context, a1, a2) => page,
          transitionsBuilder: (context, animation, a2, child) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            );
            return FadeTransition(
              opacity: curved,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.03),
                  end: Offset.zero,
                ).animate(curved),
                child: child,
              ),
            );
          },
        );
      },
    );
  }
}
