import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:argus/main.dart';

void main() {
  testWidgets('ArgusApp builds', (WidgetTester tester) async {
    await tester.pumpWidget(const ArgusApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
