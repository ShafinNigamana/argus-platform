/// Collects green-channel signal values at camera FPS for rPPG.
///
/// The backend expects ~25-30 values per second (one per frame).
/// Call [add] on every camera frame, then [drain] every second to
/// get the batch for the API POST.
class SignalBuffer {
  SignalBuffer({this.maxCapacity = 300});

  final int maxCapacity;
  final List<double> _values = [];
  int _totalAdded = 0;

  int get length => _values.length;
  int get totalAdded => _totalAdded;

  void add(double value) {
    _values.add(value);
    _totalAdded++;
    if (_values.length > maxCapacity) {
      _values.removeAt(0);
    }
  }

  /// Drain all buffered values and return them as a list.
  /// Clears the buffer.
  List<double> drain() {
    if (_values.isEmpty) return const [];
    final batch = List<double>.from(_values);
    _values.clear();
    return batch;
  }

  /// Peek at the current buffer without draining.
  List<double> peek() => List<double>.unmodifiable(_values);

  void clear() {
    _values.clear();
    _totalAdded = 0;
  }
}
