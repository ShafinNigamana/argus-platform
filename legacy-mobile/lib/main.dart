import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'capture/capture_screen.dart';
import 'screens/about_screen.dart';
import 'screens/history_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/processing_screen.dart';
import 'screens/result_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Status bar: transparent, light icons — blends with dark theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppTheme.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Check if onboarding has been completed
  final prefs = await SharedPreferences.getInstance();
  final onboardingDone = prefs.getBool('onboarding_done') ?? false;

  runApp(ArgusApp(showOnboarding: !onboardingDone));
}

class ArgusApp extends StatelessWidget {
  final bool showOnboarding;
  const ArgusApp({super.key, required this.showOnboarding});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Argus',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: showOnboarding ? '/onboarding' : '/home',
      onGenerateRoute: (settings) {
        Widget page;
        switch (settings.name) {
          case '/onboarding':
            page = const OnboardingScreen();
          case '/':
          case '/home':
            page = const HomeScreen();
          case '/capture':
            page = const CaptureScreen();
          case '/processing':
            page = const ProcessingScreen();
          case '/result':
            page = const ResultScreen();
          case '/history':
            page = const HistoryScreen();
          case '/about':
            page = const AboutScreen();
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
