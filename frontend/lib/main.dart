import 'package:flutter/material.dart';

import 'capture/capture_screen.dart';
import 'screens/alignment_screen.dart';
import 'screens/home_screen.dart';
import 'screens/processing_screen.dart';
import 'screens/result_screen.dart';

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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        '/alignment': (context) => const AlignmentScreen(),
        '/capture': (context) => const CaptureScreen(),
        '/processing': (context) => const ProcessingScreen(),
        '/result': (context) => const ResultScreen(),
      },
    );
  }
}
