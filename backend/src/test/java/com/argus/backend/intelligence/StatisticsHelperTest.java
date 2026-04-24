package com.argus.backend.intelligence;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StatisticsHelperTest {

    @Test
    void meanEmptyReturnsZero() {
        assertEquals(0.0, StatisticsHelper.mean(new double[0]));
    }

    @Test
    void varianceEmptyReturnsZero() {
        assertEquals(0.0, StatisticsHelper.variance(new double[0]));
    }

    @Test
    void coefficientOfVariationMeanZeroReturnsZero() {
        assertEquals(0.0, StatisticsHelper.coefficientOfVariation(new double[]{0.0, 0.0, 0.0}));
    }

    @Test
    void differencesAndSecondDerivativeAreComputed() {
        double[] values = new double[]{1.0, 2.0, 4.0, 7.0};
        assertArrayEquals(new double[]{1.0, 2.0, 3.0}, StatisticsHelper.differences(values), 1e-9);
        assertArrayEquals(new double[]{1.0, 1.0}, StatisticsHelper.secondDerivative(values), 1e-9);
    }

    @Test
    void autocorrelationPeakRatioDetectsRepetition() {
        double[] repetitive = new double[]{1.0, -1.0, 1.0, -1.0, 1.0, -1.0};
        assertTrue(StatisticsHelper.autocorrelationPeakRatio(repetitive) > 0.6);
    }

    @Test
    void clampAppliesBounds() {
        assertEquals(0.0, StatisticsHelper.clamp(-1.0, 0.0, 1.0));
        assertEquals(1.0, StatisticsHelper.clamp(2.0, 0.0, 1.0));
        assertEquals(0.4, StatisticsHelper.clamp(0.4, 0.0, 1.0));
    }
}
